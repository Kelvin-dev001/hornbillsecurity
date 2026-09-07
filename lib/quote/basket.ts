import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";

import { db } from "@/db";
import { quoteBaskets, type BasketLine } from "@/db/schema";
import { isProvisionalPrice, summariseBom, type Bom, type BomLine } from "@/lib/pricing/bom";
import { unitShort } from "@/lib/catalog/format";
import { getCatalogItemsById } from "@/lib/catalog/queries";
import { getSolutions } from "@/lib/catalog/solutions";
import { buildSystem } from "@/lib/catalog/builder";
import { parseBuilderAnswers, parseBuilderOverrides } from "@/lib/catalog/builder-params";

/**
 * The quote basket.
 *
 * Server-backed and cookie-keyed: the browser holds an opaque key, the contents
 * live in quote_baskets. That keeps the cookie small, keeps pricing on the
 * server, and lets a basket follow someone from a solution page to the builder
 * to /quote.
 *
 * A basket stores references and quantities, never prices — it shows live
 * prices right up to the moment of submission, when lib/quote/submit.ts freezes
 * them (docs/02 §quotes).
 */

export const BASKET_COOKIE = "hb_quote";
const BASKET_TTL_DAYS = 30;

/** A priced basket, ready to render. */
export type BasketView = {
  lines: BasketEntry[];
  bom: Bom;
  itemCount: number;
  /** True when a line has disappeared from the catalogue since it was added. */
  hasUnavailable: boolean;
  unavailable: BasketLine[];
};

export type BasketEntry = {
  kind: "item" | "solution" | "builder";
  ref: string;
  quantity: number;
  name: string;
  /** Per unit, VAT-exclusive. For a solution, the whole package. */
  unitPrice: number;
  extended: number;
  href: string;
  /** For a solution, how many BOM lines it contributes. */
  lineCount: number;
};

function expiryDate(): Date {
  return new Date(Date.now() + BASKET_TTL_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * The basket key from the cookie, or null.
 *
 * Read-only: a server component cannot set a cookie in Next.js, so nothing here
 * creates a basket. Only the server actions in lib/quote/actions.ts do, which
 * also means simply reading a page never issues a cookie to a visitor who has
 * not asked for anything.
 */
export async function readBasketKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(BASKET_COOKIE)?.value ?? null;
}

/** Creates the basket row and returns its cookie key. Only called from actions. */
export async function createBasket(): Promise<string> {
  const cookieKey = randomUUID();
  await db.insert(quoteBaskets).values({ cookieKey, lines: [], expiresAt: expiryDate() });
  return cookieKey;
}

export async function readBasketLines(cookieKey: string | null): Promise<BasketLine[]> {
  if (!cookieKey) return [];
  const [row] = await db
    .select({ lines: quoteBaskets.lines })
    .from(quoteBaskets)
    .where(eq(quoteBaskets.cookieKey, cookieKey))
    .limit(1);
  return row?.lines ?? [];
}

export async function writeBasketLines(cookieKey: string, lines: BasketLine[]): Promise<void> {
  await db
    .update(quoteBaskets)
    .set({ lines, expiresAt: expiryDate() })
    .where(eq(quoteBaskets.cookieKey, cookieKey));
}

export async function readBuilderInputs(
  cookieKey: string | null,
): Promise<Record<string, unknown> | null> {
  if (!cookieKey) return null;
  const [row] = await db
    .select({ builderInputs: quoteBaskets.builderInputs })
    .from(quoteBaskets)
    .where(eq(quoteBaskets.cookieKey, cookieKey))
    .limit(1);
  return row?.builderInputs ?? null;
}

export async function writeBuilderInputs(
  cookieKey: string,
  builderInputs: Record<string, unknown> | null,
): Promise<void> {
  await db
    .update(quoteBaskets)
    .set({ builderInputs })
    .where(eq(quoteBaskets.cookieKey, cookieKey));
}

/** Housekeeping for expired baskets, for an admin job in Sprint 4. */
export async function deleteExpiredBaskets(): Promise<number> {
  const deleted = await db
    .delete(quoteBaskets)
    .where(lt(quoteBaskets.expiresAt, new Date()))
    .returning({ id: quoteBaskets.id });
  return deleted.length;
}

/**
 * Prices a basket at today's prices.
 *
 * A solution contributes its whole bill of materials, multiplied by its
 * quantity — two of the same package on one site is two of everything, which is
 * how it would actually be installed and invoiced.
 *
 * A line whose item or package has since been unpublished is reported rather
 * than dropped: silently removing something from a basket, and from its total,
 * is exactly the behaviour that makes people distrust a quote.
 */
export async function priceBasket(lines: BasketLine[], vatRate: number): Promise<BasketView> {
  const [itemsById, solutions] = await Promise.all([
    getCatalogItemsById(),
    getSolutions(vatRate),
  ]);

  const itemsBySlug = new Map([...itemsById.values()].map((item) => [item.slug, item]));
  const solutionsBySlug = new Map(solutions.map((solution) => [solution.slug, solution]));

  const bomLines: BomLine[] = [];
  const entries: BasketEntry[] = [];
  const unavailable: BasketLine[] = [];

  for (const line of lines) {
    if (line.kind === "item") {
      const item = itemsBySlug.get(line.ref);
      if (!item) {
        unavailable.push(line);
        continue;
      }

      bomLines.push({
        id: `item-${line.ref}`,
        lineType: "primary",
        sku: item.sku,
        href: `/catalog/item/${item.slug}`,
        name: item.name,
        spec: item.shortDescription,
        unit: unitShort(item.unit),
        quantity: line.quantity,
        unitPrice: item.price,
        extended: item.price * line.quantity,
        note: null,
        provisional: isProvisionalPrice(item.priceBasis),
      });

      entries.push({
        kind: "item",
        ref: line.ref,
        quantity: line.quantity,
        name: item.name,
        unitPrice: item.price,
        extended: item.price * line.quantity,
        href: `/catalog/item/${item.slug}`,
        lineCount: 1,
      });
      continue;
    }

    if (line.kind === "builder") {
      // Regenerated from the answers, so a system built last week is priced at
      // today's prices right up to the moment it is submitted.
      const query = Object.fromEntries(new URLSearchParams(line.ref));
      const built = await buildSystem(
        parseBuilderAnswers(query),
        parseBuilderOverrides(query),
        vatRate,
      );

      for (const bomLine of built.bom.lines) {
        bomLines.push({
          ...bomLine,
          id: `built-${bomLine.id}`,
          quantity: bomLine.quantity * line.quantity,
          extended: bomLine.extended * line.quantity,
        });
      }

      entries.push({
        kind: "builder",
        ref: line.ref,
        quantity: line.quantity,
        name: `${built.answers.cameras} × ${built.answers.technology === "analog" ? "analog" : "IP"} camera system you built`,
        unitPrice: built.bom.subtotal,
        extended: built.bom.subtotal * line.quantity,
        href: `/build/cctv?${line.ref}`,
        lineCount: built.bom.lines.length,
      });
      continue;
    }

    const solution = solutionsBySlug.get(line.ref);
    if (!solution) {
      unavailable.push(line);
      continue;
    }

    // The package's lines are already priced, so they are scaled and carried
    // over as they are. Two of the same package on one site is two of
    // everything in it, which is how it would be installed and invoiced.
    for (const bomLine of solution.bom.lines) {
      bomLines.push({
        ...bomLine,
        id: `sol-${line.ref}-${bomLine.id}`,
        quantity: bomLine.quantity * line.quantity,
        extended: bomLine.extended * line.quantity,
      });
    }

    entries.push({
      kind: "solution",
      ref: line.ref,
      quantity: line.quantity,
      name: solution.name,
      unitPrice: solution.total,
      extended: solution.total * line.quantity,
      href: `/solutions/${solution.slug}`,
      lineCount: solution.bom.lines.length,
    });
  }

  return {
    lines: entries,
    bom: summariseBom(bomLines, vatRate),
    itemCount: entries.reduce((sum, entry) => sum + entry.quantity, 0),
    hasUnavailable: unavailable.length > 0,
    unavailable,
  };
}

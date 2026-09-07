import "server-only";

import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db";
import { quotes, type NewQuote, type QuoteSource } from "@/db/schema";
import type { SiteSettings } from "@/db/schema";
import { generateQuoteCode } from "./code";
import { freezeLines } from "./freeze";
import { normaliseKenyanMobile } from "./phone";
import type { BasketView } from "./basket";

/**
 * Turning a basket into a saved quote.
 *
 * The one rule that governs this file: the lines are FROZEN. docs/02 — "A
 * customer must be able to reopen /q/AB12CD next week and see what they were
 * shown." So the snapshot carries the name, spec, unit and price of every line
 * as text and integers, and never a foreign key. The monthly price review,
 * a renamed product, an unpublished SKU: none of them may change what somebody
 * was quoted.
 *
 * The VAT rate, quote validity and deposit percentage are frozen for the same
 * reason. They come from site_settings, which the owner edits.
 */

/** Submissions allowed from one submitter inside the window. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MINUTES = 30;

export type SubmitInput = {
  name: string;
  phone: string;
  email?: string;
  county: string;
  area: string;
  propertyType: string;
  /** Honeypot. A real person never fills this in; a bot fills everything. */
  website?: string;
  source: QuoteSource;
};

export type SubmitResult =
  | { ok: true; code: string }
  | { ok: false; error: string; field?: keyof SubmitInput };

/**
 * A salted hash of the submitter's address.
 *
 * The quotes table is a lead list, and a plain IP log beside it is personal data
 * we have no reason to keep. A hash is enough to count submissions, and a salt
 * is what stops someone holding a copy of the table from walking the whole IPv4
 * space to reverse it.
 *
 * QUOTE_HASH_SALT is its own secret, falling back to DATABASE_URL — which is
 * server-only, always present, and unguessable. It is deliberately NOT the
 * service-role key: that credential has exactly one job, ESLint enforces that it
 * is read in exactly one file, and borrowing it for a hash would be the first
 * step in it being read everywhere (CLAUDE.md §2.3).
 */
export function hashSubmitter(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.QUOTE_HASH_SALT ?? process.env.DATABASE_URL ?? "hornbill";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

async function isRateLimited(submitterHash: string | null): Promise<boolean> {
  if (!submitterHash) return false;

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(and(eq(quotes.submitterHash, submitterHash), gt(quotes.createdAt, since)));

  return (row?.count ?? 0) >= RATE_LIMIT_MAX;
}

export async function submitQuote(options: {
  input: SubmitInput;
  basket: BasketView;
  builderInputs: Record<string, unknown> | null;
  settings: SiteSettings;
  ip: string | null;
}): Promise<SubmitResult> {
  const { input, basket, builderInputs, settings, ip } = options;

  // Honeypot first: a bot that filled it gets a plausible-looking success and
  // no row, which is cheaper than an error it can learn from.
  if (input.website && input.website.trim() !== "") {
    return { ok: true, code: "THANKS" };
  }

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Please give us a name.", field: "name" };

  const phone = normaliseKenyanMobile(input.phone);
  if (!phone) {
    return {
      ok: false,
      error: "That does not look like a Kenyan mobile number. 07xx, 01xx or +254 all work.",
      field: "phone",
    };
  }

  const email = input.email?.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: "That email address does not look right.", field: "email" };
  }

  const area = input.area.trim();
  if (area.length < 2) {
    return { ok: false, error: "Which area? Nyali, Bamburi, Diani…", field: "area" };
  }

  if (basket.bom.lines.length === 0) {
    return { ok: false, error: "There is nothing in your quote yet." };
  }

  const submitterHash = hashSubmitter(ip);
  if (await isRateLimited(submitterHash)) {
    return {
      ok: false,
      error:
        `That is ${RATE_LIMIT_MAX} quotes in ${RATE_LIMIT_WINDOW_MINUTES} minutes. ` +
        `Give us a call on ${settings.phone} and we will sort it out directly.`,
    };
  }

  const validUntil = new Date(
    Date.now() + settings.quoteValidityDays * 24 * 60 * 60 * 1000,
  );

  const row: Omit<NewQuote, "code"> = {
    customerName: name,
    customerPhone: phone,
    customerEmail: email || null,
    county: input.county,
    area,
    propertyType: input.propertyType,
    builderInputs,
    lines: freezeLines(basket.bom),
    subtotal: basket.bom.subtotal,
    vatAmount: basket.bom.vatAmount,
    total: basket.bom.total,
    vatRate: settings.vatRate,
    validUntil,
    depositPercent: settings.depositPercent,
    source: input.source,
    submitterHash,
  };

  // Retry on a code collision. 32^6 makes one vanishingly unlikely, but a
  // unique-violation crash on the last step of a lead's journey is not the
  // place to find out.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateQuoteCode();
    try {
      await db.insert(quotes).values({ ...row, code });
      return { ok: true, code };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("quotes_code_unique") && !message.includes("duplicate key")) {
        throw error;
      }
    }
  }

  return { ok: false, error: "We could not save that. Please try once more." };
}

import "server-only";

import { and, asc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { brands, categories, items, type Item, type PriceBasis } from "@/db/schema";
import { effectivePrice, exceedsMarketCeiling, markedUpPrice } from "@/lib/pricing/effectivePrice";

/**
 * Admin reads and writes for items.
 *
 * The one place in the application that touches items.cost_price outside the
 * database itself. Everything public goes through public_items, which has no
 * such column (CLAUDE.md §2.3) — so this module is deliberately small, is
 * imported only by app/admin, and never returns a cost to anything that could
 * render it publicly.
 */

export type AdminItemRow = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  categoryId: string;
  categoryName: string;
  brandId: string | null;
  brandName: string | null;
  costPrice: number | null;
  priceOverride: number | null;
  marketCeilingPrice: number | null;
  markupMultiplier: string;
  effectivePrice: number | null;
  priceBasis: PriceBasis;
  published: boolean;
  /** The ×1.40 price would sit above the market ceiling. */
  overCeiling: boolean;
};

export type ItemFilters = {
  search?: string;
  categoryId?: string;
  brandId?: string;
  published?: "yes" | "no";
  basis?: PriceBasis;
};

function decorate(row: {
  costPrice: number | null;
  priceOverride: number | null;
  marketCeilingPrice: number | null;
  markupMultiplier: string;
}): boolean {
  return exceedsMarketCeiling({
    costPrice: row.costPrice,
    priceOverride: row.priceOverride,
    marketCeilingPrice: row.marketCeilingPrice,
    markupMultiplier: row.markupMultiplier,
  });
}

export async function listItems(filters: ItemFilters = {}): Promise<AdminItemRow[]> {
  const conditions = [];

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    conditions.push(or(ilike(items.sku, pattern), ilike(items.name, pattern)));
  }
  if (filters.categoryId) conditions.push(eq(items.categoryId, filters.categoryId));
  if (filters.brandId) conditions.push(eq(items.brandId, filters.brandId));
  if (filters.published) conditions.push(eq(items.published, filters.published === "yes"));
  if (filters.basis) conditions.push(eq(items.priceBasis, filters.basis));

  const rows = await db
    .select({
      id: items.id,
      sku: items.sku,
      slug: items.slug,
      name: items.name,
      categoryId: items.categoryId,
      categoryName: categories.name,
      brandId: items.brandId,
      brandName: brands.name,
      costPrice: items.costPrice,
      priceOverride: items.priceOverride,
      marketCeilingPrice: items.marketCeilingPrice,
      markupMultiplier: items.markupMultiplier,
      effectivePrice: items.effectivePrice,
      priceBasis: items.priceBasis,
      published: items.published,
    })
    .from(items)
    .innerJoin(categories, eq(items.categoryId, categories.id))
    .leftJoin(brands, eq(items.brandId, brands.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(items.sku));

  return rows.map((row) => ({ ...row, overCeiling: decorate(row) }));
}

export async function getItem(id: string): Promise<Item | null> {
  const [row] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  return row ?? null;
}

export async function getItemBySku(sku: string): Promise<Item | null> {
  const [row] = await db.select().from(items).where(eq(items.sku, sku)).limit(1);
  return row ?? null;
}

/**
 * What the price panel shows.
 *
 * docs/08 Sprint 4: "shows cost_price, markup, computed price,
 * market_ceiling_price and effective price together, and warns in-line when the
 * computed price would exceed the ceiling."
 *
 * All five together, because the interesting case is when they disagree: the
 * EZVIZ solar kit computes to 18,200, Jumia sells it at 17,499, and the ceiling
 * pulls it to 16,500. Seeing only the effective price hides why (CLAUDE.md §5).
 */
export type PricePanel = {
  costPrice: number | null;
  markupMultiplier: number;
  computed: number | null;
  marketCeilingPrice: number | null;
  priceOverride: number | null;
  effective: number | null;
  overCeiling: boolean;
  /** How much the ceiling is taking off, when it bites. */
  ceilingReduction: number;
};

export function pricePanel(input: {
  costPrice: number | null;
  priceOverride: number | null;
  marketCeilingPrice: number | null;
  markupMultiplier: string | number;
}): PricePanel {
  const markup = Number(input.markupMultiplier);
  const computed = input.costPrice === null ? null : markedUpPrice(input.costPrice, markup);
  const effective = effectivePrice(input);
  const over = exceedsMarketCeiling(input);

  return {
    costPrice: input.costPrice,
    markupMultiplier: markup,
    computed,
    marketCeilingPrice: input.marketCeilingPrice,
    priceOverride: input.priceOverride,
    effective,
    overCeiling: over,
    ceilingReduction:
      over && computed !== null && input.marketCeilingPrice !== null
        ? computed - input.marketCeilingPrice
        : 0,
  };
}

export async function countItems(): Promise<{ total: number; published: number }> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where ${items.published})::int`,
    })
    .from(items);
  return row ?? { total: 0, published: 0 };
}

export async function listCategoryOptions() {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sortOrder));
}

export async function listBrandOptions() {
  return db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.sortOrder));
}

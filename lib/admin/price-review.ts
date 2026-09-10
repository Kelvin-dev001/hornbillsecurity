import "server-only";

import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { brands, categories, items, siteSettings } from "@/db/schema";
import { effectivePrice, markedUpPrice } from "@/lib/pricing/effectivePrice";

/**
 * The monthly price review.
 *
 * docs/08 Sprint 4: "A bulk percentage price adjustment tool, filterable by
 * category or brand, with a preview of before/after before it commits. The
 * monthly price review must be one screen, not 300 edits."
 *
 * The adjustment moves cost_price, not the public price. That is the whole
 * point: a distributor raises trade prices by 5%, the owner applies 5% here, and
 * the markup, the ceilings and every package that contains those items re-price
 * themselves. Adjusting the public price directly would break the relationship
 * between cost and price that the rest of the system depends on.
 */

export type PriceChange = {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  brandName: string | null;
  costBefore: number;
  costAfter: number;
  priceBefore: number | null;
  priceAfter: number | null;
  /** The ceiling stops the public price moving even though the cost did. */
  cappedByCeiling: boolean;
};

export type PreviewFilters = {
  categoryId?: string;
  brandId?: string;
  /** Percent, positive or negative. */
  percent: number;
  /** Only rows whose cost we actually own. */
  onlyDistributor?: boolean;
};

/**
 * Works out what an adjustment would do, without doing it.
 *
 * Rounding is applied to the new cost, because a cost of 6,000 raised by 5% is
 * 6,300 and not 6,299.999 — and because the owner will be reconciling these
 * against a supplier's list written in whole shillings.
 */
export async function previewAdjustment(filters: PreviewFilters): Promise<PriceChange[]> {
  const conditions = [isNotNull(items.costPrice)];
  if (filters.categoryId) conditions.push(eq(items.categoryId, filters.categoryId));
  if (filters.brandId) conditions.push(eq(items.brandId, filters.brandId));
  if (filters.onlyDistributor) conditions.push(eq(items.priceBasis, "distributor"));

  const rows = await db
    .select({
      id: items.id,
      sku: items.sku,
      name: items.name,
      categoryName: categories.name,
      brandName: brands.name,
      costPrice: items.costPrice,
      priceOverride: items.priceOverride,
      marketCeilingPrice: items.marketCeilingPrice,
      markupMultiplier: items.markupMultiplier,
      effectivePrice: items.effectivePrice,
    })
    .from(items)
    .innerJoin(categories, eq(items.categoryId, categories.id))
    .leftJoin(brands, eq(items.brandId, brands.id))
    .where(and(...conditions))
    .orderBy(items.sku);

  return rows.map((row) => {
    const costBefore = row.costPrice as number;
    const costAfter = Math.max(0, Math.round(costBefore * (1 + filters.percent / 100)));

    const priceAfter = effectivePrice({
      costPrice: costAfter,
      priceOverride: row.priceOverride,
      marketCeilingPrice: row.marketCeilingPrice,
      markupMultiplier: row.markupMultiplier,
    });

    const computed = markedUpPrice(costAfter, row.markupMultiplier);

    return {
      id: row.id,
      sku: row.sku,
      name: row.name,
      categoryName: row.categoryName,
      brandName: row.brandName,
      costBefore,
      costAfter,
      priceBefore: row.effectivePrice,
      priceAfter,
      cappedByCeiling:
        row.marketCeilingPrice !== null && computed > row.marketCeilingPrice,
    };
  });
}

/**
 * Applies the adjustment to exactly the rows that were previewed.
 *
 * By id, from the preview, rather than by re-running the filter. Between looking
 * and committing the owner might have added an item, and a bulk price change
 * that silently includes something he never saw is the one mistake this screen
 * exists to prevent.
 */
export async function applyAdjustment(changes: { id: string; costAfter: number }[]): Promise<number> {
  if (changes.length === 0) return 0;

  // One statement: a partial application halfway through a 300-row review would
  // leave the catalogue in a state nobody could reason about.
  const payload = JSON.stringify(changes);
  await db.execute(sql`
    update "items" set "cost_price" = (change.row ->> 'costAfter')::integer
    from jsonb_array_elements(${payload}::jsonb) as change(row)
    where "items"."id" = (change.row ->> 'id')::uuid
  `);

  return changes.length;
}

/** Records that a review happened, which drives the visible price stamp. */
export async function stampPriceReview(): Promise<void> {
  await db.update(siteSettings).set({ pricesUpdatedAt: new Date() });
}

export async function itemsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({ id: items.id, sku: items.sku, costPrice: items.costPrice })
    .from(items)
    .where(inArray(items.id, ids));
}

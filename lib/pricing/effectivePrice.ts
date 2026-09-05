/**
 * The public price of an item, in one place.
 *
 * CLAUDE.md §5 and docs/01 §7:
 *   - public price = distributor cost × 1.40, rounded to the nearest 100 KES,
 *     VAT-exclusive;
 *   - a `price_override` is already the public price and takes no markup
 *     (`price_basis = 'owner_sell_price'`, currently fuel monitoring only);
 *   - a `market_ceiling_price` caps the result, because on consumer smart-home
 *     and solar SKUs Jumia is the ceiling every Kenyan buyer checks first and a
 *     40% markup lands above it.
 *
 * This function is mirrored by the `effective_price` generated column in
 * db/migrations/0003_catalogue.sql. tests/effective-price.test.ts asserts the
 * two agree for every seeded row, so SQL and TypeScript cannot drift.
 *
 * No `cost_price` may cross into a public code path, so nothing here is called
 * from a page or component — the database computes the stored value and
 * public_items serves it. This module exists for the admin price panel
 * (Sprint 4), the BOM engine (Sprint 2), and the drift test.
 */

/** Public prices land on a round 100 KES. */
export const PRICE_ROUNDING_KES = 100;

/** docs/01 §7. Per-item overrides live in items.markup_multiplier. */
export const DEFAULT_MARKUP_MULTIPLIER = 1.4;

/** Postgres integer ceiling, used as "no ceiling" in the SQL mirror. */
const NO_CEILING = 2_147_483_647;

export type PricingInputs = {
  /** Distributor / trade price, VAT-exclusive KES. PRIVATE. */
  costPrice: number | null;
  /** Manual public price. Wins over the markup formula. */
  priceOverride: number | null;
  /** The result never exceeds this. */
  marketCeilingPrice: number | null;
  /**
   * numeric(4,2) — arrives from Drizzle as a string like "1.40". Accepts a
   * number too, for callers that have one.
   */
  markupMultiplier: number | string;
};

/**
 * `round(cost × markup / 100) × 100`, done in integers.
 *
 * Integer arithmetic is not fussiness. In floating point, 4750 × 1.4 evaluates
 * to 6649.999999999999, so Math.round(66.4999…) gives 6600 while Postgres —
 * which computes in exact numeric — gives 6700. That is a 100 KES disagreement
 * between the price the site shows and the price the database stores, appearing
 * only on certain values. Both sides now round half up on exact integers.
 */
export function markedUpPrice(costPrice: number, markupMultiplier: number | string): number {
  const hundredths = Math.round(Number(markupMultiplier) * 100);
  const product = costPrice * hundredths; // exact: KES integers × integer
  const wholeHundreds = Math.floor(product / (100 * PRICE_ROUNDING_KES));
  const remainder = product - wholeHundreds * 100 * PRICE_ROUNDING_KES;
  const roundedUp = remainder * 2 >= 100 * PRICE_ROUNDING_KES;
  return (wholeHundreds + (roundedUp ? 1 : 0)) * PRICE_ROUNDING_KES;
}

/**
 * The public price, or null when there is no price at all.
 *
 * null is the quote-required / placeholder case, and it is the case the formula
 * printed in docs/02 gets wrong: SQL `LEAST()` ignores NULLs, so
 * `LEAST(COALESCE(NULL, NULL), COALESCE(NULL, 2147483647))` returns 2147483647
 * rather than nothing. Both this function and the generated column guard it
 * explicitly instead.
 */
export function effectivePrice(inputs: PricingInputs): number | null {
  const { costPrice, priceOverride, marketCeilingPrice, markupMultiplier } = inputs;

  if (priceOverride === null && costPrice === null) return null;

  const base =
    priceOverride ?? markedUpPrice(costPrice as number, markupMultiplier);

  return Math.min(base, marketCeilingPrice ?? NO_CEILING);
}

/**
 * True when the ×1.40 markup would price us above the market ceiling — the
 * warning the admin price panel must show (CLAUDE.md §5, Sprint 4).
 */
export function exceedsMarketCeiling(inputs: PricingInputs): boolean {
  const { costPrice, priceOverride, marketCeilingPrice, markupMultiplier } = inputs;
  if (marketCeilingPrice === null) return false;
  if (priceOverride === null && costPrice === null) return false;

  const base = priceOverride ?? markedUpPrice(costPrice as number, markupMultiplier);
  return base > marketCeilingPrice;
}

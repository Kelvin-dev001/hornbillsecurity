import type { CatalogFilters, PriceBandKey, SortKey } from "./types";
import { PRICE_BANDS, SORT_OPTIONS } from "./types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Reads the catalogue filters out of the URL.
 *
 * Unrecognised values are dropped rather than passed through, so a hand-edited
 * or crawler-invented `?sort=cheapest` renders the default page instead of an
 * empty one, and nothing from the query string reaches a SQL fragment except the
 * search text, which goes in as a parameter.
 */
export function parseCatalogFilters(params: RawSearchParams): CatalogFilters {
  const sort = single(params.sort);
  const priceBand = single(params.price);

  return {
    query: single(params.q),
    brandSlug: single(params.brand)?.toLowerCase(),
    priceBand: PRICE_BANDS.some((band) => band.key === priceBand)
      ? (priceBand as PriceBandKey)
      : undefined,
    sort: SORT_OPTIONS.some((option) => option.key === sort) ? (sort as SortKey) : undefined,
  };
}

/**
 * True when the visitor has narrowed the page.
 *
 * Filtered views are noindex with a canonical pointing at the unfiltered URL:
 * they are the same items in a different order, and letting a crawler index
 * dozens of permutations of one catalogue splits its own ranking signals
 * (docs/03 §0 — ranking is what gates AI citation).
 */
export function isFilteredView(filters: CatalogFilters): boolean {
  return Boolean(filters.query || filters.brandSlug || filters.priceBand || filters.sort);
}

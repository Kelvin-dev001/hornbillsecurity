/**
 * The shapes the catalogue pages render.
 *
 * These are deliberately hand-written rather than inferred from the schema. An
 * inferred type would follow whatever the query happened to select; a declared
 * one says what a page is allowed to know, and there is no field here that could
 * hold a distributor cost.
 *
 * Every date is an ISO string, not a Date. unstable_cache round-trips its
 * payload through JSON, so a Date comes back as a string on a cache hit and only
 * on a cache hit — a bug that passes the first request and fails the second.
 * Keeping strings at the boundary removes the trap rather than working around it.
 */
import type { ItemSpec, ItemUnit, PriceBasis } from "@/db/schema";

export type CatalogBrand = {
  slug: string;
  name: string;
  isAuthorisedPartner: boolean;
};

export type CatalogCategory = {
  slug: string;
  name: string;
  summary: string;
  icon: string | null;
  parentSlug: string | null;
};

export type CatalogItem = {
  id: string;
  /** The real model number, shown in full (CLAUDE.md §6). */
  sku: string;
  slug: string;
  name: string;
  shortDescription: string;
  /** KES, VAT-exclusive. Never null: the view excludes unpriced rows. */
  price: number;
  priceBasis: PriceBasis;
  unit: ItemUnit;
  inStock: boolean;
  leadTimeNote: string | null;
  primaryImageUrl: string | null;
  isConsumable: boolean;
  brand: CatalogBrand | null;
  category: CatalogCategory;
};

export type CatalogItemDetail = CatalogItem & {
  description: string | null;
  useCases: string[];
  specs: ItemSpec[];
  gallery: string[];
  datasheetUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  /** ISO 8601, for dateModified. */
  updatedAt: string;
  worksWith: CatalogItem[];
  alternatives: CatalogItem[];
};

export type CategoryNode = CatalogCategory & {
  children: CategoryNode[];
  /** Published items in this category and everything under it. */
  itemCount: number;
  /** Cheapest published item in this category or below, if any. */
  fromPrice: number | null;
};

/**
 * Price bands for the catalogue facets. Fixed rather than computed, so the URL
 * `/catalog?price=5000-15000` keeps meaning the same thing when the catalogue
 * grows and can be linked to.
 */
/**
 * The labels carry no currency prefix: the fieldset legend says "Price (KES)"
 * and the PriceStamp on every page says KES, so repeating it five times in the
 * facets is noise. It also keeps the labels from reading as prices, which
 * matters more than it sounds — "KES 15,000 – 30,000" contains the exact string
 * a leaked cost of 15,000 would print as, and tests/cost-price-leak.test.ts has
 * to be able to tell the two apart.
 */
export const PRICE_BANDS = [
  { key: "under-5000", label: "Under 5,000", min: 0, max: 4999 },
  { key: "5000-15000", label: "5,000 – 15,000", min: 5000, max: 15000 },
  { key: "15000-30000", label: "15,000 – 30,000", min: 15001, max: 30000 },
  { key: "30000-60000", label: "30,000 – 60,000", min: 30001, max: 60000 },
  { key: "over-60000", label: "Over 60,000", min: 60001, max: Number.MAX_SAFE_INTEGER },
] as const;

export type PriceBandKey = (typeof PRICE_BANDS)[number]["key"];

export const SORT_OPTIONS = [
  { key: "relevance", label: "Best match" },
  { key: "price-asc", label: "Price, low to high" },
  { key: "price-desc", label: "Price, high to low" },
  { key: "name", label: "Name" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["key"];

export type CatalogFilters = {
  categorySlug?: string;
  brandSlug?: string;
  priceBand?: PriceBandKey;
  query?: string;
  sort?: SortKey;
};

export type Facet = {
  key: string;
  label: string;
  count: number;
};

import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { brands, categories, publicItems } from "@/db/schema";
import type {
  CatalogFilters,
  CatalogItem,
  CatalogItemDetail,
  CategoryNode,
  Facet,
  PriceBandKey,
  SortKey,
} from "./types";
import { PRICE_BANDS } from "./types";
import { CACHE_TTL_SECONDS, readWithRetry } from "@/lib/cache";

/**
 * The catalogue's read layer.
 *
 * Two rules hold here and nowhere else needs to think about them:
 *
 *  1. Every query reads `publicItems`, never `items`. The view has no
 *     cost_price column, so a leak is a compile error rather than a code review
 *     catching it (CLAUDE.md §2.3, docs/02 §Row Level Security).
 *
 *  2. The whole published catalogue is a few dozen rows, so it is fetched once,
 *     cached, and filtered in memory. Facet counts, sorting and price bands cost
 *     nothing, and a filtered catalogue page makes no database round trip at
 *     all. Search is the exception — it goes to Postgres, because matching
 *     `DS-2CD1043G2-LIUF/SL` is a full-text problem, not a substring one.
 */

export const CATALOG_CACHE_TAG = "catalog";

// ── loading ────────────────────────────────────────────────────────────────

type ItemRow = CatalogItemDetail & {
  compatibleWith: string[];
  alternativeIds: string[];
};

const loadCatalog = unstable_cache(
  async (): Promise<{ items: ItemRow[]; categories: CategoryNode[] }> => {
    const [itemRows, categoryRows] = await Promise.all([
      db
        .select({
          id: publicItems.id,
          sku: publicItems.sku,
          slug: publicItems.slug,
          name: publicItems.name,
          shortDescription: publicItems.shortDescription,
          description: publicItems.description,
          useCases: publicItems.useCases,
          specs: publicItems.specs,
          price: publicItems.price,
          priceBasis: publicItems.priceBasis,
          unit: publicItems.unit,
          inStock: publicItems.inStock,
          leadTimeNote: publicItems.leadTimeNote,
          primaryImageUrl: publicItems.primaryImageUrl,
          gallery: publicItems.gallery,
          datasheetUrl: publicItems.datasheetUrl,
          isConsumable: publicItems.isConsumable,
          compatibleWith: publicItems.compatibleWith,
          alternativeIds: publicItems.alternatives,
          seoTitle: publicItems.seoTitle,
          seoDescription: publicItems.seoDescription,
          updatedAt: publicItems.updatedAt,
          brandSlug: brands.slug,
          brandName: brands.name,
          brandIsAuthorisedPartner: brands.isAuthorisedPartner,
          brandIsManufacturer: brands.isManufacturer,
          categorySlug: categories.slug,
          categoryName: categories.name,
          categorySummary: categories.summary,
          categoryIcon: categories.icon,
        })
        .from(publicItems)
        .leftJoin(brands, eq(publicItems.brandId, brands.id))
        .innerJoin(categories, eq(publicItems.categoryId, categories.id))
        .orderBy(asc(publicItems.name)),
      db
        .select({
          slug: categories.slug,
          name: categories.name,
          summary: categories.summary,
          icon: categories.icon,
          parentId: categories.parentId,
          id: categories.id,
          sortOrder: categories.sortOrder,
        })
        .from(categories)
        .where(eq(categories.published, true))
        .orderBy(asc(categories.sortOrder)),
    ]);

    const slugById = new Map(categoryRows.map((row) => [row.id, row.slug]));

    const items: ItemRow[] = itemRows.map((row) => ({
      id: row.id,
      sku: row.sku,
      slug: row.slug,
      name: row.name,
      shortDescription: row.shortDescription,
      description: row.description,
      useCases: row.useCases,
      specs: row.specs,
      price: row.price,
      priceBasis: row.priceBasis,
      unit: row.unit,
      inStock: row.inStock,
      leadTimeNote: row.leadTimeNote,
      primaryImageUrl: row.primaryImageUrl,
      gallery: row.gallery,
      datasheetUrl: row.datasheetUrl,
      isConsumable: row.isConsumable,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      updatedAt: row.updatedAt.toISOString(),
      brand: row.brandSlug
        ? {
            slug: row.brandSlug,
            name: row.brandName as string,
            isAuthorisedPartner: row.brandIsAuthorisedPartner as boolean,
            isManufacturer: row.brandIsManufacturer as boolean,
          }
        : null,
      category: {
        slug: row.categorySlug,
        name: row.categoryName,
        summary: row.categorySummary,
        icon: row.categoryIcon,
        parentSlug: null,
      },
      compatibleWith: row.compatibleWith,
      alternativeIds: row.alternativeIds,
      worksWith: [],
      alternatives: [],
    }));

    // Category tree, with counts and "from" prices rolled up from descendants.
    const nodes = new Map<string, CategoryNode>();
    for (const row of categoryRows) {
      nodes.set(row.slug, {
        slug: row.slug,
        name: row.name,
        summary: row.summary,
        icon: row.icon,
        parentSlug: row.parentId ? (slugById.get(row.parentId) ?? null) : null,
        children: [],
        itemCount: 0,
        fromPrice: null,
      });
    }

    for (const item of items) {
      const node = nodes.get(item.category.slug);
      item.category.parentSlug = node?.parentSlug ?? null;
    }

    for (const item of items) {
      let slug: string | null = item.category.slug;
      while (slug) {
        const node = nodes.get(slug);
        if (!node) break;
        node.itemCount += 1;
        node.fromPrice =
          node.fromPrice === null ? item.price : Math.min(node.fromPrice, item.price);
        slug = node.parentSlug;
      }
    }

    const roots: CategoryNode[] = [];
    for (const node of nodes.values()) {
      if (node.parentSlug) nodes.get(node.parentSlug)?.children.push(node);
      else roots.push(node);
    }

    return { items, categories: roots };
  },
  [CATALOG_CACHE_TAG],
  { tags: [CATALOG_CACHE_TAG], revalidate: CACHE_TTL_SECONDS },
);

/** Deduped per render, cached across renders and revalidated by tag in Sprint 4. */
const getCatalog = cache(() => readWithRetry(loadCatalog, "catalog"));

// ── the public surface ─────────────────────────────────────────────────────

export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const { categories: tree } = await getCatalog();
  return tree;
});

function flatten(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

export const getAllCategories = cache(async (): Promise<CategoryNode[]> => {
  return flatten(await getCategoryTree());
});

export const getCategoryBySlug = cache(async (slug: string): Promise<CategoryNode | null> => {
  return (await getAllCategories()).find((category) => category.slug === slug) ?? null;
});

/** The category itself plus every descendant slug — a parent page lists both. */
async function categoryScope(slug: string): Promise<Set<string>> {
  const category = await getCategoryBySlug(slug);
  if (!category) return new Set();
  return new Set(flatten([category]).map((node) => node.slug));
}

function stripDetail(item: ItemRow): CatalogItem {
  return {
    id: item.id,
    sku: item.sku,
    slug: item.slug,
    name: item.name,
    shortDescription: item.shortDescription,
    price: item.price,
    priceBasis: item.priceBasis,
    unit: item.unit,
    inStock: item.inStock,
    leadTimeNote: item.leadTimeNote,
    primaryImageUrl: item.primaryImageUrl,
    isConsumable: item.isConsumable,
    brand: item.brand,
    category: item.category,
  };
}

/**
 * Postgres full-text search, plus an ILIKE on the model number.
 *
 * Four things have to match, and each covers a different way people actually
 * search:
 *
 *   items.search_vector       "colorvu", "two-way audio", and the whole model
 *                             number — the parser keeps DS-2CD1043G2-LIUF/SL as
 *                             one token.
 *   sku / name ILIKE          "1043G2". A buyer holding the camera reads a
 *                             fragment off the label, and full-text cannot match
 *                             part of a token.
 *   brand name                "ezviz" — the brand is a separate table, so it is
 *                             not in the item's own vector.
 *   category name             "nanny camera", a verified Kenyan query (docs/01
 *                             §4). The word appears in the category name and
 *                             nowhere on the item.
 *
 * websearch_to_tsquery rather than to_tsquery: the query string arrives from a
 * URL, and to_tsquery throws on stray punctuation.
 *
 * Returns slugs in rank order; the caller intersects with the cached catalogue.
 */
const searchSlugs = unstable_cache(
  async (query: string): Promise<string[]> => {
    const pattern = `%${query.replace(/[%_\\]/g, (match) => `\\${match}`)}%`;

    const rows = await db
      .select({ slug: publicItems.slug })
      .from(publicItems)
      .innerJoin(sql`"items"`, sql`"items"."id" = ${publicItems.id} and "items"."published" = true`)
      .leftJoin(brands, eq(publicItems.brandId, brands.id))
      .innerJoin(categories, eq(publicItems.categoryId, categories.id))
      .where(
        sql`("items"."search_vector" @@ websearch_to_tsquery('english', ${query})
             or to_tsvector('english', coalesce(${brands.name}, '') || ' ' || ${categories.name})
                @@ websearch_to_tsquery('english', ${query})
             or ${publicItems.sku} ilike ${pattern}
             or ${publicItems.name} ilike ${pattern}
             or ${brands.name} ilike ${pattern}
             or ${categories.name} ilike ${pattern})`,
      )
      .orderBy(
        sql`case when ${publicItems.sku} ilike ${pattern} then 0 else 1 end,
            ts_rank("items"."search_vector", websearch_to_tsquery('english', ${query})) desc,
            ${publicItems.name} asc`,
      );

    return rows.map((row) => row.slug);
  },
  ["catalog-search"],
  { tags: [CATALOG_CACHE_TAG], revalidate: CACHE_TTL_SECONDS },
);

function inBand(price: number, band: PriceBandKey): boolean {
  const definition = PRICE_BANDS.find((candidate) => candidate.key === band);
  return definition ? price >= definition.min && price <= definition.max : true;
}

function sortItems(items: CatalogItem[], sort: SortKey, ranked: string[] | null): CatalogItem[] {
  const sorted = [...items];

  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "relevance":
    default:
      if (!ranked) return sorted.sort((a, b) => a.price - b.price);
      const rank = new Map(ranked.map((slug, index) => [slug, index]));
      return sorted.sort(
        (a, b) => (rank.get(a.slug) ?? Infinity) - (rank.get(b.slug) ?? Infinity),
      );
  }
}

export type ListItemsResult = {
  items: CatalogItem[];
  /** Every published item matching the query, before brand and price filters. */
  matchedBeforeFacets: CatalogItem[];
};

export async function listItems(filters: CatalogFilters = {}): Promise<ListItemsResult> {
  const { items } = await getCatalog();

  const query = filters.query?.trim();
  const ranked = query ? await searchSlugs(query) : null;
  const rankedSet = ranked ? new Set(ranked) : null;

  const scope = filters.categorySlug ? await categoryScope(filters.categorySlug) : null;

  const matchedBeforeFacets = items
    .filter((item) => (scope ? scope.has(item.category.slug) : true))
    .filter((item) => (rankedSet ? rankedSet.has(item.slug) : true))
    .map(stripDetail);

  const filtered = matchedBeforeFacets
    .filter((item) => (filters.brandSlug ? item.brand?.slug === filters.brandSlug : true))
    .filter((item) => (filters.priceBand ? inBand(item.price, filters.priceBand) : true));

  return {
    items: sortItems(filtered, filters.sort ?? (query ? "relevance" : "price-asc"), ranked),
    matchedBeforeFacets,
  };
}

export function brandFacets(
  items: CatalogItem[],
  options: { manufacturersOnly?: boolean } = {},
): Facet[] {
  const counts = new Map<string, Facet>();
  for (const item of items) {
    if (!item.brand) continue;
    // The "Unbranded / OEM" catch-all is a real filter on the catalogue — you do
    // want to narrow to the cable and connectors — but it is not something that
    // deserves a price-list page of its own.
    if (options.manufacturersOnly && !item.brand.isManufacturer) continue;
    const existing = counts.get(item.brand.slug);
    if (existing) existing.count += 1;
    else counts.set(item.brand.slug, { key: item.brand.slug, label: item.brand.name, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function priceBandFacets(items: CatalogItem[]): Facet[] {
  return PRICE_BANDS.map((band) => ({
    key: band.key,
    label: band.label,
    count: items.filter((item) => item.price >= band.min && item.price <= band.max).length,
  })).filter((facet) => facet.count > 0);
}

export const getItemBySlug = cache(async (slug: string): Promise<CatalogItemDetail | null> => {
  const { items } = await getCatalog();
  const item = items.find((candidate) => candidate.slug === slug);
  if (!item) return null;

  const byId = new Map(items.map((candidate) => [candidate.id, candidate]));
  const resolve = (ids: string[]) =>
    ids
      .map((id) => byId.get(id))
      .filter((candidate): candidate is ItemRow => candidate !== undefined)
      .map(stripDetail);

  return {
    ...item,
    worksWith: resolve(item.compatibleWith),
    alternatives: resolve(item.alternativeIds),
  };
});

/**
 * Every published, priced item keyed by id — what a bill of materials needs to
 * turn a solution_lines row into a priced line (lib/pricing/bom.ts).
 */
export const getCatalogItemsById = cache(async (): Promise<Map<string, CatalogItem>> => {
  const { items } = await getCatalog();
  return new Map(items.map((item) => [item.id, stripDetail(item)]));
});

/** Slug and last-modified for every item page — all the sitemap needs. */
export const getItemSitemapEntries = cache(
  async (): Promise<{ slug: string; updatedAt: string }[]> => {
    const { items } = await getCatalog();
    return items.map((item) => ({ slug: item.slug, updatedAt: item.updatedAt }));
  },
);

/** For generateStaticParams — every item that gets its own page. */
export const getAllItemSlugs = cache(async (): Promise<string[]> => {
  const { items } = await getCatalog();
  return items.map((item) => item.slug);
});

/** Newest change to anything in the catalogue, for the sitemap and dateModified. */
export const getCatalogLastModified = cache(async (): Promise<string | null> => {
  const { items } = await getCatalog();
  return items.reduce<string | null>(
    (latest, item) => (latest === null || item.updatedAt > latest ? item.updatedAt : latest),
    null,
  );
});

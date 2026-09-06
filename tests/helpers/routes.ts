/**
 * Every public route, discovered from the database rather than from a list kept
 * by hand — a route the leak test forgets about is a route nobody checks.
 *
 * The sitemap is fetched too, but as one of the pages under test: the scan must
 * not depend on the sitemap being complete to be complete itself.
 */
import type { connect } from "./db";
import { BUILDER_VARIANTS } from "./renderable";

/**
 * Filtered and sorted variants of /catalog. These take a different code path
 * from the unfiltered page — they run the search and facet queries — so they
 * get scanned separately.
 */
const CATALOG_VARIANTS = [
  "/catalog",
  "/catalog?q=DS-2CD1043G2-LIUF%2FSL",
  "/catalog?q=colorvu",
  "/catalog?q=1043G2",
  "/catalog?brand=hikvision",
  "/catalog?sort=price-desc",
  "/catalog?sort=price-asc&brand=generic",
];

const STATIC_ROUTES = [
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/this-route-does-not-exist",
  "/solutions",
  "/build",
];

/**
 * Builder configurations. The builder prices a system from live item data on
 * every request, so it is the newest place a cost price could reach a page.
 *
 * The list lives in renderable.ts beside the answers behind each URL, so a page
 * under test and the amounts computed for it cannot drift apart.
 */
const BUILDER_ROUTES = BUILDER_VARIANTS.map((variant) => `/build/cctv${variant.query}`);

export async function readPublicRoutes(sql: ReturnType<typeof connect>): Promise<string[]> {
  const [categories, items, solutions] = await Promise.all([
    sql<{ slug: string }[]>`select slug from categories where published order by slug`,
    sql<{ slug: string }[]>`
      select slug from items where published and effective_price is not null order by slug
    `,
    sql<{ slug: string }[]>`select slug from solutions where published order by slug`,
  ]);

  return [
    ...STATIC_ROUTES,
    ...CATALOG_VARIANTS,
    ...BUILDER_ROUTES,
    ...solutions.map((s) => `/solutions/${s.slug}`),
    ...categories.map((c) => `/catalog/${c.slug}`),
    ...items.map((i) => `/catalog/item/${i.slug}`),
  ];
}

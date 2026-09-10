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
  "/llms.txt",
  "/this-route-does-not-exist",
  "/solutions",
  "/build",
  // Sprint 4. /price-list is the largest single price surface on the site and
  // /services is the only page that renders the services table, so both are
  // scanned even though neither reads an item row directly.
  "/price-list",
  "/services",
  "/services/cctv-installation",
  "/locations",
  "/about",
  "/contact",
  "/faq",
  "/projects",
  "/blog",
  // Empty, since the scan has no basket — but it still renders the layout and
  // its props payload, so the private-column-name check applies. The priced
  // version of this page is covered by tests/quote-e2e.test.ts.
  "/quote",
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
  const [categories, items, solutions, locations, posts, projects, brands] = await Promise.all([
    sql<{ slug: string }[]>`select slug from categories where published order by slug`,
    sql<{ slug: string }[]>`
      select slug from items where published and effective_price is not null order by slug
    `,
    sql<{ slug: string }[]>`select slug from solutions where published order by slug`,
    sql<{ slug: string }[]>`select slug from locations where published order by slug`,
    sql<{ slug: string }[]>`
      select slug from posts where published and published_at is not null order by slug
    `,
    sql<{ slug: string }[]>`select slug from projects where published order by slug`,
    // The same rule /price-list/[brand] generates on: a real manufacturer with
    // at least three published, priced models.
    sql<{ slug: string }[]>`
      select b.slug
      from brands b
      join items i on i.brand_id = b.id and i.published and i.effective_price is not null
      where b.is_manufacturer
      group by b.slug
      having count(*) >= 3
      order by b.slug
    `,
  ]);

  return [
    ...STATIC_ROUTES,
    ...CATALOG_VARIANTS,
    ...BUILDER_ROUTES,
    ...solutions.map((s) => `/solutions/${s.slug}`),
    ...categories.map((c) => `/catalog/${c.slug}`),
    ...items.map((i) => `/catalog/item/${i.slug}`),
    ...locations.flatMap((l) => [
      `/services/cctv-installation/${l.slug}`,
      `/locations/${l.slug}`,
    ]),
    ...brands.map((b) => `/price-list/${b.slug}`),
    ...posts.map((p) => `/blog/${p.slug}`),
    ...projects.map((p) => `/projects/${p.slug}`),
  ];
}

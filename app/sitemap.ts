import type { MetadataRoute } from "next";

import { getAllCategories, getCatalogLastModified } from "@/lib/catalog/queries";
import { getItemSitemapEntries, listItems, brandFacets } from "@/lib/catalog/queries";
import { getServiceLines } from "@/lib/catalog/services";
import { getSolutionSitemapEntries } from "@/lib/catalog/solutions";
import { getLocations, getPosts, getProjects } from "@/lib/content/queries";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * Sitemap.
 *
 * Origins come from NEXT_PUBLIC_SITE_URL through absoluteUrl(), so attaching
 * security.hornbilltech.co.ke later is a config change and nothing else
 * (docs/09 item 9).
 *
 * Built from the database rather than a hand-kept list, so a category, SKU,
 * location or article the owner publishes from admin appears here without a
 * code change — CLAUDE.md §6: a new page ships with its entry in the sitemap and
 * a real dateModified.
 *
 * Only published, priced rows are listed: the URLs come from the same
 * public_items view the pages render from, so the sitemap cannot advertise a
 * page that 404s.
 *
 * /quote and /q/* are deliberately absent. They are one visitor's working state
 * and one customer's private quotation, both noindex, both disallowed in
 * robots.txt.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    settings,
    categories,
    items,
    solutions,
    catalogModified,
    locations,
    posts,
    projects,
    catalogue,
    serviceLines,
  ] = await Promise.all([
    getSiteSettings(),
    getAllCategories(),
    getItemSitemapEntries(),
    getSolutionSitemapEntries(),
    getCatalogLastModified(),
    getLocations(),
    getPosts(),
    getProjects(),
    listItems(),
    getServiceLines(),
  ]);

  const catalogLastModified = catalogModified ? new Date(catalogModified) : settings.updatedAt;

  // The same threshold the brand price-list pages generate on, so the sitemap
  // cannot list one that does not exist.
  const brands = brandFacets(catalogue.items, { manufacturersOnly: true }).filter(
    (facet) => facet.count >= 3,
  );

  const locationsModified = locations.length
    ? new Date(Math.max(...locations.map((l) => new Date(l.updatedAt).getTime())))
    : settings.updatedAt;

  return [
    {
      url: absoluteUrl("/"),
      lastModified: settings.updatedAt,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/catalog"),
      lastModified: catalogLastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/solutions"),
      lastModified: catalogLastModified,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/build"),
      lastModified: catalogLastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/build/cctv"),
      lastModified: catalogLastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // The price list and the service × location pages carry the transactional
    // intent — docs/03 §2 calls the latter "the money pages" — so they sit at
    // the top of the priority range with the solutions.
    {
      url: absoluteUrl("/price-list"),
      lastModified: catalogLastModified,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/services"),
      lastModified: catalogLastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/services/cctv-installation"),
      lastModified: catalogLastModified,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/locations"),
      lastModified: locationsModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/projects"),
      lastModified: settings.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/blog"),
      lastModified: posts[0] ? new Date(posts[0].updatedAt) : settings.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: settings.updatedAt,
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/contact"),
      lastModified: settings.updatedAt,
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/faq"),
      lastModified: settings.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...locations.flatMap((location) => [
      {
        url: absoluteUrl(`/services/cctv-installation/${location.slug}`),
        lastModified: new Date(location.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.9,
      },
      {
        url: absoluteUrl(`/locations/${location.slug}`),
        lastModified: new Date(location.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      },
    ]),
    // One page per service line — docs/05 Sprint 6. The CCTV line has its own
    // hand-written page, already listed above, so it is excluded here.
    ...serviceLines
      .filter((line) => line.slug !== "cctv")
      .map((line) => ({
        url: absoluteUrl(`/services/${line.slug}`),
        lastModified: new Date(line.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.75,
      })),
    ...brands.map((brand) => ({
      url: absoluteUrl(`/price-list/${brand.key}`),
      lastModified: catalogLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...solutions.map((solution) => ({
      url: absoluteUrl(`/solutions/${solution.slug}`),
      lastModified: new Date(solution.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: new Date(post.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: new Date(project.updatedAt),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    ...categories
      .filter((category) => category.itemCount > 0)
      .map((category) => ({
        url: absoluteUrl(`/catalog/${category.slug}`),
        lastModified: catalogLastModified,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...items.map((item) => ({
      url: absoluteUrl(`/catalog/item/${item.slug}`),
      lastModified: new Date(item.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

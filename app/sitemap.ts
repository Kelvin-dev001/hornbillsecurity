import type { MetadataRoute } from "next";

import { getAllCategories, getCatalogLastModified } from "@/lib/catalog/queries";
import { getItemSitemapEntries } from "@/lib/catalog/queries";
import { getSolutionSitemapEntries } from "@/lib/catalog/solutions";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * Sitemap.
 *
 * Origins come from NEXT_PUBLIC_SITE_URL through absoluteUrl(), so attaching
 * security.hornbilltech.co.ke later is a config change and nothing else
 * (docs/09 item 9).
 *
 * Built from the database rather than a hand-kept list, so a category or SKU the
 * owner publishes from admin appears here without a code change — CLAUDE.md §6:
 * a new page ships with its entry in the sitemap and a real dateModified.
 *
 * Only published, priced rows are listed: the URLs come from the same
 * public_items view the pages render from, so the sitemap cannot advertise a
 * page that 404s.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, categories, items, solutions, catalogModified] = await Promise.all([
    getSiteSettings(),
    getAllCategories(),
    getItemSitemapEntries(),
    getSolutionSitemapEntries(),
    getCatalogLastModified(),
  ]);
  const catalogLastModified = catalogModified ? new Date(catalogModified) : settings.updatedAt;

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
    ...solutions.map((solution) => ({
      url: absoluteUrl(`/solutions/${solution.slug}`),
      lastModified: new Date(solution.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...categories
      .filter((category) => category.itemCount > 0)
      .map((category) => ({
        url: absoluteUrl(`/catalog/${category.slug}`),
        lastModified: catalogLastModified,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...items
      .map((item) => ({
        url: absoluteUrl(`/catalog/item/${item.slug}`),
        lastModified: new Date(item.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];
}

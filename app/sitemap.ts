import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * Sitemap.
 *
 * Origins come from NEXT_PUBLIC_SITE_URL through absoluteUrl(), so attaching
 * security.hornbilltech.co.ke later is a config change and nothing else
 * (docs/09 item 9).
 *
 * Only the homepage exists in Sprint 0. Later sprints add their routes here as
 * they ship — CLAUDE.md §6: a new page ships with its entry in the sitemap and
 * a real dateModified.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSiteSettings();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: settings.updatedAt,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

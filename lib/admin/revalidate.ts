import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

import { CATALOG_CACHE_TAG } from "@/lib/catalog/queries";
import { CONTENT_CACHE_TAG } from "@/lib/content/queries";
import { SITE_SETTINGS_CACHE_TAG } from "@/lib/site-settings";

/**
 * Pushing an edit out to the public site.
 *
 * docs/08 Sprint 4: "Editing anything triggers ISR revalidation of the affected
 * public routes." Two layers have to be cleared, and missing either leaves the
 * owner staring at his old price wondering whether the save worked:
 *
 *   the cache tag   — every read goes through unstable_cache, so the data layer
 *                     keeps serving the old rows until the tag is busted;
 *   the route cache — the catalogue, package and item pages are statically
 *                     generated, so their HTML is cached separately.
 *
 * revalidatePath with "layout" clears a dynamic route and everything beneath it,
 * which is what reaches all 84 item pages without naming them one by one.
 */

export function revalidateCatalog(): void {
  revalidateTag(CATALOG_CACHE_TAG);

  // Anything that renders a price or a package.
  revalidatePath("/", "layout");
  revalidatePath("/catalog", "layout");
  revalidatePath("/solutions", "layout");
  revalidatePath("/build", "layout");
  revalidatePath("/price-list", "layout");
  revalidatePath("/sitemap.xml");
}

/**
 * Business facts reach every page — the footer alone carries the address, the
 * phone number, the VAT rate and the price stamp — so this clears the lot.
 */
export function revalidateSiteSettings(): void {
  revalidateTag(SITE_SETTINGS_CACHE_TAG);
  revalidatePath("/", "layout");
}

/**
 * Articles, locations, projects and testimonials.
 *
 * The blog index, the article, the location pages and the home page all carry
 * some of this, and a published article that does not appear is the fastest way
 * to make an owner stop writing them.
 */
export function revalidateContent(): void {
  revalidateTag(CONTENT_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/blog", "layout");
  revalidatePath("/projects", "layout");
  revalidatePath("/locations", "layout");
  revalidatePath("/services", "layout");
  revalidatePath("/sitemap.xml");
}

/** Everything, for an edit that could touch any of it. */
export function revalidateEverything(): void {
  revalidateCatalog();
  revalidateSiteSettings();
  revalidateContent();
}

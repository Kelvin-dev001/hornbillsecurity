import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, services } from "@/db/schema";
import { CATALOG_CACHE_TAG } from "@/lib/catalog/queries";
import { CACHE_TTL_SECONDS } from "@/lib/cache";

/**
 * Services, for the public /services pages.
 *
 * Separate from getBomServices() in solutions.ts, which reads only what a BOM
 * line needs. This one carries the copy.
 *
 * Unpriced rows are included rather than hidden. A service the owner has not
 * priced yet says "priced at survey" — docs/01 §5 is explicit that inventing a
 * figure is worse than not showing one, and an empty services page is worse
 * than both. Only `published` rows appear at all, so the owner controls it.
 */

export type PublicService = {
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  pricingUnit: string;
  price: number | null;
  priceBasis: string;
  description: string;
  inclusions: string[];
  updatedAt: string;
};

/** Plural, for a heading: "per camera point" rather than "point". */
export const SERVICE_UNIT_PHRASE: Record<string, string> = {
  per_point: "per point",
  per_camera: "per camera",
  per_door: "per door",
  per_metre: "per metre",
  per_day: "per day",
  per_month: "per month",
  per_year: "per year",
  per_camera_per_month: "per camera, per month",
  per_vehicle: "per vehicle",
  per_tank: "per tank",
  per_delegate: "per delegate",
  fixed: "fixed price",
};

export function serviceUnitPhrase(pricingUnit: string): string {
  return SERVICE_UNIT_PHRASE[pricingUnit] ?? pricingUnit.replace(/_/g, " ");
}

const loadServices = unstable_cache(
  async (): Promise<PublicService[]> => {
    const rows = await db
      .select({
        slug: services.slug,
        name: services.name,
        categorySlug: categories.slug,
        categoryName: categories.name,
        pricingUnit: services.pricingUnit,
        price: services.price,
        priceBasis: services.priceBasis,
        description: services.description,
        inclusions: services.inclusions,
        updatedAt: services.updatedAt,
      })
      .from(services)
      .innerJoin(categories, eq(services.categoryId, categories.id))
      .where(eq(services.published, true))
      .orderBy(asc(services.sortOrder));

    return rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }));
  },
  ["public-services"],
  { tags: [CATALOG_CACHE_TAG], revalidate: CACHE_TTL_SECONDS },
);

export const getPublicServices = cache(loadServices);

export const getServiceBySlug = cache(async (slug: string): Promise<PublicService | null> => {
  return (await getPublicServices()).find((service) => service.slug === slug) ?? null;
});

/** Services grouped by their category, in catalogue order. */
export const getServicesByCategory = cache(async () => {
  const all = await getPublicServices();
  const groups = new Map<string, { slug: string; name: string; services: PublicService[] }>();

  for (const service of all) {
    const existing = groups.get(service.categorySlug);
    if (existing) {
      existing.services.push(service);
    } else {
      groups.set(service.categorySlug, {
        slug: service.categorySlug,
        name: service.categoryName,
        services: [service],
      });
    }
  }

  return [...groups.values()];
});

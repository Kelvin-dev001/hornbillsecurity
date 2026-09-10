import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { and, asc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { categories, items, services, type FaqEntry } from "@/db/schema";
import { CATALOG_CACHE_TAG } from "@/lib/catalog/queries";
import { CACHE_TTL_SECONDS, readWithRetry } from "@/lib/cache";

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

export const getPublicServices = cache(() => readWithRetry(loadServices, "services"));

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

/**
 * A service line, for /services/[slug] — docs/05 Sprint 6.
 *
 * "Each gets: a service page, a category in the catalogue, seeded items, at
 * least two packaged Solutions with full BOMs, and a cost article."
 *
 * Deliberately NOT gated on `categories.published`. That flag gates the
 * *catalogue* page at /catalog/[category], and the seed derives it from whether
 * the category has anything published in it — because docs/02 is right that a
 * catalogue page with no items is thin content.
 *
 * A service page is a different object. Fire detection has no priced items yet
 * and its page still says something worth reading: what the work involves, what
 * it is not for, and why a heat detector goes in a kitchen. So the gate here is
 * simply "is it a service line, and has somebody written the copy" — and a line
 * with nothing priced shows no price rather than an invented one.
 */
export type ServiceLine = {
  slug: string;
  name: string;
  summary: string;
  intro: string;
  includes: string[];
  notFor: string[];
  faq: FaqEntry[];
  seoTitle: string | null;
  seoDescription: string | null;
  /** Published, priced items in this category. Empty is a normal state. */
  itemCount: number;
  updatedAt: string;
};

const loadServiceLines = unstable_cache(
  async (): Promise<ServiceLine[]> => {
    const rows = await db
      .select({
        slug: categories.slug,
        name: categories.name,
        summary: categories.summary,
        intro: categories.serviceIntro,
        includes: categories.serviceIncludes,
        notFor: categories.serviceNotFor,
        faq: categories.serviceFaq,
        seoTitle: categories.seoTitle,
        seoDescription: categories.seoDescription,
        updatedAt: categories.updatedAt,
        itemCount: sql<number>`(
          select count(*)::int from ${items}
          where ${items.categoryId} = ${categories.id}
            and ${items.published}
            and ${items.effectivePrice} is not null
        )`,
      })
      .from(categories)
      .where(and(eq(categories.kind, "service"), isNotNull(categories.serviceIntro)))
      .orderBy(asc(categories.sortOrder));

    return rows.map((row) => ({
      ...row,
      intro: row.intro as string,
      updatedAt: row.updatedAt.toISOString(),
    }));
  },
  ["service-lines"],
  { tags: [CATALOG_CACHE_TAG], revalidate: CACHE_TTL_SECONDS },
);

export const getServiceLines = cache(() => readWithRetry(loadServiceLines, "service-lines"));

export const getServiceLineBySlug = cache(async (slug: string): Promise<ServiceLine | null> => {
  return (await getServiceLines()).find((line) => line.slug === slug) ?? null;
});

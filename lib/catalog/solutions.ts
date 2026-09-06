import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { pricingRules, services, solutionLines, solutions } from "@/db/schema";
import { expandBom, type Bom, type BomItem, type BomLineInput, type BomService } from "@/lib/pricing/bom";
import type { CctvAnswers } from "@/lib/pricing/cctv";
import { getCatalogItemsById } from "./queries";
import { CATALOG_CACHE_TAG } from "./queries";

/**
 * Packages and their bills of materials.
 *
 * Totals are computed at render from live item prices, never read from the
 * cached columns on the solutions row. docs/02 warns not to trust a stale
 * cache, and it is right: the quantities are formulas evaluated in TypeScript,
 * so no database trigger could keep those columns correct when an item price
 * changes. They exist for admin sorting; this is what the public sees.
 */

export type SolutionSummary = {
  slug: string;
  name: string;
  tier: string;
  summary: string;
  propertyTypes: string[];
  bestFor: string[];
  notSuitableFor: string[];
  isBuilderTemplate: boolean;
  answers: CctvAnswers;
  /** VAT-exclusive, computed now. */
  total: number;
  vatAmount: number;
  totalInclVat: number;
  cameraCount: number;
  updatedAt: string;
};

export type SolutionDetail = SolutionSummary & {
  description: string | null;
  bom: Bom;
};

const SERVICE_UNIT_LABELS: Record<string, string> = {
  per_point: "point",
  per_camera: "camera",
  per_door: "door",
  per_metre: "metre",
  per_day: "day",
  per_month: "month",
  per_year: "year",
  per_camera_per_month: "camera / month",
  per_vehicle: "vehicle",
  per_tank: "tank",
  per_delegate: "delegate",
  fixed: "job",
};

/** pricing_rules as a plain name → number map, for the formula evaluator. */
export const getPricingRules = cache(
  unstable_cache(
    async (): Promise<Record<string, number>> => {
      const rows = await db
        .select({ key: pricingRules.key, value: pricingRules.value })
        .from(pricingRules);
      return Object.fromEntries(rows.map((row) => [row.key, Number(row.value)]));
    },
    ["pricing-rules"],
    { tags: [CATALOG_CACHE_TAG] },
  ),
);

export const getBomServices = cache(
  unstable_cache(
    async (): Promise<BomService[]> => {
      const rows = await db
        .select({
          id: services.id,
          slug: services.slug,
          name: services.name,
          price: services.price,
          pricingUnit: services.pricingUnit,
        })
        .from(services)
        .where(eq(services.published, true));

      return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        price: row.price,
        unitLabel: SERVICE_UNIT_LABELS[row.pricingUnit] ?? row.pricingUnit,
      }));
    },
    ["bom-services"],
    { tags: [CATALOG_CACHE_TAG] },
  ),
);

type RawSolution = {
  slug: string;
  name: string;
  tier: string;
  summary: string;
  description: string | null;
  propertyTypes: string[];
  bestFor: string[];
  notSuitableFor: string[];
  isBuilderTemplate: boolean;
  builderInputs: Record<string, unknown> | null;
  updatedAt: string;
  lines: BomLineInput[];
};

const loadSolutions = unstable_cache(
  async (): Promise<RawSolution[]> => {
    const [solutionRows, lineRows] = await Promise.all([
      db
        .select()
        .from(solutions)
        .where(eq(solutions.published, true))
        .orderBy(asc(solutions.sortOrder)),
      db.select().from(solutionLines).orderBy(asc(solutionLines.sortOrder)),
    ]);

    const linesBySolution = new Map<string, BomLineInput[]>();
    for (const line of lineRows) {
      const bucket = linesBySolution.get(line.solutionId) ?? [];
      bucket.push({
        id: line.id,
        lineType: line.lineType,
        itemId: line.itemId,
        serviceId: line.serviceId,
        quantity: Number(line.quantity),
        quantityFormula: line.quantityFormula,
        unitPriceSnapshot: line.unitPriceSnapshot,
        note: line.note,
        sortOrder: line.sortOrder,
      });
      linesBySolution.set(line.solutionId, bucket);
    }

    return solutionRows.map((row) => ({
      slug: row.slug,
      name: row.name,
      tier: row.tier,
      summary: row.summary,
      description: row.description,
      propertyTypes: row.propertyTypes,
      bestFor: row.bestFor,
      notSuitableFor: row.notSuitableFor,
      isBuilderTemplate: row.isBuilderTemplate,
      builderInputs: row.builderInputs,
      updatedAt: row.updatedAt.toISOString(),
      lines: linesBySolution.get(row.id) ?? [],
    }));
  },
  ["solutions"],
  { tags: [CATALOG_CACHE_TAG] },
);

/**
 * What pricing a package needs, fetched once.
 *
 * Hoisted deliberately. An earlier version awaited these three inside
 * priceSolution, so pricing seventeen packages issued fifty-one concurrent
 * unstable_cache lookups — which at runtime is invisible and at build time made
 * a single solution page take longer than three minutes to prerender, with the
 * database answering in 250ms. They are invariant across packages; they belong
 * outside the loop.
 */
type PricingContext = {
  itemsById: Map<string, BomItem>;
  rules: Record<string, number>;
  servicesById: Map<string, BomService>;
};

const getPricingContext = cache(async (): Promise<PricingContext> => {
  const [itemsById, rules, serviceList] = await Promise.all([
    getCatalogItemsById(),
    getPricingRules(),
    getBomServices(),
  ]);

  return {
    itemsById: itemsById as Map<string, BomItem>,
    rules,
    servicesById: new Map(serviceList.map((service) => [service.id, service])),
  };
});

function priceSolution(
  raw: RawSolution,
  context: PricingContext,
  vatRate: number,
): SolutionDetail {
  const answers = (raw.builderInputs ?? {}) as unknown as CctvAnswers;

  const bom = expandBom({
    lines: raw.lines,
    itemsById: context.itemsById,
    servicesById: context.servicesById,
    // `cameras` is the one name a package formula needs that is not a pricing
    // rule, and it comes from the answers the package is a saved result of.
    variables: { ...context.rules, cameras: answers.cameras ?? 0 },
    vatRate,
  });

  return {
    slug: raw.slug,
    name: raw.name,
    tier: raw.tier,
    summary: raw.summary,
    description: raw.description,
    propertyTypes: raw.propertyTypes,
    bestFor: raw.bestFor,
    notSuitableFor: raw.notSuitableFor,
    isBuilderTemplate: raw.isBuilderTemplate,
    answers,
    total: bom.subtotal,
    vatAmount: bom.vatAmount,
    totalInclVat: bom.total,
    cameraCount: answers.cameras ?? 0,
    updatedAt: raw.updatedAt,
    bom,
  };
}

export const getSolutions = cache(async (vatRate: number): Promise<SolutionDetail[]> => {
  const [raw, context] = await Promise.all([loadSolutions(), getPricingContext()]);
  return raw.map((solution) => priceSolution(solution, context, vatRate));
});

export const getSolutionBySlug = cache(
  async (slug: string, vatRate: number): Promise<SolutionDetail | null> => {
    const [raw, context] = await Promise.all([loadSolutions(), getPricingContext()]);
    const found = raw.find((solution) => solution.slug === slug);
    return found ? priceSolution(found, context, vatRate) : null;
  },
);

export const getSolutionSlugs = cache(async (): Promise<string[]> => {
  const raw = await loadSolutions();
  return raw.map((solution) => solution.slug);
});

/**
 * Slug and last-modified for every package — all the sitemap needs.
 *
 * Deliberately does not price anything. getSolutions() expands seventeen bills
 * of materials, and a sitemap that only lists URLs has no use for a single one
 * of them.
 */
export const getSolutionSitemapEntries = cache(
  async (): Promise<{ slug: string; updatedAt: string }[]> => {
    const raw = await loadSolutions();
    return raw.map((solution) => ({ slug: solution.slug, updatedAt: solution.updatedAt }));
  },
);

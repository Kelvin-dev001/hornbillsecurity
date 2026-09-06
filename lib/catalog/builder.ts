import "server-only";

import { cache } from "react";

import { expandBom, type Bom, type BomItem, type BomLineInput } from "@/lib/pricing/bom";
import {
  cctvLineSpecs,
  channelsFor,
  selectEquipment,
  type CctvAnswers,
  type CctvSelection,
} from "@/lib/pricing/cctv";
import { sizeStorage, storageRuleKey, STOCKED_DISK_SKUS } from "@/lib/pricing/storage";
import { getCatalogItemsById } from "./queries";
import { getBomServices, getPricingRules } from "./solutions";
import type { CatalogItem } from "./types";

/**
 * The Solution Builder's engine.
 *
 * Six answers plus a handful of line-level swaps produce a complete, priced bill
 * of materials — through exactly the same lib/pricing modules that generated the
 * seventeen packaged Solutions. There is one CCTV generator in this codebase,
 * and this is the other end of it.
 *
 * Every result is labelled an indicative estimate confirmed at site survey
 * (docs/01 §6), which is what makes publishing it honest.
 */

export type BuilderOverrides = {
  /** Swap the camera model for another in the same category. */
  cameraSku?: string;
  /** Swap the drive, up or down from the size the formula picked. */
  storageSku?: string;
  /** Metres of cable per camera, when the site is not typical. */
  cablePerCamera?: number;
};

export type SwapOption = {
  sku: string;
  name: string;
  price: number;
  /** Currently selected. */
  active: boolean;
  /** Difference against the current choice, for the label. */
  delta: number;
};

export type BuiltSystem = {
  answers: CctvAnswers;
  overrides: BuilderOverrides;
  selection: CctvSelection;
  bom: Bom;
  /** Alternative cameras in the same category, cheapest first. */
  cameraOptions: SwapOption[];
  /** The stocked drives, with the formula's own choice marked. */
  storageOptions: (SwapOption & { capacityGb: number; coversDays: number })[];
  /** What the formula asked for before any swap, so the page can warn. */
  requiredStorageGb: number;
  channels: number;
};

const CABLE_RULE_HOME = "cable_m_per_camera_residential";
const CABLE_RULE_COMMERCIAL = "cable_m_per_camera_commercial";
const COMMERCIAL_PROPERTIES = new Set([
  "shop",
  "office",
  "warehouse",
  "school",
  "estate",
  "farm",
]);

/** Everything the builder needs, fetched once per request. */
const getBuilderContext = cache(async () => {
  const [itemsById, rules, services] = await Promise.all([
    getCatalogItemsById(),
    getPricingRules(),
    getBomServices(),
  ]);

  const items = [...itemsById.values()];
  return {
    itemsById,
    itemsBySku: new Map(items.map((item) => [item.sku, item])),
    items,
    rules,
    servicesById: new Map(services.map((service) => [service.id, service])),
    servicesBySlug: new Map(services.map((service) => [service.slug, service])),
  };
});

export async function buildSystem(
  answers: CctvAnswers,
  overrides: BuilderOverrides,
  vatRate: number,
): Promise<BuiltSystem> {
  const context = await getBuilderContext();
  const { itemsBySku, items, rules, servicesById, servicesBySlug } = context;

  const selection = selectEquipment(answers, { available: items, rules });

  // ── apply the swaps ──────────────────────────────────────────────────────
  if (overrides.cameraSku && itemsBySku.has(overrides.cameraSku)) {
    selection.cameras = selection.cameras.map((camera, index) =>
      index === 0 ? { ...camera, sku: overrides.cameraSku as string } : camera,
    );
  }

  const requiredStorageGb = selection.storage?.requiredGb ?? 0;
  if (overrides.storageSku && selection.storage && itemsBySku.has(overrides.storageSku)) {
    const capacity = capacityOf(overrides.storageSku);
    selection.storage = {
      ...selection.storage,
      sku: overrides.storageSku,
      capacityGb: capacity,
      count: Math.max(1, Math.ceil(selection.storage.requiredGb / capacity)),
    };
  }

  const specs = cctvLineSpecs(answers, selection);

  // The cable rule is a pricing rule, so an override is applied by shadowing the
  // variable rather than by rewriting the formula — the formula stays exactly
  // what a packaged Solution would carry.
  const commercial = COMMERCIAL_PROPERTIES.has(answers.propertyType);
  const cableRule = commercial ? CABLE_RULE_COMMERCIAL : CABLE_RULE_HOME;
  const variables: Record<string, number> = {
    ...rules,
    cameras: answers.cameras,
    ...(overrides.cablePerCamera ? { [cableRule]: overrides.cablePerCamera } : {}),
  };

  const lines: BomLineInput[] = specs.map((spec, position) => {
    if (spec.sku) {
      const item = itemsBySku.get(spec.sku);
      if (!item) throw new Error(`builder: ${spec.sku} is not published`);
      return {
        id: `${position}-${spec.sku}`,
        lineType: spec.lineType,
        itemId: item.id,
        serviceId: null,
        quantity: spec.quantity ?? 0,
        quantityFormula: spec.formula ?? null,
        unitPriceSnapshot: null,
        note: spec.note ?? null,
        sortOrder: position * 10,
      };
    }

    const service = servicesBySlug.get(spec.serviceSlug as string);
    if (!service) throw new Error(`builder: service ${spec.serviceSlug} is not published`);
    return {
      id: `${position}-${service.slug}`,
      lineType: spec.lineType,
      itemId: null,
      serviceId: service.id,
      quantity: spec.quantity ?? 0,
      quantityFormula: spec.formula ?? null,
      unitPriceSnapshot: null,
      note: spec.note ?? null,
      sortOrder: position * 10,
    };
  });

  const bom = expandBom({
    lines,
    itemsById: context.itemsById as Map<string, BomItem>,
    servicesById,
    variables,
    vatRate,
  });

  return {
    answers,
    overrides,
    selection,
    bom,
    cameraOptions: cameraSwaps(selection, items, itemsBySku),
    storageOptions: storageSwaps(selection, answers, rules, itemsBySku),
    requiredStorageGb,
    channels: channelsFor(answers.cameras),
  };
}

const DISK_CAPACITY_GB: Record<string, number> = {
  "HDD-1TB": 1000,
  "HDD-2TB": 2000,
  "HDD-4TB": 4000,
  "HDD-8TB": 8000,
};

function capacityOf(sku: string): number {
  return DISK_CAPACITY_GB[sku] ?? 1000;
}

/** Other cameras in the same category, so a swap is like for like. */
function cameraSwaps(
  selection: CctvSelection,
  items: CatalogItem[],
  bySku: Map<string, CatalogItem>,
): SwapOption[] {
  const current = bySku.get(selection.cameras[0]?.sku ?? "");
  if (!current) return [];

  return items
    .filter((item) => item.category.slug === current.category.slug)
    .sort((a, b) => a.price - b.price)
    .map((item) => ({
      sku: item.sku,
      name: item.name,
      price: item.price,
      active: item.sku === current.sku,
      delta: (item.price - current.price) * (selection.cameras[0]?.quantity ?? 1),
    }));
}

/**
 * The stocked drives, each labelled with how many days it actually covers.
 *
 * Showing days rather than terabytes is the point: "4 TB" means nothing to a
 * buyer, and "62 days at this camera count" means everything.
 */
function storageSwaps(
  selection: CctvSelection,
  answers: CctvAnswers,
  rules: Record<string, number>,
  bySku: Map<string, CatalogItem>,
): (SwapOption & { capacityGb: number; coversDays: number })[] {
  if (!selection.storage) return [];

  const perDay = rules[storageRuleKey(selection.resolutionMp)] * answers.cameras;
  const currentPrice = bySku.get(selection.storage.sku)?.price ?? 0;

  return STOCKED_DISK_SKUS.map((sku) => bySku.get(sku))
    .filter((item): item is CatalogItem => item !== undefined)
    .map((item) => ({
      sku: item.sku,
      name: item.name,
      price: item.price,
      capacityGb: capacityOf(item.sku),
      coversDays: perDay > 0 ? Math.floor(capacityOf(item.sku) / perDay) : 0,
      active: item.sku === selection.storage?.sku,
      delta: item.price - currentPrice,
    }));
}

/**
 * The cheaper system to show beside the recommended one.
 *
 * docs/01 §5: "Recommend the technically correct system, and show a cheaper
 * alternative beside it rather than silently downgrading." So the budget variant
 * is generated openly and priced in full — the visitor sees both totals and
 * decides, instead of being quietly sold the cheap one.
 */
export async function buildBudgetAlternative(
  answers: CctvAnswers,
  vatRate: number,
): Promise<BuiltSystem | null> {
  const budgetAnswers: CctvAnswers = {
    ...answers,
    budget: true,
    // The two levers that actually move the price: drop to infrared, and keep a
    // week of footage rather than a fortnight.
    colourAtNight: false,
    retentionDays: Math.max(7, Math.floor(answers.retentionDays / 2)),
  };

  if (
    budgetAnswers.colourAtNight === answers.colourAtNight &&
    budgetAnswers.retentionDays === answers.retentionDays
  ) {
    return null;
  }

  try {
    return await buildSystem(budgetAnswers, {}, vatRate);
  } catch {
    return null;
  }
}

/** Storage sizing for the current answers, ignoring any swap. */
export async function recommendedStorage(answers: CctvAnswers) {
  const { items, rules } = await getBuilderContext();
  const resolutionMp = answers.technology === "analog" ? 2 : 4;
  return sizeStorage({
    channels: answers.cameras,
    gbPerChannelPerDay: rules[storageRuleKey(resolutionMp)],
    retentionDays: answers.retentionDays,
    available: items,
  });
}

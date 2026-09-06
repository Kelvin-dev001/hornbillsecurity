/**
 * Turns the package definitions in db/seed/solutions.ts into rows.
 *
 * Each package is run through lib/pricing/cctv.ts — the same module /build/cctv
 * calls per request — and the resulting line specs are resolved from SKUs and
 * service slugs to ids and persisted. A package page and the builder therefore
 * cannot disagree about what a system contains: there is one generator.
 *
 * Quantities are written as formulas wherever the generator produced one, so
 * changing cable_m_per_camera_residential in admin re-prices every package.
 * The literal quantities that remain — how many cameras, one recorder — are
 * properties of the package rather than rules, and belong in the row.
 */
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { expandBom, type BomItem, type BomLineInput, type BomService } from "../../lib/pricing/bom";
import { cctvLineSpecs, selectEquipment } from "../../lib/pricing/cctv";
import { services, solutionLines, solutions, type ItemUnit, type NewSolutionLine } from "../schema";
import { solutionSeed } from "./solutions";
import { overwriteAllExcept } from "./upsert";

type SeededItem = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription: string;
  unit: ItemUnit;
  priceBasis: string;
  price: number | null;
  published: boolean;
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

export async function buildSolutions(
  db: PostgresJsDatabase,
  context: {
    categoryIdBySlug: Map<string, string>;
    itemsBySku: Map<string, SeededItem>;
    rules: Map<string, number>;
    vatRate: number;
  },
): Promise<{ solutions: number; lines: number }> {
  const { categoryIdBySlug, itemsBySku, rules, vatRate } = context;

  const cctvCategoryId = categoryIdBySlug.get("cctv");
  if (!cctvCategoryId) throw new Error("the cctv category was not seeded");

  const available = [...itemsBySku.values()].filter(
    (item) => item.published && item.price !== null,
  );
  const ruleValues = Object.fromEntries(rules);

  // Service ids come back from the database, since buildServices() works in
  // slugs and the rows were upserted a moment ago.
  const serviceRows = await db.select().from(services);
  const serviceIdBySlugResolved = new Map(serviceRows.map((row) => [row.slug, row]));

  const bomItemsById = new Map<string, BomItem>(
    [...itemsBySku.values()]
      .filter((item) => item.price !== null)
      .map((item) => [
        item.id,
        {
          id: item.id,
          sku: item.sku,
          slug: item.slug,
          name: item.name,
          shortDescription: item.shortDescription,
          unit: item.unit,
          price: item.price as number,
          priceBasis: item.priceBasis,
        },
      ]),
  );

  let totalLines = 0;

  for (const [index, seed] of solutionSeed.entries()) {
    const selection = selectEquipment(seed.answers, {
      available,
      rules: ruleValues,
      cameraMix: seed.cameraMix,
      recorderSku: seed.recorderSku,
    });

    const specs = cctvLineSpecs(seed.answers, selection);

    // Resolve every SKU and service slug now, so a package referencing
    // something unpublished fails the seed rather than rendering a hole.
    const lineInputs: BomLineInput[] = specs.map((spec, position) => {
      if (spec.sku) {
        const item = itemsBySku.get(spec.sku);
        if (!item) throw new Error(`${seed.slug}: unknown SKU ${spec.sku}`);
        if (!item.published || item.price === null) {
          throw new Error(`${seed.slug}: ${spec.sku} is not published or not priced`);
        }
        return {
          id: `${seed.slug}-${position}`,
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

      const service = serviceIdBySlugResolved.get(spec.serviceSlug as string);
      if (!service) throw new Error(`${seed.slug}: unknown service ${spec.serviceSlug}`);
      if (service.price === null) {
        throw new Error(`${seed.slug}: service ${service.slug} has no price`);
      }
      return {
        id: `${seed.slug}-${position}`,
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

    // Expand once at seed time to populate the cached totals and, more
    // usefully, to prove every formula in the package actually evaluates. A
    // package that cannot be priced must not reach the database.
    const bom = expandBom({
      lines: lineInputs,
      itemsById: bomItemsById,
      servicesById: new Map(
        serviceRows.map((row): [string, BomService] => [
          row.id,
          {
            id: row.id,
            slug: row.slug,
            name: row.name,
            price: row.price,
            unitLabel: SERVICE_UNIT_LABELS[row.pricingUnit] ?? row.pricingUnit,
          },
        ]),
      ),
      variables: { ...ruleValues, cameras: seed.answers.cameras },
      vatRate,
    });

    const row = {
      slug: seed.slug,
      name: seed.name,
      categoryId: cctvCategoryId,
      tier: seed.tier,
      propertyTypes: seed.propertyTypes,
      summary: seed.summary,
      description: seed.description,
      isBuilderTemplate: seed.isBuilderTemplate,
      builderInputs: seed.answers as unknown as Record<string, unknown>,
      bestFor: seed.bestFor,
      notSuitableFor: seed.notSuitableFor,
      subtotalItems: bom.subtotalItems,
      subtotalLabour: bom.subtotalLabour,
      totalExclVat: bom.subtotal,
      published: true,
      sortOrder: index * 10,
    };

    const [saved] = await db
      .insert(solutions)
      .values(row)
      .onConflictDoUpdate({
        target: solutions.slug,
        set: overwriteAllExcept(solutions, ["id", "slug"]),
      })
      .returning({ id: solutions.id });

    // Lines are replaced wholesale. They have no natural key and the generator
    // may produce a different set after a rule or catalogue change, so keeping
    // stale rows would be worse than rewriting them.
    await db.delete(solutionLines).where(eq(solutionLines.solutionId, saved.id));

    const rows: NewSolutionLine[] = lineInputs.map((line) => ({
      solutionId: saved.id,
      lineType: line.lineType,
      itemId: line.itemId,
      serviceId: line.serviceId,
      quantity: String(line.quantity),
      quantityFormula: line.quantityFormula,
      unitPriceSnapshot: line.unitPriceSnapshot,
      note: line.note,
      sortOrder: line.sortOrder,
    }));

    await db.insert(solutionLines).values(rows);
    totalLines += rows.length;
  }

  return { solutions: solutionSeed.length, lines: totalLines };
}

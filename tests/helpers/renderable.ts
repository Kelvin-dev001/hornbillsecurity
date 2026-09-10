/**
 * Every amount the site is entitled to print, computed exactly.
 *
 * The leak test asks "does a distributor cost appear on this page?", and on a
 * bill of materials that question is harder than it looks, because a BOM prints
 * arithmetic. Four junction boxes at 300 is 1,200 — which is what a box of RJ45
 * connectors costs us. Twenty-four trunking lengths at 400 is 9,600, the cost of
 * a deterrence camera. Four camera points of labour at 3,000 is 12,000, the cost
 * of a wireless bridge kit. None of those is a leak.
 *
 * An earlier version approximated this with "every price × every quantity up to
 * 64", which swallowed two thirds of the distributor costs and left the scan
 * too weak to be worth running — the suite's own guard assertion caught it.
 *
 * So this computes the real set instead, by running the same lib/pricing engine
 * the pages run, over the same seeded data. Anything outside the result is an
 * amount the site has no legitimate way to arrive at.
 */
import { expandBom, type BomItem, type BomService } from "../../lib/pricing/bom";
import { cctvLineSpecs, selectEquipment, type CctvAnswers } from "../../lib/pricing/cctv";
import { PRICE_BANDS } from "../../lib/catalog/types";
import type { connect } from "./db";

/**
 * Builder configurations the leak test fetches, and the answers behind them.
 *
 * One source for both, so a URL under test and the amounts computed for it can
 * never drift apart.
 */
export const BUILDER_VARIANTS: { query: string; answers: CctvAnswers }[] = [
  {
    query: "",
    answers: {
      propertyType: "home",
      cameras: 4,
      outdoorCameras: 4,
      technology: "analog",
      colourAtNight: true,
      retentionDays: 14,
      location: "mombasa",
    },
  },
  {
    query: "?tech=ip&cameras=8&days=30&property=office",
    answers: {
      propertyType: "office",
      cameras: 8,
      outdoorCameras: 8,
      technology: "ip",
      colourAtNight: true,
      retentionDays: 30,
      location: "mombasa",
    },
  },
  {
    query: "?tech=analog&cameras=16&colour=no&days=7&where=coast&coast=yes",
    answers: {
      propertyType: "home",
      cameras: 16,
      outdoorCameras: 16,
      technology: "analog",
      colourAtNight: false,
      retentionDays: 7,
      location: "coast",
      coastSpec: true,
    },
  },
  {
    query: "?cameras=2&days=14",
    answers: {
      propertyType: "home",
      cameras: 2,
      outdoorCameras: 2,
      technology: "analog",
      colourAtNight: true,
      retentionDays: 14,
      location: "mombasa",
    },
  },
];

type ItemRow = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  short_description: string;
  unit: string;
  price: number;
  price_basis: string;
};

function amountsFrom(bom: ReturnType<typeof expandBom>, into: Set<number>, depositPercent: number) {
  for (const line of bom.lines) {
    into.add(line.unitPrice);
    into.add(line.extended);
    into.add(line.quantity);
  }
  for (const group of bom.groups) into.add(group.subtotal);
  into.add(bom.subtotalItems);
  into.add(bom.subtotalLabour);
  into.add(bom.subtotal);
  into.add(bom.vatAmount);
  into.add(bom.total);
  into.add(Math.round((bom.total * depositPercent) / 100));
  into.add(bom.provisionalAmount);
}

export async function readRenderableAmounts(sql: ReturnType<typeof connect>): Promise<Set<number>> {
  const [itemRows, serviceRows, ruleRows, settingsRows, solutionRows, lineRows] = await Promise.all([
    // public_items, deliberately — the same relation the pages read, so this
    // helper cannot see a cost price either.
    sql<ItemRow[]>`
      select id, sku, slug, name, short_description, unit::text as unit,
             price, price_basis::text as price_basis
      from public_items`,
    sql<{ id: string; slug: string; name: string; price: number | null; unit: string }[]>`
      select id, slug, name, price, pricing_unit::text as unit
      from services where published`,
    sql<{ key: string; value: string }[]>`select key, value from pricing_rules`,
    sql<{ vat_rate: string; deposit_percent: number; site_survey_fee: number }[]>`
      select vat_rate, deposit_percent, site_survey_fee from site_settings`,
    sql<{ id: string; builder_inputs: Record<string, unknown> | null }[]>`
      select id, builder_inputs from solutions where published`,
    sql<
      {
        solution_id: string;
        id: string;
        line_type: string;
        item_id: string | null;
        service_id: string | null;
        quantity: string;
        quantity_formula: string | null;
        unit_price_snapshot: number | null;
        sort_order: number;
      }[]
    >`select solution_id, id, line_type::text as line_type, item_id, service_id,
             quantity, quantity_formula, unit_price_snapshot, sort_order
      from solution_lines`,
  ]);

  const settings = settingsRows[0];
  const vatRate = Number(settings.vat_rate);
  const depositPercent = settings.deposit_percent;

  const itemsById = new Map<string, BomItem>(
    itemRows.map((row) => [
      row.id,
      {
        id: row.id,
        sku: row.sku,
        slug: row.slug,
        name: row.name,
        shortDescription: row.short_description,
        unit: row.unit as BomItem["unit"],
        price: row.price,
        priceBasis: row.price_basis,
      },
    ]),
  );
  const itemsBySku = new Map([...itemsById.values()].map((item) => [item.sku, item]));

  const servicesById = new Map<string, BomService>(
    serviceRows.map((row) => [
      row.id,
      { id: row.id, slug: row.slug, name: row.name, price: row.price, unitLabel: row.unit },
    ]),
  );
  const servicesBySlug = new Map([...servicesById.values()].map((s) => [s.slug, s]));

  const rules = Object.fromEntries(ruleRows.map((row) => [row.key, Number(row.value)]));

  const amounts = new Set<number>();
  amounts.add(settings.site_survey_fee);
  for (const value of Object.values(rules)) amounts.add(value);
  for (const item of itemsById.values()) amounts.add(item.price);
  for (const service of servicesById.values()) if (service.price !== null) amounts.add(service.price);

  // ── the seeded packages ──────────────────────────────────────────────────
  type LineRow = (typeof lineRows)[number];
  const linesBySolution = new Map<string, LineRow[]>();
  for (const line of lineRows) {
    const bucket = linesBySolution.get(line.solution_id) ?? [];
    bucket.push(line);
    linesBySolution.set(line.solution_id, bucket);
  }

  for (const solution of solutionRows) {
    const answers = (solution.builder_inputs ?? {}) as unknown as CctvAnswers;
    const bom = expandBom({
      lines: (linesBySolution.get(solution.id) ?? []).map((line) => ({
        id: line.id,
        lineType: line.line_type as "primary",
        itemId: line.item_id,
        serviceId: line.service_id,
        quantity: Number(line.quantity),
        quantityFormula: line.quantity_formula,
        unitPriceSnapshot: line.unit_price_snapshot,
        note: null,
        sortOrder: line.sort_order,
      })),
      itemsById,
      servicesById,
      variables: { ...rules, cameras: answers.cameras ?? 0 },
      vatRate,
    });
    amountsFrom(bom, amounts, depositPercent);
  }

  // ── the builder configurations the test fetches ──────────────────────────
  const available = [...itemsById.values()];
  for (const variant of BUILDER_VARIANTS) {
    const subtotals: number[] = [];

    // The recommended system, and the budget alternative shown beside it.
    for (const answers of [
      variant.answers,
      {
        ...variant.answers,
        budget: true,
        colourAtNight: false,
        retentionDays: Math.max(7, Math.floor(variant.answers.retentionDays / 2)),
      },
    ]) {
      const selection = selectEquipment(answers, { available, rules });
      const specs = cctvLineSpecs(answers, selection);

      const bom = expandBom({
        lines: specs.map((spec, position) => {
          const item = spec.sku ? itemsBySku.get(spec.sku) : undefined;
          const service = spec.serviceSlug ? servicesBySlug.get(spec.serviceSlug) : undefined;
          return {
            id: String(position),
            lineType: spec.lineType,
            itemId: item?.id ?? null,
            serviceId: service?.id ?? null,
            quantity: spec.quantity ?? 0,
            quantityFormula: spec.formula ?? null,
            unitPriceSnapshot: null,
            note: null,
            sortOrder: position * 10,
          };
        }),
        itemsById,
        servicesById,
        variables: { ...rules, cameras: answers.cameras },
        vatRate,
      });
      amountsFrom(bom, amounts, depositPercent);
      subtotals.push(bom.subtotal);

      // The storage swap row prints each stocked drive's price and the days it
      // covers, and the camera swap row prints every alternative's price. Both
      // are published prices, already in the set above.
    }

    // "It saves KES X" — the difference between the two systems, which the page
    // prints and which is neither a price nor a total.
    if (subtotals.length === 2) amounts.add(Math.abs(subtotals[0] - subtotals[1]));
  }

  return amounts;
}

/**
 * Numbers the catalogue prints for reasons that have nothing to do with price.
 *
 * The leak scan matches a cost that stands alone as a token anywhere on a page,
 * which is what it takes to catch a cost interpolated into a sentence. The cost
 * of that reach is that the catalogue's own copy is full of standalone numbers:
 * "2MP / 2.8mm / 350 deg pan / 75 deg tilt" contains 350, which is also the
 * distributor cost of a DC connector pack, and the price-band facet is labelled
 * "5,000 – 15,000", where 15,000 is a camera's cost.
 *
 * Neither is a leak and neither is distinguishable from one by looking at the
 * page, so both are removed from the forbidden set rather than special-cased in
 * the regex — a lookahead listing "deg", "mm" and "MP" would be a list that goes
 * stale the first time somebody writes a spec in a new unit, and it would hide a
 * genuine leak that happened to be followed by one of those words.
 *
 * Deliberately narrow. It reads item, service and category metadata — the fields
 * that carry specifications — and the price-band boundaries. It does **not**
 * read article bodies or any other owner-edited prose: those change without a
 * code review, and letting them subtract from the forbidden set would let the
 * scan be weakened by an edit in the admin portal.
 */
export async function readAmbiguousNumbers(
  sql: ReturnType<typeof connect>,
): Promise<Set<number>> {
  const [itemRows, serviceRows, categoryRows] = await Promise.all([
    sql<{ text: string }[]>`
      select concat_ws(' ', name, short_description, description, specs::text,
                       array_to_string(use_cases, ' ')) as text
      from public_items`,
    sql<{ text: string }[]>`
      select concat_ws(' ', name, description, array_to_string(inclusions, ' ')) as text
      from services where published`,
    sql<{ text: string }[]>`
      select concat_ws(' ', name, summary) as text from categories where published`,
  ]);

  const ambiguous = new Set<number>();

  for (const row of [...itemRows, ...serviceRows, ...categoryRows]) {
    // Every integer in the text, with thousands separators honoured, so both
    // "15000" and "15,000" reduce to the same value.
    for (const match of row.text.matchAll(/\d[\d,]*/g)) {
      const value = Number(match[0].replace(/,/g, ""));
      if (Number.isFinite(value)) ambiguous.add(value);
    }
  }

  for (const band of PRICE_BANDS) {
    ambiguous.add(band.min);
    ambiguous.add(band.max);
  }

  return ambiguous;
}

/**
 * Bill of materials expansion.
 *
 * docs/01 §3: "Every Solution line shows quantity, unit price and extended
 * price, and totals to one number. That visible arithmetic *is* the product."
 *
 * Pure functions over data the caller has already fetched. Both paths through
 * the product share this module, so a package page and the builder cannot
 * disagree about what a system costs:
 *
 *   - a seeded Solution, whose lines come from solution_lines;
 *   - the Solution Builder, whose lines are generated from six answers.
 *
 * Prices arrive from public_items, which has no cost_price column, so nothing
 * here can total a distributor price by accident.
 */
import type { ItemUnit, SolutionLineType } from "@/db/schema";
import { unitShort } from "@/lib/catalog/format";
import { evaluateFormula, type FormulaVariables } from "./formula";

/**
 * What a BOM needs to know about an item — a strict subset of CatalogItem, so
 * the pages pass their catalogue rows straight in and the seed can build the
 * same shape without inventing the fields it does not have.
 */
export type BomItem = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  shortDescription: string;
  unit: ItemUnit;
  price: number;
  priceBasis: string;
};

/** Quantities of these are whole numbers — you cannot buy 0.6 of a cable box. */
const DISCRETE_UNITS: ItemUnit[] = ["each", "box", "roll_305m", "length_2m", "coil", "pair"];

export const LINE_TYPE_LABELS: Record<SolutionLineType, string> = {
  primary: "Primary equipment",
  secondary: "Secondary components",
  consumable: "Consumables",
  labour: "Installation and labour",
};

/** docs/01 §3 order: what you think you are buying, then what the job needs. */
const LINE_TYPE_ORDER: SolutionLineType[] = ["primary", "secondary", "consumable", "labour"];

/**
 * A price we cannot yet stand behind, and which must be marked wherever it is
 * shown. `placeholder` is an estimate at market rates pending the owner's
 * supplier list; `market_research` is a figure read off a Kenyan reseller.
 */
export function isProvisionalPrice(basis: string): boolean {
  return basis === "placeholder" || basis === "market_research";
}

export type BomLineInput = {
  id: string;
  lineType: SolutionLineType;
  itemId: string | null;
  serviceId: string | null;
  /** Used when quantityFormula is null. */
  quantity: number;
  quantityFormula: string | null;
  unitPriceSnapshot: number | null;
  note: string | null;
  sortOrder: number;
};

export type BomService = {
  id: string;
  slug: string;
  name: string;
  price: number | null;
  unitLabel: string;
};

export type BomLine = {
  id: string;
  lineType: SolutionLineType;
  /** Model number for an item; null for labour. */
  sku: string | null;
  /** Link target on the item page; null for labour. */
  href: string | null;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  extended: number;
  note: string | null;
  /** The price is an estimate and is marked as such in the table. */
  provisional: boolean;
};

export type BomGroup = {
  lineType: SolutionLineType;
  label: string;
  lines: BomLine[];
  subtotal: number;
};

export type Bom = {
  groups: BomGroup[];
  lines: BomLine[];
  /** Equipment and consumables, VAT-exclusive. */
  subtotalItems: number;
  subtotalLabour: number;
  subtotal: number;
  /** Percent, e.g. 16. */
  vatRate: number;
  vatAmount: number;
  total: number;
  /** Extended value of the lines carrying a provisional price. */
  provisionalAmount: number;
  /** That value as a share of the subtotal, 0-1. */
  provisionalShare: number;
};

export class BomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BomError";
  }
}

function resolveQuantity(line: BomLineInput, variables: FormulaVariables, unit: ItemUnit): number {
  const raw = line.quantityFormula
    ? evaluateFormula(line.quantityFormula, variables)
    : line.quantity;

  if (raw < 0) throw new BomError(`line ${line.id} resolved to a negative quantity (${raw})`);

  // A formula should normally round itself with ceil(), because the author knows
  // whether a part is bought whole. This is the safety net for the ones that do
  // not: a BOM asking for 1.4 power supplies would total correctly and be
  // impossible to buy.
  if (DISCRETE_UNITS.includes(unit)) return Math.ceil(raw);
  return Math.round(raw * 100) / 100;
}

export function expandBom(options: {
  lines: BomLineInput[];
  itemsById: Map<string, BomItem>;
  servicesById: Map<string, BomService>;
  variables: FormulaVariables;
  /** From site_settings.vat_rate — never a literal (CLAUDE.md §9). */
  vatRate: number;
}): Bom {
  const { lines: inputs, itemsById, servicesById, variables, vatRate } = options;

  const lines: BomLine[] = [];

  for (const input of [...inputs].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (input.itemId) {
      const item = itemsById.get(input.itemId);
      if (!item) {
        // A published package pointing at an unpublished item is a data error,
        // and rendering it as a hole in the BOM would understate the job.
        throw new BomError(
          `line ${input.id} references item ${input.itemId}, which is not published or not priced`,
        );
      }

      const quantity = resolveQuantity(input, variables, item.unit);
      if (quantity === 0) continue;

      const unitPrice = input.unitPriceSnapshot ?? item.price;
      lines.push({
        id: input.id,
        lineType: input.lineType,
        sku: item.sku,
        href: `/catalog/item/${item.slug}`,
        name: item.name,
        spec: item.shortDescription,
        unit: unitShort(item.unit),
        quantity,
        unitPrice,
        extended: quantity * unitPrice,
        note: input.note,
        provisional: isProvisionalPrice(item.priceBasis),
      });
      continue;
    }

    if (!input.serviceId) {
      throw new BomError(`line ${input.id} has neither an item nor a service`);
    }

    const service = servicesById.get(input.serviceId);
    if (!service) throw new BomError(`line ${input.id} references an unknown service`);
    if (service.price === null) {
      throw new BomError(`line ${input.id} uses service "${service.slug}", which has no price`);
    }

    const quantity = Math.ceil(
      input.quantityFormula ? evaluateFormula(input.quantityFormula, variables) : input.quantity,
    );
    if (quantity === 0) continue;

    lines.push({
      id: input.id,
      lineType: input.lineType,
      sku: null,
      href: null,
      name: service.name,
      spec: service.unitLabel,
      unit: service.unitLabel,
      quantity,
      unitPrice: service.price,
      extended: quantity * service.price,
      note: input.note,
      provisional: false,
    });
  }

  return summariseBom(lines, vatRate);
}

/**
 * Groups and totals lines that are already priced.
 *
 * Split out of expandBom because the quote basket combines lines from several
 * sources — loose items and the expanded bill of materials of one or more
 * packages — and those are priced before they meet. Re-resolving a package's
 * lines through the formula engine to add them up would mean matching items
 * back by SKU and services by name, which is exactly the kind of lookup that
 * silently pairs the wrong row.
 */
export function summariseBom(lines: BomLine[], vatRate: number): Bom {
  const groups: BomGroup[] = LINE_TYPE_ORDER.map((lineType) => {
    const groupLines = lines.filter((line) => line.lineType === lineType);
    return {
      lineType,
      label: LINE_TYPE_LABELS[lineType],
      lines: groupLines,
      subtotal: groupLines.reduce((sum, line) => sum + line.extended, 0),
    };
  }).filter((group) => group.lines.length > 0);

  const subtotalLabour = lines
    .filter((line) => line.lineType === "labour")
    .reduce((sum, line) => sum + line.extended, 0);
  const subtotalItems = lines
    .filter((line) => line.lineType !== "labour")
    .reduce((sum, line) => sum + line.extended, 0);
  const subtotal = subtotalItems + subtotalLabour;

  // VAT rounds once, on the subtotal. Rounding each line and summing would
  // disagree with the invoice by a few shillings, which is exactly the kind of
  // thing a buyer comparing three quotes notices.
  const vatAmount = Math.round((subtotal * vatRate) / 100);

  const provisionalAmount = lines
    .filter((line) => line.provisional)
    .reduce((sum, line) => sum + line.extended, 0);

  return {
    groups,
    lines,
    subtotalItems,
    subtotalLabour,
    subtotal,
    vatRate,
    vatAmount,
    total: subtotal + vatAmount,
    provisionalAmount,
    provisionalShare: subtotal === 0 ? 0 : provisionalAmount / subtotal,
  };
}

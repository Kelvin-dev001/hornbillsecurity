import "server-only";

import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { brands, categories, items, type NewItem, type PriceBasis } from "@/db/schema";
import { itemSlug } from "@/lib/slug";
import { csvBrandToSlug, csvCategoryToSlug } from "@/db/seed/taxonomy";

/**
 * CSV import and export for items.
 *
 * docs/08 Sprint 4: "CSV import and export for items, round-tripping
 * docs/07-catalog-seed.csv." So the columns are that file's columns, in that
 * order — the owner's own price list is the format, and an export opens in the
 * same spreadsheet he already keeps.
 *
 * Export carries the distributor cost. That is the point of it — it is the
 * owner's working file — but it means an exported CSV is as sensitive as the
 * database, and the download route is behind the admin gate for that reason.
 */

export const CSV_COLUMNS = [
  "sku",
  "brand",
  "name",
  "category",
  "form_factor",
  "key_specs",
  "supplier_price_kes",
  "retail_price_kes",
  "price_basis",
  "notes",
] as const;

/** Wraps a value only when it needs it, so a diff against the seed stays small. */
function escape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const BASIS_TO_CSV: Record<PriceBasis, string> = {
  distributor: "distributor+40%",
  market_research: "market research",
  owner_sell_price: "owner_sell_price",
  quote_required: "QUOTE REQUIRED",
  placeholder: "PLACEHOLDER",
};

const CSV_TO_BASIS: Record<string, PriceBasis> = {
  "distributor+40%": "distributor",
  "MARKET CEILING": "distributor",
  "market research": "market_research",
  owner_sell_price: "owner_sell_price",
  "QUOTE REQUIRED": "quote_required",
  PLACEHOLDER: "placeholder",
};

export async function exportItemsCsv(): Promise<string> {
  const rows = await db
    .select({
      sku: items.sku,
      brandName: brands.name,
      name: items.name,
      categoryName: categories.name,
      specs: items.specs,
      costPrice: items.costPrice,
      effectivePrice: items.effectivePrice,
      marketCeilingPrice: items.marketCeilingPrice,
      priceBasis: items.priceBasis,
      internalNote: items.internalNote,
    })
    .from(items)
    .innerJoin(categories, eq(items.categoryId, categories.id))
    .leftJoin(brands, eq(items.brandId, brands.id))
    .orderBy(asc(items.sku));

  const lines = [CSV_COLUMNS.join(",")];

  for (const row of rows) {
    const overview = row.specs.find((spec) => spec.label === "Type");
    const keySpecs = row.specs
      .filter((spec) => spec.group !== "Overview")
      .map((spec) => spec.value)
      .join("; ");

    lines.push(
      [
        row.sku,
        row.brandName ?? "Generic",
        row.name,
        row.categoryName,
        overview?.value ?? "",
        keySpecs,
        row.costPrice === null ? "" : String(row.costPrice),
        row.effectivePrice === null ? "" : String(row.effectivePrice),
        // A ceiling is what makes the retail column not simply cost × 1.40, so
        // the export says so rather than losing the distinction on re-import.
        row.marketCeilingPrice !== null ? "MARKET CEILING" : BASIS_TO_CSV[row.priceBasis],
        row.internalNote ?? "",
      ]
        .map((value) => escape(String(value).replace(/[\r\n]+/g, " ")))
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

export type ImportReport = {
  updated: { sku: string; field: string; from: string; to: string }[];
  created: string[];
  skipped: { sku: string; reason: string }[];
  /** Nothing is written until the owner confirms this report. */
  applied: boolean;
};

type ParsedRow = Record<(typeof CSV_COLUMNS)[number], string>;

/** A CSV reader that copes with quoted fields, unlike the seed's. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => value.trim() !== ""));
}

/**
 * Reads a CSV and reports what it would change, without changing anything.
 *
 * The same shape as the price review: look, then commit. A spreadsheet round-trip
 * is exactly where a stray column shift silently rewrites three hundred prices,
 * so the owner sees every field that would move before any of them does.
 */
export async function planImport(text: string): Promise<ImportReport> {
  const rows = parseCsv(text);
  const header = rows[0]?.map((value) => value.trim());

  if (!header || header.join(",") !== CSV_COLUMNS.join(",")) {
    return {
      updated: [],
      created: [],
      skipped: [
        {
          sku: "—",
          reason: `The header must be exactly: ${CSV_COLUMNS.join(", ")}`,
        },
      ],
      applied: false,
    };
  }

  const existing = await db
    .select({
      id: items.id,
      sku: items.sku,
      name: items.name,
      costPrice: items.costPrice,
      marketCeilingPrice: items.marketCeilingPrice,
      priceBasis: items.priceBasis,
      internalNote: items.internalNote,
    })
    .from(items);
  const bySku = new Map(existing.map((item) => [item.sku, item]));

  const report: ImportReport = { updated: [], created: [], skipped: [], applied: false };

  for (const values of rows.slice(1)) {
    const row = Object.fromEntries(
      CSV_COLUMNS.map((column, index) => [column, (values[index] ?? "").trim()]),
    ) as ParsedRow;

    if (!row.sku) continue;

    const current = bySku.get(row.sku);
    if (!current) {
      // Creating from CSV needs a category and a slug the file does not carry
      // reliably, so a new model number is reported and left to the item form.
      report.skipped.push({
        sku: row.sku,
        reason: "Not in the catalogue yet — add it under Items first, then re-import.",
      });
      continue;
    }

    const basis = CSV_TO_BASIS[row.price_basis];
    if (!basis) {
      report.skipped.push({ sku: row.sku, reason: `Unknown price basis "${row.price_basis}"` });
      continue;
    }

    const cost = row.supplier_price_kes === "" ? null : Number(row.supplier_price_kes);
    if (cost !== null && !Number.isInteger(cost)) {
      report.skipped.push({ sku: row.sku, reason: `"${row.supplier_price_kes}" is not a whole number` });
      continue;
    }

    if (cost !== current.costPrice) {
      report.updated.push({
        sku: row.sku,
        field: "cost",
        from: current.costPrice === null ? "—" : String(current.costPrice),
        to: cost === null ? "—" : String(cost),
      });
    }

    const ceiling =
      row.price_basis === "MARKET CEILING" && row.retail_price_kes !== ""
        ? Number(row.retail_price_kes)
        : null;
    if (ceiling !== current.marketCeilingPrice) {
      report.updated.push({
        sku: row.sku,
        field: "ceiling",
        from: current.marketCeilingPrice === null ? "—" : String(current.marketCeilingPrice),
        to: ceiling === null ? "—" : String(ceiling),
      });
    }

    if (basis !== current.priceBasis) {
      report.updated.push({ sku: row.sku, field: "basis", from: current.priceBasis, to: basis });
    }

    if (row.name && row.name !== current.name) {
      report.updated.push({ sku: row.sku, field: "name", from: current.name, to: row.name });
    }
  }

  return report;
}

/** Applies an import that has already been reported. */
export async function applyImport(text: string): Promise<number> {
  const rows = parseCsv(text).slice(1);
  let changed = 0;

  for (const values of rows) {
    const row = Object.fromEntries(
      CSV_COLUMNS.map((column, index) => [column, (values[index] ?? "").trim()]),
    ) as ParsedRow;

    if (!row.sku) continue;

    const basis = CSV_TO_BASIS[row.price_basis];
    if (!basis) continue;

    const cost = row.supplier_price_kes === "" ? null : Number(row.supplier_price_kes);
    if (cost !== null && !Number.isInteger(cost)) continue;

    const update: Partial<NewItem> = {
      costPrice: cost,
      priceBasis: basis,
      marketCeilingPrice:
        row.price_basis === "MARKET CEILING" && row.retail_price_kes !== ""
          ? Number(row.retail_price_kes)
          : null,
      internalNote: row.notes || null,
    };
    if (row.name) update.name = row.name;

    const result = await db
      .update(items)
      .set(update)
      .where(eq(items.sku, row.sku))
      .returning({ id: items.id });

    changed += result.length;
  }

  return changed;
}

/** Exposed so the item form's category picker matches the CSV's vocabulary. */
export const CSV_VOCABULARY = { csvCategoryToSlug, csvBrandToSlug, itemSlug };

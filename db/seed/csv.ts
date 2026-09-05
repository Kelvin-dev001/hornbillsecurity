/**
 * Reads docs/07-catalog-seed.csv.
 *
 * The file is the owner's own price list and stays the source of truth for the
 * seed, so he can edit a price there and re-run `npm run db:seed` — or, after
 * Sprint 4, edit it in the admin portal instead. Nothing in it is copied into
 * TypeScript.
 *
 * Deliberately not a CSV library. The file has no quoted fields and no embedded
 * commas or newlines, and the parser below asserts that on every row, so a
 * future edit that breaks the assumption fails loudly at seed time rather than
 * silently shifting every column by one.
 */
import { readFileSync } from "node:fs";

export const CATALOG_CSV_PATH = "docs/07-catalog-seed.csv";

export type CatalogRow = {
  sku: string;
  brand: string;
  name: string;
  category: string;
  form_factor: string;
  key_specs: string;
  supplier_price_kes: string;
  retail_price_kes: string;
  price_basis: string;
  notes: string;
  /** 1-based line number in the CSV, for error messages. */
  line: number;
};

const COLUMNS = [
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

export function readCatalogCsv(path = CATALOG_CSV_PATH): CatalogRow[] {
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  const header = lines[0]?.split(",") ?? [];
  if (header.join(",") !== COLUMNS.join(",")) {
    throw new Error(
      `${path} header changed.\n  expected: ${COLUMNS.join(",")}\n  found:    ${header.join(",")}`,
    );
  }

  if (text.includes('"')) {
    throw new Error(
      `${path} now contains a quote character. This reader does not handle quoted ` +
        `fields — either remove the quote or replace the reader with a real CSV parser.`,
    );
  }

  return lines.slice(1).map((line, index) => {
    const fields = line.split(",");
    if (fields.length !== COLUMNS.length) {
      throw new Error(
        `${path} line ${index + 2} has ${fields.length} fields, expected ${COLUMNS.length}. ` +
          `A comma inside a field would do this.\n  ${line}`,
      );
    }

    const row = Object.fromEntries(
      COLUMNS.map((column, position) => [column, fields[position].trim()]),
    ) as Omit<CatalogRow, "line">;

    return { ...row, line: index + 2 };
  });
}

/** "" → null, "13000" → 13000. Throws on anything else. */
export function parseKes(value: string, context: string): number | null {
  if (value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${context}: "${value}" is not a whole number of shillings`);
  }
  return parsed;
}

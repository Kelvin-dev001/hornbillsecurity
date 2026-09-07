import type { QuoteLine } from "@/db/schema";
import type { Bom } from "@/lib/pricing/bom";

/**
 * The frozen snapshot.
 *
 * docs/02: "A quote FREEZES its line prices. A customer must be able to reopen
 * /q/AB12CD next week and see what they were shown."
 *
 * So every line is flattened to text and integers, and deliberately carries no
 * database id and no catalogue link — nothing that could be used to look a price
 * up again later. A renamed product, an unpublished SKU or the owner's monthly
 * price review must not change what somebody was quoted.
 *
 * Pure, and in its own module rather than inside the server-only submit path, so
 * tests can exercise it directly.
 */
export function freezeLines(bom: Bom): QuoteLine[] {
  return bom.lines.map((line) => ({
    kind: line.sku ? "item" : "service",
    sku: line.sku,
    name: line.name,
    spec: line.spec,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    extended: line.extended,
    lineType: line.lineType,
    group: null,
    note: line.note,
  }));
}

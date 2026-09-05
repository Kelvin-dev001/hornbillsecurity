import type { ItemUnit } from "@/db/schema";

/**
 * What a price buys.
 *
 * On a site whose whole claim is that its prices are real, "KES 20,300" against
 * a box of cable means nothing without "per 305 m box". Every price on a listing
 * or an item page carries one of these.
 */
const UNIT_LABELS: Record<ItemUnit, string> = {
  each: "each",
  metre: "per metre",
  roll_305m: "per 305 m box",
  box: "per box",
  length_2m: "per 2 m length",
  coil: "per coil",
  pair: "per pair",
};

export function unitLabel(unit: ItemUnit): string {
  return UNIT_LABELS[unit];
}

/** Short form for a table cell, where the column header already says "unit". */
const UNIT_SHORT: Record<ItemUnit, string> = {
  each: "each",
  metre: "metre",
  roll_305m: "305 m box",
  box: "box",
  length_2m: "2 m length",
  coil: "coil",
  pair: "pair",
};

export function unitShort(unit: ItemUnit): string {
  return UNIT_SHORT[unit];
}

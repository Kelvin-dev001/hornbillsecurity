import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { quotes, type QuoteLine } from "@/db/schema";
import { LINE_TYPE_LABELS } from "@/lib/pricing/bom";
import { isValidQuoteCode, normaliseQuoteCode } from "./code";

/**
 * Reading a saved quote.
 *
 * Everything here comes out of the frozen snapshot and nothing is re-derived
 * from the catalogue — that is the whole promise of /q/[code] (docs/02). If the
 * 4MP bullet is repriced tomorrow, a quote issued today still shows what it
 * showed today.
 */

export type SavedQuoteGroup = {
  lineType: string;
  label: string;
  lines: QuoteLine[];
  subtotal: number;
};

export type SavedQuote = {
  code: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  county: string;
  area: string;
  propertyType: string;
  lines: QuoteLine[];
  groups: SavedQuoteGroup[];
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate: number;
  deposit: number;
  depositPercent: number;
  validUntil: Date;
  createdAt: Date;
  expired: boolean;
};

const GROUP_ORDER = ["primary", "secondary", "consumable", "labour"];

function group(lines: QuoteLine[]): SavedQuoteGroup[] {
  return GROUP_ORDER.map((lineType) => {
    const groupLines = lines.filter((line) => line.lineType === lineType);
    return {
      lineType,
      label: LINE_TYPE_LABELS[lineType as keyof typeof LINE_TYPE_LABELS] ?? "Other",
      lines: groupLines,
      subtotal: groupLines.reduce((sum, line) => sum + line.extended, 0),
    };
  }).filter((entry) => entry.lines.length > 0);
}

/**
 * Includes the customer's phone and email, so it is for the quote page and the
 * PDF only. /q/[code] renders the name and area but never the phone number —
 * the code is a shareable link, and a link that leaks a mobile number is a link
 * somebody will regret forwarding.
 */
export const getQuoteByCode = cache(async (rawCode: string): Promise<SavedQuote | null> => {
  const code = normaliseQuoteCode(rawCode);
  if (!isValidQuoteCode(code)) return null;

  const [row] = await db.select().from(quotes).where(eq(quotes.code, code)).limit(1);
  if (!row) return null;

  const deposit = Math.round((row.total * row.depositPercent) / 100);

  return {
    code: row.code,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    county: row.county,
    area: row.area,
    propertyType: row.propertyType,
    lines: row.lines,
    groups: group(row.lines),
    subtotal: row.subtotal,
    vatAmount: row.vatAmount,
    total: row.total,
    vatRate: Number(row.vatRate),
    deposit,
    depositPercent: row.depositPercent,
    validUntil: row.validUntil,
    createdAt: row.createdAt,
    expired: row.validUntil.getTime() < Date.now(),
  };
});

import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { quotes, type QuoteStatus } from "@/db/schema";

/**
 * The lead pipeline.
 *
 * docs/08 Sprint 4: New → Contacted → Survey booked → Surveyed → Quoted →
 * Won/Lost, with notes and a follow-up date.
 *
 * It runs over the quotes table rather than a separate leads table: a quote a
 * customer submitted already carries their name, number, area, property type and
 * the whole priced bill of materials. A parallel lead record would be a second
 * copy of all of it, drifting from the first.
 */

export const PIPELINE: { status: QuoteStatus; label: string; hint: string }[] = [
  { status: "new", label: "New", hint: "Just came in. Call within 30 minutes." },
  { status: "contacted", label: "Contacted", hint: "Spoken to. Survey not booked yet." },
  { status: "survey_booked", label: "Survey booked", hint: "Date agreed." },
  { status: "surveyed", label: "Surveyed", hint: "Been on site. Findings written up." },
  { status: "quoted", label: "Quoted", hint: "Final figure sent after survey." },
  { status: "won", label: "Won", hint: "Deposit received." },
  { status: "lost", label: "Lost", hint: "Went elsewhere, or went quiet." },
];

export type LeadRow = {
  id: string;
  code: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  county: string;
  area: string;
  propertyType: string;
  total: number;
  status: QuoteStatus;
  source: string;
  notes: string | null;
  followUpAt: Date | null;
  /** Null until a review has been asked for — see lib/admin/review-request.ts. */
  reviewRequestedAt: Date | null;
  createdAt: Date;
  lineCount: number;
};

export async function listLeads(status?: QuoteStatus): Promise<LeadRow[]> {
  const rows = await db
    .select({
      id: quotes.id,
      code: quotes.code,
      customerName: quotes.customerName,
      customerPhone: quotes.customerPhone,
      customerEmail: quotes.customerEmail,
      county: quotes.county,
      area: quotes.area,
      propertyType: quotes.propertyType,
      total: quotes.total,
      status: quotes.status,
      source: quotes.source,
      notes: quotes.notes,
      followUpAt: quotes.followUpAt,
      reviewRequestedAt: quotes.reviewRequestedAt,
      createdAt: quotes.createdAt,
      lineCount: sql<number>`jsonb_array_length(${quotes.lines})::int`,
    })
    .from(quotes)
    .where(status ? eq(quotes.status, status) : undefined)
    .orderBy(desc(quotes.createdAt));

  return rows;
}

export async function pipelineCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: quotes.status, count: sql<number>`count(*)::int` })
    .from(quotes)
    .groupBy(quotes.status);

  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
}

export async function getLead(code: string): Promise<LeadRow | null> {
  const rows = await listLeads();
  return rows.find((row) => row.code === code) ?? null;
}

/** Anything due today or overdue, which is what the overview leads with. */
export async function dueFollowUps(): Promise<LeadRow[]> {
  const rows = await db
    .select({ code: quotes.code })
    .from(quotes)
    .where(
      and(
        sql`${quotes.followUpAt} is not null and ${quotes.followUpAt} <= now()`,
        sql`${quotes.status} not in ('won', 'lost')`,
      ),
    );

  const codes = new Set(rows.map((row) => row.code));
  return (await listLeads()).filter((lead) => codes.has(lead.code));
}

import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/auth";
import { exportItemsCsv } from "@/lib/admin/csv";

/**
 * The item catalogue as CSV, in the same shape as docs/07-catalog-seed.csv.
 *
 * This file carries every distributor cost, so it is as sensitive as the
 * database itself. The session is checked here and not only in middleware: a
 * route handler is reachable directly, and this is the one that would hand the
 * whole cost list to whoever asked.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();
  if (!user) {
    return new NextResponse("Not signed in.", {
      status: 401,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const csv = await exportItemsCsv();
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hornbill-items-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

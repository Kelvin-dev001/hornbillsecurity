import { NextResponse } from "next/server";

import { quotationFilename, renderQuotationPdf } from "@/lib/quote/pdf";
import { getQuoteByCode } from "@/lib/quote/read";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * The quotation PDF, rendered on demand.
 *
 * Rendered rather than stored: the snapshot is frozen, so the document is the
 * same every time it is produced, and generating it on request means there is no
 * file to keep in sync, no storage bucket to secure and nothing to migrate when
 * the letterhead changes.
 *
 * Guarded by the code alone, like the page it belongs to — 32^6 combinations,
 * and getQuoteByCode rejects a malformed one before it reaches the database.
 * `X-Robots-Tag: noindex` for the same reason /q/[code] carries it: this
 * document has a customer's name on it.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const quote = await getQuoteByCode(code);

  if (!quote) {
    return new NextResponse("Quotation not found", {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const settings = await getSiteSettings();
  const pdf = await renderQuotationPdf(quote, settings);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quotationFilename(quote, settings)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

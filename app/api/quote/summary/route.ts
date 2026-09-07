import { NextResponse } from "next/server";

import { priceBasket, readBasketKey, readBasketLines } from "@/lib/quote/basket";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * The basket's line count and running total, for the QuoteBar.
 *
 * The bar is a client component precisely so the rest of the site can stay
 * static, and this is the small hole it reads through. Deliberately thin: two
 * numbers, no line detail, and nothing identifying — the basket is keyed by an
 * httpOnly cookie the browser cannot read, and this response tells a script
 * nothing it could not learn by visiting /quote.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieKey = await readBasketKey();
    if (!cookieKey) {
      return NextResponse.json({ count: 0, total: 0 }, { headers: noStore });
    }

    const settings = await getSiteSettings();
    const lines = await readBasketLines(cookieKey);
    const basket = await priceBasket(lines, Number(settings.vatRate));

    return NextResponse.json(
      { count: basket.lines.length, total: basket.bom.subtotal },
      { headers: noStore },
    );
  } catch (error) {
    console.error("[quote summary]", error);
    return NextResponse.json({ count: 0, total: 0 }, { headers: noStore });
  }
}

const noStore = { "Cache-Control": "no-store" };

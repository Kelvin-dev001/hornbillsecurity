import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { db } from "@/db";
import { siteSettings, type SiteSettings } from "@/db/schema";

export const SITE_SETTINGS_CACHE_TAG = "site-settings";

/**
 * The single source of every business fact on the site.
 *
 * CLAUDE.md §9 and docs/02 §site_settings: none of the WhatsApp number, the
 * address, the M-Pesa paybill, the VAT rate, the response promise or the trust
 * claims may be hardcoded in a component. Every component that needs one calls
 * this. No exceptions.
 *
 * Two layers of caching:
 *   - unstable_cache keeps the row out of the request path across renders and
 *     builds, tagged so the admin portal can revalidate it on save (Sprint 4).
 *   - React cache() dedupes within a single render pass.
 *
 * Throws rather than falling back to defaults. A hardcoded fallback would be
 * exactly the thing the rule exists to prevent, and a page that silently shows
 * the wrong phone number is worse than a page that fails to build.
 */
/**
 * unstable_cache round-trips its payload through JSON, so a Date comes back as
 * an ISO string on a cache hit — and only on a cache hit, which makes it a
 * bug that passes the first request and fails the second. The cached function
 * therefore returns dates as strings *in its type*, and getSiteSettings()
 * rehydrates them. Do not widen this back to Promise<SiteSettings>.
 */
type CachedSiteSettings = Omit<SiteSettings, "pricesUpdatedAt" | "updatedAt"> & {
  pricesUpdatedAt: string;
  updatedAt: string;
};

const loadSiteSettings = unstable_cache(
  async (): Promise<CachedSiteSettings> => {
    const [row] = await db.select().from(siteSettings).limit(1);

    if (!row) {
      throw new Error(
        "site_settings is empty. Run `npm run db:migrate && npm run db:seed`.",
      );
    }

    return {
      ...row,
      pricesUpdatedAt: row.pricesUpdatedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  },
  [SITE_SETTINGS_CACHE_TAG],
  { tags: [SITE_SETTINGS_CACHE_TAG] },
);

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const row = await loadSiteSettings();

  return {
    ...row,
    pricesUpdatedAt: new Date(row.pricesUpdatedAt),
    updatedAt: new Date(row.updatedAt),
  };
});

/** `254759293030` → `+254 759 293 030` for display. */
export function formatPhoneForDisplay(nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, "");
  const match = /^0(\d{3})(\d{3})(\d{3})$/.exec(digits);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : nationalNumber;
}

/**
 * A wa.me deep link with a pre-filled message.
 *
 * docs/04 §WhatsAppFAB: the message is contextual — the model number on an item
 * page, the package name on a solution page, the quote code on /q/[code].
 */
export function whatsappLink(whatsappNumber: string, message?: string): string {
  const number = whatsappNumber.replace(/\D/g, "");
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${number}${query}`;
}

/** `tel:` link from the national number, in E.164. */
export function telLink(nationalNumber: string): string {
  const digits = nationalNumber.replace(/\D/g, "");
  return `tel:+254${digits.replace(/^0/, "")}`;
}

/** numeric(5,2) "16.00" → "16". Trailing zeros read as false precision. */
export function formatVatRate(vatRate: string): string {
  return String(Number(vatRate));
}

/** KES, VAT-exclusive, no decimals — CLAUDE.md §2.6. */
export function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "Prices updated September 2026" — docs/04 §PriceStamp. */
export function formatPricesUpdated(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

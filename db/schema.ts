import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * site_settings — the single row every business fact is read from.
 *
 * docs/02 §site_settings: "Nothing in this list may be hardcoded in a
 * component." That extends to everything here: the WhatsApp number, the M-Pesa
 * paybill, the VAT rate, the response promise, the trust-bar claims. A
 * component that needs one of these calls getSiteSettings() (lib/site-settings.ts).
 *
 * Single-row enforcement: the primary key is a fixed smallint with a CHECK
 * constraint pinning it to 1, so a second row is a database error rather than a
 * silent ambiguity.
 */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: smallint("id").primaryKey().default(1),

    // ── Identity — CLAUDE.md §9 ──────────────────────────────────────────────
    /** Legal entity: Hornbill Technology Solutions Ltd */
    legalName: text("legal_name").notNull(),
    /** Trading division, and the name shown on the site */
    tradingName: text("trading_name").notNull(),
    /** Company registration number */
    companyRegistrationNo: text("company_registration_no").notNull(),
    /** KRA PIN */
    kraPin: text("kra_pin").notNull(),
    /** VAT registered with KRA */
    vatRegistered: boolean("vat_registered").notNull().default(true),

    // ── Contact ──────────────────────────────────────────────────────────────
    /** National format, as displayed: 0759293030 */
    phone: text("phone").notNull(),
    /** E.164 without the +, as wa.me requires: 254759293030 */
    whatsappNumber: text("whatsapp_number").notNull(),
    email: text("email").notNull(),
    /**
     * The Mombasa office address, in components rather than one free-text line.
     *
     * This is the canonical NAP: it must match the Google Business Profile
     * character for character and must never vary afterwards (docs/09 item 3).
     * Structured because schema.org PostalAddress needs the parts separately —
     * a single blob would have forced "Mombasa" and "KE" to be hardcoded in the
     * JSON-LD builder, which is exactly the rule this table exists to enforce.
     *
     * Nullable so no migration has to invent a value; formatAddress() joins
     * whatever is set, and db/seed/site-settings.ts supplies the real thing.
     */
    addressStreet: text("address_street"),
    /** Neighbourhood / landmark, e.g. the area a Mombasa address is known by */
    addressArea: text("address_area"),
    addressLocality: text("address_locality"),
    addressRegion: text("address_region"),
    /** ISO 3166-1 alpha-2, for schema.org */
    addressCountry: text("address_country"),
    /**
     * Nairobi is served on request only and never marketed (CLAUDE.md §1), so
     * this is normally null. It exists because docs/02 lists it.
     */
    addressNairobi: text("address_nairobi"),
    businessHours: text("business_hours").notNull(),
    /** Full promise, e.g. for the contact page */
    responsePromise: text("response_promise").notNull(),
    /** Short form for the trust bar, e.g. "Reply within 30 minutes" */
    responseTimeLabel: text("response_time_label").notNull(),

    // ── Trust bar — docs/04 §Key components ──────────────────────────────────
    /** Hikvision, Dahua, Tiandy */
    authorisedPartnerBrands: text("authorised_partner_brands")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    yearsOperating: smallint("years_operating").notNull(),
    techniciansCount: smallint("technicians_count").notNull(),
    /** Human label for the trust bar, e.g. "Mombasa and the coast" */
    serviceAreaLabel: text("service_area_label").notNull(),
    /** Counties actually served: Mombasa, Kilifi, Kwale */
    serviceCounties: text("service_counties")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    /**
     * docs/09 items 15 and 16 are IN PROGRESS. These stay false until the
     * owner confirms, and no component may claim either while false.
     */
    psraRegistered: boolean("psra_registered").notNull().default(false),
    caRadioLicensed: boolean("ca_radio_licensed").notNull().default(false),

    // ── Commercial terms — CLAUDE.md §5 and §9 ───────────────────────────────
    /** M-Pesa Paybill */
    mpesaPaybill: text("mpesa_paybill").notNull(),
    /** M-Pesa account number */
    mpesaAccount: text("mpesa_account").notNull(),
    /** Percent of the total due before installation begins */
    depositPercent: smallint("deposit_percent").notNull(),
    /** KES, VAT-exclusive. Mandatory, refundable against the final invoice. */
    siteSurveyFee: integer("site_survey_fee").notNull(),
    /** What the survey fee buys — never present it as a bare fee */
    siteSurveyDeliverable: text("site_survey_deliverable").notNull(),
    /** Percent, e.g. 16.00 */
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull(),
    quoteValidityDays: smallint("quote_validity_days").notNull(),
    warrantyMonths: smallint("warranty_months").notNull(),
    /** Notice period to cancel a recurring contract */
    cancellationNoticeMonths: smallint("cancellation_notice_months").notNull(),

    /**
     * Drives the PriceStamp ("Prices updated {Month Year}") and the
     * machine-readable dateModified. The owner sets it on each monthly review.
     */
    pricesUpdatedAt: timestamp("prices_updated_at", { withTimezone: true }).notNull(),

    // ── Social ───────────────────────────────────────────────────────────────
    facebookUrl: text("facebook_url"),
    tiktokUrl: text("tiktok_url"),
    instagramUrl: text("instagram_url"),
    youtubeUrl: text("youtube_url"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("site_settings_singleton", sql`${table.id} = 1`)],
);

export type SiteSettings = typeof siteSettings.$inferSelect;
export type NewSiteSettings = typeof siteSettings.$inferInsert;

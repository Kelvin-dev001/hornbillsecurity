import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  pgView,
  smallint,
  text,
  timestamp,
  uuid,
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

// ═══════════════════════════════════════════════════════════════════════════
//  Sprint 1 — the catalogue layer
//
//  docs/02 §Core principle: "cost_price exists in exactly one place, is
//  readable by exactly one role, and is never in a select list that a public
//  query can reach."
//
//  Four independent layers enforce that, so no single mistake leaks it:
//    1. The public_items VIEW below has no cost_price column at all, so a
//       public query cannot name it and TypeScript cannot type it.
//    2. Column-level GRANTs: the anon and authenticated roles hold SELECT on
//       every items column EXCEPT cost_price, markup_multiplier and
//       internal_note. `select *` through PostgREST fails closed.
//    3. RLS on items restricts the public roles to published rows.
//    4. tests/cost-price-leak.test.ts fetches every public route and asserts
//       no cost value and no cost column name appears in any response body.
//  Layers 2–4 live in db/migrations/0003_catalogue.sql and tests/.
// ═══════════════════════════════════════════════════════════════════════════

/** docs/02 §categories — services get service pages, item groups are filters. */
export const categoryKind = pgEnum("category_kind", ["service", "item_group"]);

/**
 * Where a price came from. This decides whether a row may be published.
 *
 *  distributor       Our own distributor/trade cost. Takes the ×1.40 markup.
 *  market_research   A figure read off a Kenyan reseller or Jumia listing.
 *                    CLAUDE.md §5: never a base to mark up — only a ceiling to
 *                    stay under. Rows on this basis stay unpublished until the
 *                    owner supplies a distributor cost.
 *  owner_sell_price  Already the public price; no markup (docs/01 §7). Stored
 *                    as price_override. Currently fuel monitoring only.
 *  quote_required    No price exists yet. Unpublished.
 *  placeholder       A mock row seeded so the owner can price it from admin
 *                    (docs/09 item 2). Unpublished until he does.
 */
export const priceBasis = pgEnum("price_basis", [
  "distributor",
  "market_research",
  "owner_sell_price",
  "quote_required",
  "placeholder",
]);

/** docs/02 §items — how the SKU is sold. */
export const itemUnit = pgEnum("item_unit", [
  "each",
  "metre",
  "roll_305m",
  "box",
  "length_2m",
  "coil",
  "pair",
]);

/**
 * docs/02 §services lists per_point | per_camera | per_door | per_metre |
 * per_day | fixed. The recurring lines in docs/07-catalog-seed.csv need six
 * more units (AMC per year, cloud recording per camera per month, remote
 * monitoring per month, fuel monitoring and GPS per vehicle, static tank
 * monitoring per tank, training per delegate), so the enum is extended rather
 * than mislabelling them all as `fixed`.
 */
export const servicePricingUnit = pgEnum("service_pricing_unit", [
  "per_point",
  "per_camera",
  "per_door",
  "per_metre",
  "per_day",
  "per_month",
  "per_year",
  "per_camera_per_month",
  "per_vehicle",
  "per_tank",
  "per_delegate",
  "fixed",
]);

/**
 * Postgres full-text search vector. Drizzle has no built-in tsvector type.
 * Never read in TypeScript — it exists for the GIN index and the @@ operator.
 */
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return "tsvector";
  },
});

/** One row of an item's spec table — docs/02 §items, rendered as a real <table>. */
export type ItemSpec = {
  label: string;
  value: string;
  /** Section heading in SpecTable, e.g. "Imaging", "Night vision". */
  group: string;
};

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    kind: categoryKind("kind").notNull(),
    /** lucide-react icon name; resolved through lib/category-icons.ts. */
    icon: text("icon"),
    /** 1–2 lines. Used in cards and as the meta description. */
    summary: text("summary").notNull(),
    /** Long copy for service pages (Sprint 4+). */
    body: text("body"),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("categories_parent_idx").on(table.parentId)],
);

export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  /**
   * Hikvision, Dahua, Tiandy (CLAUDE.md §9). Seeded from
   * site_settings.authorised_partner_brands so the two cannot disagree.
   */
  isAuthorisedPartner: boolean("is_authorised_partner").notNull().default(false),
  logoUrl: text("logo_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The real model number, verbatim: DS-2CD1043G2-LIUF/SL (CLAUDE.md §6). */
    sku: text("sku").notNull().unique(),
    /** brand-sku, slugified: hikvision-ds-2cd1043g2-liuf-sl (docs/03 §2). */
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    /** One factual line. Never the internal note — see internal_note below. */
    shortDescription: text("short_description").notNull(),
    description: text("description"),
    useCases: text("use_cases")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    specs: jsonb("specs")
      .$type<ItemSpec[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // ── Pricing — CLAUDE.md §5, docs/01 §7 ──────────────────────────────────
    /**
     * PRIVATE. Distributor / trade price, VAT-exclusive, KES.
     *
     * Never selected by a public query, never granted to anon or
     * authenticated, absent from public_items. A leaked distributor price
     * destroys the business (CLAUDE.md §2.3).
     */
    costPrice: integer("cost_price"),
    /** Manual public price; wins over the markup formula. */
    priceOverride: integer("price_override"),
    /** The effective price never exceeds this (Jumia is the ceiling). */
    marketCeilingPrice: integer("market_ceiling_price"),
    /** PRIVATE — read beside the public price it reveals the cost. */
    markupMultiplier: numeric("markup_multiplier", { precision: 4, scale: 2 })
      .notNull()
      .default("1.40"),
    /**
     * The public price, computed by the database.
     *
     * Mirrored exactly by effectivePrice() in lib/pricing/effectivePrice.ts;
     * tests/effective-price.test.ts asserts the two agree for every seeded row,
     * so SQL and TypeScript cannot drift.
     *
     * NULL when there is no price at all — which is the case the formula in
     * docs/02 gets wrong: LEAST() ignores NULLs, so the doc's expression would
     * return 2147483647 for a quote-required row. Hence the CASE.
     */
    effectivePrice: integer("effective_price").generatedAlwaysAs(
      sql`(
        case
          when coalesce("price_override", "cost_price") is null then null
          else least(
            coalesce("price_override", (round("cost_price" * "markup_multiplier" / 100.0) * 100)::integer),
            coalesce("market_ceiling_price", 2147483647)
          )
        end
      )`,
    ),
    priceBasis: priceBasis("price_basis").notNull(),
    unit: itemUnit("unit").notNull().default("each"),

    // ── Availability and media ──────────────────────────────────────────────
    inStock: boolean("in_stock").notNull().default(true),
    leadTimeNote: text("lead_time_note"),
    /** null → <PlaceholderImage> (docs/04 §Placeholder image strategy). */
    primaryImageUrl: text("primary_image_url"),
    gallery: text("gallery")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    datasheetUrl: text("datasheet_url"),
    /** Cable, connectors, clips — hidden from headline lists. */
    isConsumable: boolean("is_consumable").notNull().default(false),
    compatibleWith: uuid("compatible_with")
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),
    alternatives: uuid("alternatives")
      .array()
      .notNull()
      .default(sql`ARRAY[]::uuid[]`),

    /**
     * sku weighted A so a model-number query outranks a passing mention of it.
     * The catalogue search also runs an ILIKE on sku and name, because FTS
     * cannot match a partial model number like "1043G2" — see
     * lib/catalog/queries.ts.
     */
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`(
        setweight(to_tsvector('english'::regconfig, coalesce("sku", '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("name", '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce("short_description", '')), 'C') ||
        setweight(to_tsvector('english'::regconfig, coalesce("description", '')), 'D') ||
        setweight(to_tsvector('english'::regconfig, coalesce("specs"::text, '')), 'D')
      )`,
    ),

    /**
     * PRIVATE. The owner's own notes from the price list — "CONFIRM MODEL
     * NUMBER with supplier", "two supplier quotes, using the higher". Working
     * remarks, not copy, and several would embarrass us in public. Excluded
     * from public_items and from the public roles' GRANT.
     */
    internalNote: text("internal_note"),

    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    /**
     * Defaults to false: a row is invisible until something deliberately
     * publishes it, so an unpriced or unverified SKU never reaches the site.
     */
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("items_category_published_idx").on(table.categoryId, table.published),
    index("items_brand_idx").on(table.brandId),
    index("items_search_idx").using("gin", table.searchVector),
    index("items_compatible_with_idx").using("gin", table.compatibleWith),
    check("items_cost_price_non_negative", sql`"cost_price" is null or "cost_price" >= 0`),
    check(
      "items_price_override_non_negative",
      sql`"price_override" is null or "price_override" >= 0`,
    ),
    check(
      "items_market_ceiling_non_negative",
      sql`"market_ceiling_price" is null or "market_ceiling_price" >= 0`,
    ),
    check("items_markup_positive", sql`"markup_multiplier" > 0`),
  ],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    pricingUnit: servicePricingUnit("pricing_unit").notNull(),
    /**
     * Public, VAT-exclusive, KES. Nullable — docs/02 has it NOT NULL, but the
     * recurring lines in the seed CSV are unpriced placeholders, and inventing
     * a figure for them would publish a number the owner never agreed to.
     * Those rows carry price_basis = 'placeholder' and published = false.
     */
    price: integer("price"),
    priceBasis: priceBasis("price_basis").notNull(),
    description: text("description").notNull(),
    inclusions: text("inclusions")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    sortOrder: integer("sort_order").notNull().default(0),
    internalNote: text("internal_note"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("services_category_published_idx").on(table.categoryId, table.published),
    check("services_price_non_negative", sql`"price" is null or "price" >= 0`),
  ],
);

/**
 * pricing_rules — the named constants every BOM quantity is a formula over.
 *
 * docs/01 §6: "cable runs, trunking and labour genuinely vary by site. So we do
 * not hardcode them." Defaults come from that table; the owner tunes them in
 * admin. Sprint 2's formula evaluator resolves keys from here.
 *
 * Deliberately does NOT hold vat_rate: site_settings.vat_rate is the single
 * source for it, and two editable copies of the VAT rate is exactly how a
 * quotation ends up disagreeing with an invoice.
 */
export const pricingRules = pgTable("pricing_rules", {
  key: text("key").primaryKey(),
  value: numeric("value", { precision: 12, scale: 4 }).notNull(),
  unit: text("unit").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  group: text("group").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * media — every uploaded image. alt_text is NOT NULL because docs/02 requires
 * it: "the admin form does not submit without it."
 */
export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  storagePath: text("storage_path").notNull().unique(),
  publicUrl: text("public_url").notNull(),
  altText: text("alt_text").notNull(),
  width: integer("width"),
  height: integer("height"),
  bytes: integer("bytes"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * public_items — the only relation a public query may read items through.
 *
 * Declared `.existing()` because the CREATE VIEW is hand-written in
 * db/migrations/0003_catalogue.sql: it needs `security_invoker = true` so the
 * caller's RLS applies rather than the view owner's, which drizzle-kit will not
 * emit on its own.
 *
 * There is no cost_price, markup_multiplier or internal_note field here, and
 * that is the point — `publicItems.costPrice` does not compile.
 *
 * `price` is the view's alias for items.effective_price: outside the pricing
 * layer there is only one price, and it is public.
 */
export const publicItems = pgView("public_items", {
  id: uuid("id").notNull(),
  sku: text("sku").notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  brandId: uuid("brand_id"),
  categoryId: uuid("category_id").notNull(),
  shortDescription: text("short_description").notNull(),
  description: text("description"),
  useCases: text("use_cases").array().notNull(),
  specs: jsonb("specs").$type<ItemSpec[]>().notNull(),
  price: integer("price").notNull(),
  priceBasis: priceBasis("price_basis").notNull(),
  unit: itemUnit("unit").notNull(),
  inStock: boolean("in_stock").notNull(),
  leadTimeNote: text("lead_time_note"),
  primaryImageUrl: text("primary_image_url"),
  gallery: text("gallery").array().notNull(),
  datasheetUrl: text("datasheet_url"),
  isConsumable: boolean("is_consumable").notNull(),
  compatibleWith: uuid("compatible_with").array().notNull(),
  alternatives: uuid("alternatives").array().notNull(),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}).existing();

// ═══════════════════════════════════════════════════════════════════════════
//  Sprint 2 — solutions and their bills of materials
//
//  docs/01 §3: "Every Solution line shows quantity, unit price and extended
//  price, and totals to one number. That visible arithmetic *is* the product."
//
//  The mechanism that makes it honest is solution_lines.quantity_formula:
//  quantities are expressions over pricing_rules, evaluated server-side by
//  lib/pricing/formula.ts, never literals in a component. Change
//  cable_m_per_camera_residential in admin and every package re-prices.
// ═══════════════════════════════════════════════════════════════════════════

export const solutionTier = pgEnum("solution_tier", ["essential", "standard", "pro"]);

/**
 * docs/01 §3. The split is the point: primary is what the client thinks they
 * are buying, secondary is what the job actually needs and every competitor's
 * quote leaves out, consumable is the small stuff, labour is the human work.
 */
export const solutionLineType = pgEnum("solution_line_type", [
  "primary",
  "secondary",
  "consumable",
  "labour",
]);

export const solutions = pgTable(
  "solutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    tier: solutionTier("tier").notNull(),
    /** home, apartment, shop, office, warehouse, school, estate, farm */
    propertyTypes: text("property_types")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    summary: text("summary").notNull(),
    description: text("description"),
    heroImageUrl: text("hero_image_url"),
    /** Seeds the Solution Builder with this package's shape. */
    isBuilderTemplate: boolean("is_builder_template").notNull().default(false),
    /**
     * The six answers this package is the saved result of — camera count,
     * technology, retention days, property type and so on.
     *
     * A Solution is a builder configuration someone already made, which is why
     * this mirrors quotes.builder_inputs. It is also load-bearing at render
     * time: the quantity formulas are written over `cameras` and the pricing
     * rules, so something has to supply `cameras`, and deriving it by guessing
     * which lines are cameras would break the first time a package mixed two
     * models.
     */
    builderInputs: jsonb("builder_inputs").$type<Record<string, unknown>>(),
    bestFor: text("best_for")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    /**
     * CLAUDE.md §6: "Every Solution states what it is not suitable for. Honesty
     * about limits is the strongest trust signal on the site and the most
     * citable kind of sentence." NOT NULL by intent — a package without one is
     * an incomplete package.
     */
    notSuitableFor: text("not_suitable_for")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    /**
     * Derived totals, VAT-exclusive KES. docs/02 asks for these to be cached on
     * write, and the seed populates them.
     *
     * Public pages do NOT read them. Quantities are formulas evaluated in
     * TypeScript, so no database trigger can recompute these when an item price
     * changes, and docs/02 is right that a stale cache must never be trusted.
     * The whole catalogue is in memory anyway (lib/catalog/queries.ts), so
     * rendering recomputes from live prices and these exist for admin listing
     * and sorting only.
     */
    subtotalItems: integer("subtotal_items"),
    subtotalLabour: integer("subtotal_labour"),
    totalExclVat: integer("total_excl_vat"),

    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    published: boolean("published").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("solutions_category_published_idx").on(table.categoryId, table.published),
  ],
);

export const solutionLines = pgTable(
  "solution_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    solutionId: uuid("solution_id")
      .notNull()
      .references(() => solutions.id, { onDelete: "cascade" }),
    lineType: solutionLineType("line_type").notNull(),
    itemId: uuid("item_id").references(() => items.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "restrict" }),
    /** The evaluated fallback, used when quantity_formula is null. */
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    /**
     * e.g. `ceil(cameras * cable_m_per_camera_residential * cable_wastage_factor / 305)`
     *
     * Evaluated by lib/pricing/formula.ts against pricing_rules and the
     * builder's variables. Never eval() — the allow-list parser is the whole
     * reason this column is safe to have.
     */
    quantityFormula: text("quantity_formula"),
    /** Optional price freeze for a published package. Normally null. */
    unitPriceSnapshot: integer("unit_price_snapshot"),
    /** "Includes 15% slack for drops and re-runs" */
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("solution_lines_solution_idx").on(table.solutionId, table.sortOrder),
    // Exactly one of item_id / service_id, per docs/02.
    check(
      "solution_lines_one_target",
      sql`("item_id" is not null) <> ("service_id" is not null)`,
    ),
    check("solution_lines_quantity_non_negative", sql`"quantity" >= 0`),
  ],
);

export type Solution = typeof solutions.$inferSelect;
export type NewSolution = typeof solutions.$inferInsert;
export type SolutionLine = typeof solutionLines.$inferSelect;
export type NewSolutionLine = typeof solutionLines.$inferInsert;
export type SolutionTier = (typeof solutionTier.enumValues)[number];
export type SolutionLineType = (typeof solutionLineType.enumValues)[number];

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type PublicItem = typeof publicItems.$inferSelect;
export type CategoryKind = (typeof categoryKind.enumValues)[number];
export type PriceBasis = (typeof priceBasis.enumValues)[number];
export type ItemUnit = (typeof itemUnit.enumValues)[number];
export type ServicePricingUnit = (typeof servicePricingUnit.enumValues)[number];

CREATE TYPE "public"."category_kind" AS ENUM('service', 'item_group');--> statement-breakpoint
CREATE TYPE "public"."item_unit" AS ENUM('each', 'metre', 'roll_305m', 'box', 'length_2m', 'coil', 'pair');--> statement-breakpoint
CREATE TYPE "public"."price_basis" AS ENUM('distributor', 'market_research', 'owner_sell_price', 'quote_required', 'placeholder');--> statement-breakpoint
CREATE TYPE "public"."service_pricing_unit" AS ENUM('per_point', 'per_camera', 'per_door', 'per_metre', 'per_day', 'per_month', 'per_year', 'per_camera_per_month', 'per_vehicle', 'per_tank', 'per_delegate', 'fixed');--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"is_authorised_partner" boolean DEFAULT false NOT NULL,
	"logo_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"kind" "category_kind" NOT NULL,
	"icon" text,
	"summary" text NOT NULL,
	"body" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"brand_id" uuid,
	"category_id" uuid NOT NULL,
	"short_description" text NOT NULL,
	"description" text,
	"use_cases" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cost_price" integer,
	"price_override" integer,
	"market_ceiling_price" integer,
	"markup_multiplier" numeric(4, 2) DEFAULT '1.40' NOT NULL,
	"effective_price" integer GENERATED ALWAYS AS ((
        case
          when coalesce("price_override", "cost_price") is null then null
          else least(
            coalesce("price_override", (round("cost_price" * "markup_multiplier" / 100.0) * 100)::integer),
            coalesce("market_ceiling_price", 2147483647)
          )
        end
      )) STORED,
	"price_basis" "price_basis" NOT NULL,
	"unit" "item_unit" DEFAULT 'each' NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL,
	"lead_time_note" text,
	"primary_image_url" text,
	"gallery" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"datasheet_url" text,
	"is_consumable" boolean DEFAULT false NOT NULL,
	"compatible_with" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"alternatives" uuid[] DEFAULT ARRAY[]::uuid[] NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS ((
        setweight(to_tsvector('english'::regconfig, coalesce("sku", '')), 'A') ||
        setweight(to_tsvector('english'::regconfig, coalesce("name", '')), 'B') ||
        setweight(to_tsvector('english'::regconfig, coalesce("short_description", '')), 'C') ||
        setweight(to_tsvector('english'::regconfig, coalesce("description", '')), 'D') ||
        setweight(to_tsvector('english'::regconfig, coalesce("specs"::text, '')), 'D')
      )) STORED,
	"internal_note" text,
	"seo_title" text,
	"seo_description" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_sku_unique" UNIQUE("sku"),
	CONSTRAINT "items_slug_unique" UNIQUE("slug"),
	CONSTRAINT "items_cost_price_non_negative" CHECK ("cost_price" is null or "cost_price" >= 0),
	CONSTRAINT "items_price_override_non_negative" CHECK ("price_override" is null or "price_override" >= 0),
	CONSTRAINT "items_market_ceiling_non_negative" CHECK ("market_ceiling_price" is null or "market_ceiling_price" >= 0),
	CONSTRAINT "items_markup_positive" CHECK ("markup_multiplier" > 0)
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text NOT NULL,
	"alt_text" text NOT NULL,
	"width" integer,
	"height" integer,
	"bytes" integer,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_storage_path_unique" UNIQUE("storage_path")
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"key" text PRIMARY KEY NOT NULL,
	"value" numeric(12, 4) NOT NULL,
	"unit" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"group" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"pricing_unit" "service_pricing_unit" NOT NULL,
	"price" integer,
	"price_basis" "price_basis" NOT NULL,
	"description" text NOT NULL,
	"inclusions" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"internal_note" text,
	"seo_title" text,
	"seo_description" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug"),
	CONSTRAINT "services_price_non_negative" CHECK ("price" is null or "price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "items_category_published_idx" ON "items" USING btree ("category_id","published");--> statement-breakpoint
CREATE INDEX "items_brand_idx" ON "items" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "items_search_idx" ON "items" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "items_compatible_with_idx" ON "items" USING gin ("compatible_with");--> statement-breakpoint
CREATE INDEX "services_category_published_idx" ON "services" USING btree ("category_id","published");--> statement-breakpoint
-- ===========================================================================
--  Hand-written appendix. drizzle-kit generates none of this, and it is the
--  part that actually protects the business: docs/02 §Row Level Security.
--
--  Note that the application's own Drizzle connection is the table owner and
--  therefore BYPASSES every policy below. The layers here defend the PostgREST
--  surface (the anon and authenticated roles); server-side, the guarantee comes
--  from public_items, which has no cost_price column to select.
-- ===========================================================================

-- updated_at triggers, reusing set_updated_at() from 0000_init_site_settings.
CREATE TRIGGER "categories_set_updated_at" BEFORE UPDATE ON "categories"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER "brands_set_updated_at" BEFORE UPDATE ON "brands"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER "items_set_updated_at" BEFORE UPDATE ON "items"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER "services_set_updated_at" BEFORE UPDATE ON "services"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER "pricing_rules_set_updated_at" BEFORE UPDATE ON "pricing_rules"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- Documentation that travels with the database, for anyone in the SQL editor.
COMMENT ON COLUMN "items"."cost_price" IS
  'PRIVATE. Distributor/trade price, VAT-exclusive KES. Never granted to anon or authenticated, never present in public_items. A leaked distributor price destroys the business (CLAUDE.md 2.3).';--> statement-breakpoint
COMMENT ON COLUMN "items"."markup_multiplier" IS
  'PRIVATE. Read beside the public price it reveals cost_price.';--> statement-breakpoint
COMMENT ON COLUMN "items"."internal_note" IS
  'PRIVATE. The owner working notes from the supplier price list. Never rendered.';--> statement-breakpoint
COMMENT ON COLUMN "items"."effective_price" IS
  'The public price. Mirrored by effectivePrice() in lib/pricing/effectivePrice.ts.';--> statement-breakpoint

-- Row Level Security: public roles see published rows only.
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "categories_public_read" ON "categories"
  FOR SELECT TO anon, authenticated USING ("published" = true);--> statement-breakpoint

ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "items_public_read" ON "items"
  FOR SELECT TO anon, authenticated USING ("published" = true);--> statement-breakpoint

ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "services_public_read" ON "services"
  FOR SELECT TO anon, authenticated USING ("published" = true);--> statement-breakpoint

-- Brands, pricing rules and media hold nothing secret. docs/02: "pricing_rules
-- public SELECT -> allowed (they are not secret; the costs are)."
ALTER TABLE "brands" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "brands_public_read" ON "brands"
  FOR SELECT TO anon, authenticated USING (true);--> statement-breakpoint

ALTER TABLE "pricing_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "pricing_rules_public_read" ON "pricing_rules"
  FOR SELECT TO anon, authenticated USING (true);--> statement-breakpoint

ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "media_public_read" ON "media"
  FOR SELECT TO anon, authenticated USING (true);--> statement-breakpoint

-- Writes are an admin-session concern only (Sprint 4).
REVOKE INSERT, UPDATE, DELETE ON "categories" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "brands" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "items" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "services" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "pricing_rules" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "media" FROM anon, authenticated;--> statement-breakpoint

-- Column-level privileges on items. Everything is revoked, then exactly the
-- columns public_items exposes are granted back (plus published, which the
-- view body reads in its WHERE clause). cost_price, markup_multiplier and
-- internal_note are absent, so `select *` through PostgREST fails closed with
-- a permission error rather than succeeding with a leak.
REVOKE ALL ON "items" FROM anon;--> statement-breakpoint
REVOKE ALL ON "items" FROM authenticated;--> statement-breakpoint
GRANT SELECT (
  "id", "sku", "slug", "name", "brand_id", "category_id", "short_description",
  "description", "use_cases", "specs", "effective_price", "price_basis", "unit",
  "in_stock", "lead_time_note", "primary_image_url", "gallery", "datasheet_url",
  "is_consumable", "compatible_with", "alternatives", "seo_title",
  "seo_description", "published", "updated_at"
) ON "items" TO anon, authenticated;--> statement-breakpoint

-- public_items: the only relation a public query may read items through.
--
-- security_invoker = true makes the view run with the CALLER's privileges and
-- RLS, not the owner's. Without it a view owned by postgres would hand anon a
-- clean bypass of the policy above.
--
-- effective_price IS NOT NULL keeps unpriced rows out even if one is published
-- by mistake, which is what lets the app type `price` as non-nullable.
CREATE VIEW "public_items" WITH (security_invoker = true) AS
SELECT
  "id",
  "sku",
  "slug",
  "name",
  "brand_id",
  "category_id",
  "short_description",
  "description",
  "use_cases",
  "specs",
  "effective_price" AS "price",
  "price_basis",
  "unit",
  "in_stock",
  "lead_time_note",
  "primary_image_url",
  "gallery",
  "datasheet_url",
  "is_consumable",
  "compatible_with",
  "alternatives",
  "seo_title",
  "seo_description",
  "updated_at"
FROM "items"
WHERE "published" = true AND "effective_price" IS NOT NULL;--> statement-breakpoint

COMMENT ON VIEW "public_items" IS
  'The only relation a public query may read items through. No cost_price, no markup_multiplier, no internal_note. See CLAUDE.md 2.3.';--> statement-breakpoint
GRANT SELECT ON "public_items" TO anon, authenticated;

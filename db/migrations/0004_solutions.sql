CREATE TYPE "public"."solution_line_type" AS ENUM('primary', 'secondary', 'consumable', 'labour');--> statement-breakpoint
CREATE TYPE "public"."solution_tier" AS ENUM('essential', 'standard', 'pro');--> statement-breakpoint
CREATE TABLE "solution_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solution_id" uuid NOT NULL,
	"line_type" "solution_line_type" NOT NULL,
	"item_id" uuid,
	"service_id" uuid,
	"quantity" numeric(12, 3) NOT NULL,
	"quantity_formula" text,
	"unit_price_snapshot" integer,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solution_lines_one_target" CHECK (("item_id" is not null) <> ("service_id" is not null)),
	CONSTRAINT "solution_lines_quantity_non_negative" CHECK ("quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "solutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"tier" "solution_tier" NOT NULL,
	"property_types" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"summary" text NOT NULL,
	"description" text,
	"hero_image_url" text,
	"is_builder_template" boolean DEFAULT false NOT NULL,
	"best_for" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"not_suitable_for" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"subtotal_items" integer,
	"subtotal_labour" integer,
	"total_excl_vat" integer,
	"seo_title" text,
	"seo_description" text,
	"published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "solutions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "solution_lines" ADD CONSTRAINT "solution_lines_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_lines" ADD CONSTRAINT "solution_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_lines" ADD CONSTRAINT "solution_lines_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solution_lines_solution_idx" ON "solution_lines" USING btree ("solution_id","sort_order");--> statement-breakpoint
CREATE INDEX "solutions_category_published_idx" ON "solutions" USING btree ("category_id","published");--> statement-breakpoint
-- ===========================================================================
--  Hand-written appendix: RLS and triggers for the solutions tables.
--
--  Neither table holds a secret. The BOM's prices are read through
--  public_items, so a solution row exposes nothing a visitor cannot already
--  see on the item page it links to.
-- ===========================================================================

CREATE TRIGGER "solutions_set_updated_at" BEFORE UPDATE ON "solutions"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER "solution_lines_set_updated_at" BEFORE UPDATE ON "solution_lines"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

ALTER TABLE "solutions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "solutions_public_read" ON "solutions"
  FOR SELECT TO anon, authenticated USING ("published" = true);--> statement-breakpoint

-- A line is readable when its solution is. The subquery is why this is not
-- simply USING (true): an unpublished draft package must not leak its BOM.
ALTER TABLE "solution_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "solution_lines_public_read" ON "solution_lines"
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM "solutions"
      WHERE "solutions"."id" = "solution_lines"."solution_id"
        AND "solutions"."published" = true
    )
  );--> statement-breakpoint

REVOKE INSERT, UPDATE, DELETE ON "solutions" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "solution_lines" FROM anon, authenticated;--> statement-breakpoint

COMMENT ON COLUMN "solution_lines"."quantity_formula" IS
  'Expression over pricing_rules keys and builder variables, evaluated by lib/pricing/formula.ts. Never eval().';

CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"group" text DEFAULT 'General' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"county" text NOT NULL,
	"parent_id" uuid,
	"lat" numeric(9, 6),
	"lng" numeric(9, 6),
	"intro" text NOT NULL,
	"local_notes" text NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"body" text NOT NULL,
	"cover_image_url" text,
	"author" text NOT NULL,
	"category" text NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"faq" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"published_at" timestamp with time zone,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"client_name" text,
	"client_named_ok" boolean DEFAULT false NOT NULL,
	"location_id" uuid,
	"category_id" uuid,
	"summary" text NOT NULL,
	"challenge" text,
	"solution" text,
	"outcome" text,
	"images" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"solution_id" uuid,
	"completed_at" timestamp with time zone,
	"published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author" text NOT NULL,
	"role" text,
	"company" text,
	"location_id" uuid,
	"quote" text NOT NULL,
	"rating" smallint,
	"source" text,
	"published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_solution_id_solutions_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "locations_published_idx" ON "locations" USING btree ("published","sort_order");--> statement-breakpoint
CREATE INDEX "posts_published_idx" ON "posts" USING btree ("published","published_at");--> statement-breakpoint
-- ===========================================================================
--  RLS for the content tables. Public read on published rows, admin write.
-- ===========================================================================

CREATE TRIGGER "locations_set_updated_at" BEFORE UPDATE ON "locations"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER "posts_set_updated_at" BEFORE UPDATE ON "posts"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER "projects_set_updated_at" BEFORE UPDATE ON "projects"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "locations_public_read" ON "locations"
  FOR SELECT TO anon, authenticated USING ("published" = true);--> statement-breakpoint

ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "posts_public_read" ON "posts"
  FOR SELECT TO anon, authenticated USING ("published" = true);--> statement-breakpoint

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "projects_public_read" ON "projects"
  FOR SELECT TO anon, authenticated USING ("published" = true);--> statement-breakpoint

ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "testimonials_public_read" ON "testimonials"
  FOR SELECT TO anon, authenticated USING ("published" = true);--> statement-breakpoint

ALTER TABLE "faqs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "faqs_public_read" ON "faqs"
  FOR SELECT TO anon, authenticated USING ("published" = true);--> statement-breakpoint

REVOKE INSERT, UPDATE, DELETE ON "locations" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "posts" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "projects" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "testimonials" FROM anon, authenticated;--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "faqs" FROM anon, authenticated;--> statement-breakpoint

COMMENT ON COLUMN "projects"."client_named_ok" IS
  'Naming a client without written permission turns a reference into a complaint. docs/09 item 22 records the two we hold.';

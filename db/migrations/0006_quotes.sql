CREATE TYPE "public"."quote_source" AS ENUM('builder', 'solution_page', 'item_page', 'manual_admin');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('new', 'contacted', 'survey_booked', 'surveyed', 'quoted', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "quote_baskets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cookie_key" text NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"builder_inputs" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quote_baskets_cookie_key_unique" UNIQUE("cookie_key")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"county" text NOT NULL,
	"area" text NOT NULL,
	"property_type" text NOT NULL,
	"builder_inputs" jsonb,
	"lines" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"vat_amount" integer NOT NULL,
	"total" integer NOT NULL,
	"vat_rate" numeric(5, 2) NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"deposit_percent" smallint NOT NULL,
	"status" "quote_status" DEFAULT 'new' NOT NULL,
	"source" "quote_source" NOT NULL,
	"notes" text,
	"pdf_url" text,
	"submitter_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_code_unique" UNIQUE("code"),
	CONSTRAINT "quotes_totals_non_negative" CHECK ("subtotal" >= 0 and "total" >= 0)
);
--> statement-breakpoint
CREATE INDEX "quote_baskets_expires_idx" ON "quote_baskets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "quotes_status_created_idx" ON "quotes" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "quotes_submitter_idx" ON "quotes" USING btree ("submitter_hash","created_at");--> statement-breakpoint
-- ===========================================================================
--  Hand-written appendix: RLS for the quote tables.
--
--  docs/02 §Row Level Security:
--    quotes public INSERT -> allowed (rate-limited at the edge)
--    quotes public SELECT -> by code only, via an RPC, never a table scan
--
--  A lead list is the most sensitive table on the site after cost prices. Every
--  name, phone number and address in it belongs to someone who asked for a
--  quotation, and a table scan through PostgREST would hand the whole thing to
--  anyone with the anon key — which ships to the browser by design.
-- ===========================================================================

CREATE TRIGGER "quotes_set_updated_at" BEFORE UPDATE ON "quotes"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER "quote_baskets_set_updated_at" BEFORE UPDATE ON "quote_baskets"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "quote_baskets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- No SELECT policy at all, so the public roles can read nothing. The app reads
-- a quote through its own owner connection with an explicit code; PostgREST is
-- given the RPC below and nothing else.
REVOKE ALL ON "quotes" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON "quote_baskets" FROM anon, authenticated;--> statement-breakpoint

/*
 * quote_by_code — the only public read path.
 *
 * SECURITY DEFINER so it can see past RLS, with an explicit column list that
 * omits notes, submitter_hash and the internal status. Guessing a code is
 * 32^6 attempts, and the function returns one row or nothing.
 */
CREATE OR REPLACE FUNCTION public.quote_by_code(quote_code text)
RETURNS TABLE (
  code text,
  customer_name text,
  county text,
  area text,
  property_type text,
  lines jsonb,
  subtotal integer,
  vat_amount integer,
  total integer,
  vat_rate numeric,
  valid_until timestamptz,
  deposit_percent smallint,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT q.code, q.customer_name, q.county, q.area, q.property_type, q.lines,
         q.subtotal, q.vat_amount, q.total, q.vat_rate, q.valid_until,
         q.deposit_percent, q.created_at
  FROM public.quotes q
  WHERE q.code = upper(quote_code)
  LIMIT 1;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.quote_by_code(text) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.quote_by_code(text) TO anon, authenticated;--> statement-breakpoint

COMMENT ON COLUMN "quotes"."lines" IS
  'Frozen snapshot. Never re-derived from the catalogue: reopening a quote must show the prices the customer was given (docs/02).';--> statement-breakpoint
COMMENT ON COLUMN "quotes"."submitter_hash" IS
  'Salted hash of the submitter IP, for rate limiting only. Never the address itself.';

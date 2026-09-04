CREATE TABLE "site_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"legal_name" text NOT NULL,
	"trading_name" text NOT NULL,
	"company_registration_no" text NOT NULL,
	"kra_pin" text NOT NULL,
	"vat_registered" boolean DEFAULT true NOT NULL,
	"phone" text NOT NULL,
	"whatsapp_number" text NOT NULL,
	"email" text NOT NULL,
	"address_mombasa" text NOT NULL,
	"address_nairobi" text,
	"business_hours" text NOT NULL,
	"response_promise" text NOT NULL,
	"response_time_label" text NOT NULL,
	"authorised_partner_brands" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"years_operating" smallint NOT NULL,
	"technicians_count" smallint NOT NULL,
	"service_area_label" text NOT NULL,
	"service_counties" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"psra_registered" boolean DEFAULT false NOT NULL,
	"ca_radio_licensed" boolean DEFAULT false NOT NULL,
	"mpesa_paybill" text NOT NULL,
	"mpesa_account" text NOT NULL,
	"deposit_percent" smallint NOT NULL,
	"site_survey_fee" integer NOT NULL,
	"site_survey_deliverable" text NOT NULL,
	"vat_rate" numeric(5, 2) NOT NULL,
	"quote_validity_days" smallint NOT NULL,
	"warranty_months" smallint NOT NULL,
	"cancellation_notice_months" smallint NOT NULL,
	"prices_updated_at" timestamp with time zone NOT NULL,
	"facebook_url" text,
	"tiktok_url" text,
	"instagram_url" text,
	"youtube_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1)
);
--> statement-breakpoint
-- Row Level Security (docs/02 §Row Level Security).
-- site_settings holds nothing secret — it is the NAP, the terms and the trust
-- claims — so it is world-readable. Writes are admin-only: RLS is on and no
-- write policy exists, so only the service role (which bypasses RLS) can
-- change it. The REVOKE is belt and braces on top of that.
ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "site_settings_public_read" ON "site_settings"
  FOR SELECT TO anon, authenticated USING (true);--> statement-breakpoint
REVOKE INSERT, UPDATE, DELETE ON "site_settings" FROM anon, authenticated;--> statement-breakpoint
-- Keep updated_at honest without relying on the caller.
CREATE OR REPLACE FUNCTION "set_updated_at"() RETURNS trigger AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER "site_settings_set_updated_at"
  BEFORE UPDATE ON "site_settings"
  FOR EACH ROW EXECUTE FUNCTION "set_updated_at"();

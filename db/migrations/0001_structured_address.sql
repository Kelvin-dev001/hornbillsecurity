-- The Mombasa address moves from one free-text line to schema.org components.
-- Nullable on purpose: no migration should invent a business fact, so nothing
-- is backfilled here. db/seed/site-settings.ts supplies the values and remains
-- the only place any of them is written down. 0002 drops the old column.
ALTER TABLE "site_settings" ADD COLUMN "address_street" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "address_area" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "address_locality" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "address_region" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "address_country" text;

ALTER TABLE "brands" ADD COLUMN "is_manufacturer" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- The catch-all every catalogue needs for cable, connectors and clips is not a
-- manufacturer, and must not get a "price list" page of its own.
UPDATE "brands" SET "is_manufacturer" = false WHERE "slug" = 'generic';

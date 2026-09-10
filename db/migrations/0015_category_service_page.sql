ALTER TABLE "categories" ADD COLUMN "service_intro" text;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "service_includes" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "service_not_for" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "service_faq" jsonb DEFAULT '[]'::jsonb NOT NULL;
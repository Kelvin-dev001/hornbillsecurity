ALTER TABLE "posts" ADD COLUMN "seed_owned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- The seven launch articles were written by db/seed/posts.ts and have not been
-- edited by anybody. The previous, broken heuristic (updated_at = created_at)
-- had already marked five of them as edited because the seed's own refresh
-- trips the posts_set_updated_at trigger, so they are reclaimed here by slug.
UPDATE "posts" SET "seed_owned" = true WHERE "slug" IN (
  'cctv-installation-cost-kenya-itemised-bill-of-materials',
  'what-cctv-installation-labour-actually-costs-kenya',
  'analog-vs-ip-cctv-cost-difference-8-camera-job',
  'cctv-kenyan-coast-salt-air-humidity-what-survives',
  'how-to-read-a-cctv-quotation-kenya',
  'cctv-installation-mombasa-prices-coverage',
  'securing-holiday-home-airbnb-south-coast'
);

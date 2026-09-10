-- ===========================================================================
--  The media bucket.
--
--  docs/02 §media: alt text is required on upload, and the admin form does not
--  submit without it. That is enforced in the form and by media.alt_text being
--  NOT NULL; this migration is about where the bytes live.
--
--  Public read, because these are product photographs that appear on the site
--  and next/image has to fetch them. Writes are restricted to a signed-in user,
--  which on this project means the owner (CLAUDE.md §3 — a single admin).
-- ===========================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
--> statement-breakpoint

DROP POLICY IF EXISTS "media_public_read" ON storage.objects;--> statement-breakpoint
CREATE POLICY "media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'media');--> statement-breakpoint

DROP POLICY IF EXISTS "media_admin_write" ON storage.objects;--> statement-breakpoint
CREATE POLICY "media_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');--> statement-breakpoint

DROP POLICY IF EXISTS "media_admin_update" ON storage.objects;--> statement-breakpoint
CREATE POLICY "media_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'media');--> statement-breakpoint

DROP POLICY IF EXISTS "media_admin_delete" ON storage.objects;--> statement-breakpoint
CREATE POLICY "media_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media');

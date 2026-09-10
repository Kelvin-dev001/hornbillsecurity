"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import sharp from "sharp";

import { db } from "@/db";
import { media } from "@/db/schema";
import { assertAdmin } from "./auth";
import { createClient } from "@/lib/supabase/server";
import { revalidateCatalog } from "./revalidate";

/**
 * Image upload.
 *
 * docs/08 Sprint 4: "Image upload to Supabase Storage. Alt text is a required
 * field — the form does not submit without it. Auto-convert to WebP and record
 * dimensions."
 *
 * All three, and each for a reason:
 *
 *   alt text     Required in the form and NOT NULL in the table. An image with
 *                no alt text is invisible to a screen reader and to a crawler,
 *                and "add it later" never happens.
 *   WebP         Most traffic is mid-range Android on metered data (docs/04). A
 *                4 MB phone photograph of an install becomes a few hundred KB,
 *                and the owner does not have to think about it.
 *   dimensions   next/image needs width and height to reserve the space, which
 *                is what stops the page jumping as photographs load.
 */

const MAX_WIDTH = 2000;
const BUCKET = "media";

export async function uploadMediaAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const file = formData.get("file");
  const altText = String(formData.get("altText") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/media?status=Choose+an+image+first.");
  }
  if (altText.length < 3) {
    redirect("/admin/media?status=Alt+text+is+required.+Describe+what+is+in+the+picture.");
  }

  const original = Buffer.from(await file.arrayBuffer());

  // Resize down only — never up. An 800px photograph stays 800px rather than
  // being stretched into a blurry 2000.
  const pipeline = sharp(original).rotate().resize({
    width: MAX_WIDTH,
    withoutEnlargement: true,
  });

  const output = await pipeline.webp({ quality: 82 }).toBuffer();
  const meta = await sharp(output).metadata();

  const storagePath = `${new Date().getFullYear()}/${randomUUID()}.webp`;

  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, output, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    redirect(`/admin/media?status=${encodeURIComponent(`Upload failed: ${error.message}`)}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  await db.insert(media).values({
    storagePath,
    publicUrl,
    altText,
    width: meta.width ?? null,
    height: meta.height ?? null,
    bytes: output.byteLength,
  });

  revalidateCatalog();
  redirect("/admin/media?status=saved");
}

export async function deleteMediaAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/media");

  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) redirect("/admin/media");

  const supabase = await createClient();
  await supabase.storage.from(BUCKET).remove([row.storagePath]);
  await db.delete(media).where(eq(media.id, id));

  revalidateCatalog();
  redirect("/admin/media?status=saved");
}

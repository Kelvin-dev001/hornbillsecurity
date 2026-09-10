import "server-only";

import { desc } from "drizzle-orm";

import { db } from "@/db";
import { media } from "@/db/schema";

/**
 * The image library.
 *
 * Separate from lib/admin/media.ts because that file is "use server", where
 * every export becomes an HTTP-callable endpoint. A read has no business being
 * one.
 */
export async function listMedia() {
  return db.select().from(media).orderBy(desc(media.uploadedAt));
}

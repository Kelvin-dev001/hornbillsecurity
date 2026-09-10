import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { posts, type Post } from "@/db/schema";

/**
 * Admin reads for articles, including unpublished drafts.
 *
 * Separate from lib/admin/post-actions.ts because that file is "use server",
 * where every export becomes an HTTP-callable endpoint. A list of drafts has no
 * business being one.
 */
export async function listPostsForAdmin() {
  return db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      category: posts.category,
      published: posts.published,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .orderBy(desc(posts.updatedAt));
}

export async function getPostForAdmin(id: string): Promise<Post | null> {
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ?? null;
}

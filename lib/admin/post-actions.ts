"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { posts, type FaqEntry, type NewPost } from "@/db/schema";
import { excerptFrom } from "@/lib/content/markdown";
import { slugify } from "@/lib/slug";
import { assertAdmin } from "./auth";
import { revalidateContent } from "./revalidate";

/**
 * Article writes.
 *
 * The one requirement in docs/05 Sprint 4's "done when" that is about content
 * rather than commerce: "the owner adds a product and publishes an article
 * without touching code."
 */

/**
 * The FAQ block, edited as `Question | Answer` a line at a time.
 *
 * docs/02: the faq renders as real Q/A markup and as FAQPage JSON-LD, and
 * docs/03 §3 wants that on the cost articles specifically — those are the pages
 * AI Overviews trigger on roughly 80% of the time.
 */
function parseFaq(value: FormDataEntryValue | null): FaqEntry[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const split = line.indexOf("|");
      if (split === -1) return null;
      const question = line.slice(0, split).trim();
      const answer = line.slice(split + 1).trim();
      return question && answer ? { question, answer } : null;
    })
    .filter((entry): entry is FaqEntry => entry !== null);
}

export async function savePostAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");

  if (!title) {
    redirect(id ? `/admin/posts/${id}?status=A+title+is+required.` : "/admin/posts/new?status=A+title+is+required.");
  }

  const publish = formData.get("published") === "on";
  const slug = String(formData.get("slug") ?? "").trim() || slugify(title);

  const values: Partial<NewPost> = {
    slug,
    title,
    body,
    // A blank excerpt is filled from the opening of the article rather than
    // left empty — it is the card subtitle and the meta description, and an
    // empty one is a page that looks broken in a search result.
    excerpt: String(formData.get("excerpt") ?? "").trim() || excerptFrom(body),
    category: String(formData.get("category") ?? "Guides").trim(),
    author: String(formData.get("author") ?? "").trim() || "Hornbill",
    coverImageUrl: String(formData.get("coverImageUrl") ?? "").trim() || null,
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    faq: parseFaq(formData.get("faq")),
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
    published: publish,
    // Saving an article hands it to the owner: from here on `npm run db:seed`
    // leaves it alone, even if the seed still carries a version of it.
    seedOwned: false,
  };

  if (id) {
    const [existing] = await db
      .select({ publishedAt: posts.publishedAt })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    // publishedAt is set once, the first time it goes live. Re-stamping it on
    // every save would make an article that was edited today look new, and
    // docs/03 §3 asks for honest datePublished and dateModified.
    await db
      .update(posts)
      .set({
        ...values,
        publishedAt: publish ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
      })
      .where(eq(posts.id, id));

    revalidateContent();
    redirect(`/admin/posts/${id}?status=saved`);
  }

  const [created] = await db
    .insert(posts)
    .values({ ...values, publishedAt: publish ? new Date() : null } as NewPost)
    .returning({ id: posts.id });

  revalidateContent();
  redirect(`/admin/posts/${created.id}?status=saved`);
}

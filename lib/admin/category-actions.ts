"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, type FaqEntry, type NewCategory } from "@/db/schema";
import { assertAdmin } from "./auth";
import { revalidateCatalog } from "./revalidate";

/**
 * Service-page copy, edited by the owner.
 *
 * The thirteen service lines in docs/05 Sprint 6 each get a page, and the copy
 * lives on the category row rather than in a component so this exists at all —
 * CLAUDE.md's principle that the owner changes what the site says without
 * touching code. These are the pages most likely to need correcting as he reads
 * them back, because they are the ones written about work I have not done.
 *
 * The "not for" list is required. CLAUDE.md §6 treats honesty about limits as
 * the strongest trust signal on the site, and on several of these lines it is
 * the only thing on the page a competitor would not also claim — so the form
 * will not save a service page without one.
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

const lines = (form: FormData, name: string): string[] =>
  String(form.get(name) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export async function saveCategoryAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/categories");

  const back = `/admin/categories/${id}`;
  const name = String(formData.get("name") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();

  if (!name) redirect(`${back}?status=A+name+is+required.`);
  if (!summary) redirect(`${back}?status=A+summary+is+required.`);

  const intro = String(formData.get("serviceIntro") ?? "").trim();
  const notFor = lines(formData, "serviceNotFor");

  // Only enforced once a service page exists. A category with no intro is an
  // item group in the catalogue and has no service page to be honest on.
  if (intro && notFor.length === 0) {
    redirect(
      `${back}?status=Say+what+this+is+not+for.+It+is+the+most+trusted+thing+on+the+page.`,
    );
  }

  const values: Partial<NewCategory> = {
    name,
    summary,
    serviceIntro: intro || null,
    serviceIncludes: lines(formData, "serviceIncludes"),
    serviceNotFor: notFor,
    serviceFaq: parseFaq(formData.get("serviceFaq")),
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
    updatedAt: new Date(),
  };

  await db.update(categories).set(values).where(eq(categories.id, id));

  revalidateCatalog();
  redirect(`${back}?status=saved`);
}

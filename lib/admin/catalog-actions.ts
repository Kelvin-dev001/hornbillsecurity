"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { services, solutions } from "@/db/schema";
import { assertAdmin } from "./auth";
import { revalidateCatalog } from "./revalidate";

/**
 * Services and packages.
 *
 * Neither editor touches a bill of materials. The seventeen packages are
 * generated from lib/pricing/cctv.ts and their lines are formulas over
 * pricing_rules — so the way to change what a package contains is to change a
 * rule (Quantity rules) or a price (Items), and every package re-prices. Editing
 * a line by hand here would produce a package that no longer agrees with the
 * builder, which is the one thing Sprint 2 was built to prevent.
 *
 * What the owner does need to change is the copy and whether it is live, and
 * that is what these do.
 */

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function saveSolutionAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/solutions");

  const notSuitableFor = lines(formData.get("notSuitableFor"));
  if (notSuitableFor.length === 0) {
    // CLAUDE.md §6 — every Solution states what it is not suitable for. It is
    // the strongest trust signal on the site and the most citable kind of
    // sentence, so the form will not let it be emptied.
    redirect(`/admin/solutions/${id}?status=Say+what+this+is+NOT+right+for.+That+line+is+why+people+believe+the+rest.`);
  }

  await db
    .update(solutions)
    .set({
      name: String(formData.get("name") ?? "").trim(),
      summary: String(formData.get("summary") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      bestFor: lines(formData.get("bestFor")),
      notSuitableFor,
      heroImageUrl: String(formData.get("heroImageUrl") ?? "").trim() || null,
      seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
      seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
      published: formData.get("published") === "on",
    })
    .where(eq(solutions.id, id));

  revalidateCatalog();
  redirect(`/admin/solutions/${id}?status=saved`);
}

export async function saveServiceAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/services");

  const rawPrice = String(formData.get("price") ?? "").trim();
  const price = rawPrice === "" ? null : Math.round(Number(rawPrice));

  await db
    .update(services)
    .set({
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      inclusions: lines(formData.get("inclusions")),
      price: price !== null && Number.isFinite(price) && price >= 0 ? price : null,
      priceBasis: String(formData.get("priceBasis") ?? "owner_sell_price") as never,
      published: formData.get("published") === "on",
    })
    .where(eq(services.id, id));

  revalidateCatalog();
  redirect("/admin/services?status=saved");
}

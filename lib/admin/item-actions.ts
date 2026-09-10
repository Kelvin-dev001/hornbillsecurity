"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { items, type ItemSpec, type NewItem } from "@/db/schema";
import { assertAdmin } from "./auth";
import { revalidateCatalog } from "./revalidate";

/**
 * Item writes.
 *
 * Every action asserts the session first. middleware.ts and the admin layout
 * both gate the pages, but a server action has its own URL and can be invoked
 * without ever loading one — so the check that matters is the one in the action.
 */

function optionalInt(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * The spec table, edited as `Group | Label | Value` a line at a time.
 *
 * A jsonb editor would be the "proper" answer and the owner would never use it.
 * Three fields on a line is something he can type on a phone, and a malformed
 * line is skipped rather than throwing away the rest of the table.
 */
function parseSpecs(value: FormDataEntryValue | null): ItemSpec[] {
  return lines(value)
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 3 && parts[1] && parts[2])
    .map(([group, label, ...rest]) => ({ group, label, value: rest.join(" | ") }));
}

export async function saveItemAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  if (!sku) redirect(id ? `/admin/items/${id}?status=A+model+number+is+required.` : "/admin/items");

  const values: Partial<NewItem> = {
    sku,
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    categoryId: String(formData.get("categoryId") ?? ""),
    brandId: String(formData.get("brandId") ?? "") || null,
    shortDescription: String(formData.get("shortDescription") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    useCases: lines(formData.get("useCases")),
    specs: parseSpecs(formData.get("specs")),
    costPrice: optionalInt(formData.get("costPrice")),
    priceOverride: optionalInt(formData.get("priceOverride")),
    marketCeilingPrice: optionalInt(formData.get("marketCeilingPrice")),
    markupMultiplier: String(formData.get("markupMultiplier") ?? "1.40"),
    priceBasis: String(formData.get("priceBasis") ?? "distributor") as NewItem["priceBasis"],
    unit: String(formData.get("unit") ?? "each") as NewItem["unit"],
    inStock: formData.get("inStock") === "on",
    isConsumable: formData.get("isConsumable") === "on",
    leadTimeNote: String(formData.get("leadTimeNote") ?? "").trim() || null,
    primaryImageUrl: String(formData.get("primaryImageUrl") ?? "").trim() || null,
    datasheetUrl: String(formData.get("datasheetUrl") ?? "").trim() || null,
    internalNote: String(formData.get("internalNote") ?? "").trim() || null,
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
    published: formData.get("published") === "on",
  };

  if (id) {
    await db.update(items).set(values).where(eq(items.id, id));
  } else {
    const [created] = await db
      .insert(items)
      .values(values as NewItem)
      .returning({ id: items.id });
    revalidateCatalog();
    redirect(`/admin/items/${created.id}?status=saved`);
  }

  revalidateCatalog();
  revalidatePath(`/admin/items/${id}`);
  redirect(`/admin/items/${id}?status=saved`);
}

/**
 * Publish and unpublish from the list, without opening the item.
 *
 * The monthly review is mostly this and the bulk price tool, and making the
 * owner open a form to flip one switch is how a review stops happening.
 */
export async function togglePublishedAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  const next = formData.get("published") === "on";
  if (!id) redirect("/admin/items");

  await db.update(items).set({ published: next }).where(eq(items.id, id));
  revalidateCatalog();
  redirect(String(formData.get("returnTo") ?? "/admin/items"));
}

/**
 * Deleting is deliberately not offered.
 *
 * An item can be referenced by a solution_line and, more importantly, by the
 * frozen lines of a quotation that has already gone to a customer. Unpublishing
 * takes it off the site and leaves the history intact, which is what "delete"
 * usually means here anyway.
 */
export async function unpublishItemAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/items");

  await db.update(items).set({ published: false }).where(eq(items.id, id));
  revalidateCatalog();
  redirect("/admin/items?status=saved");
}

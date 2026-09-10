"use server";

import { redirect } from "next/navigation";

import { assertAdmin } from "./auth";
import { applyImport } from "./csv";
import { revalidateCatalog } from "./revalidate";

/**
 * Commits a CSV import that has already been previewed.
 *
 * The text is posted back with the confirmation rather than re-read from an
 * upload, so what is applied is byte for byte what produced the report the owner
 * approved.
 */
export async function applyImportAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const text = String(formData.get("csv") ?? "");
  if (!text.trim()) redirect("/admin/items/import?status=Nothing+to+import.");

  const changed = await applyImport(text);
  revalidateCatalog();

  redirect(`/admin/items/import?status=saved&changed=${changed}`);
}

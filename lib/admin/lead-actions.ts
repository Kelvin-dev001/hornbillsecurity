"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { quotes, type QuoteStatus } from "@/db/schema";
import { assertAdmin } from "./auth";

/**
 * Moving a lead along the pipeline, and the note that says why.
 *
 * Nothing here revalidates the public site: a lead's status and notes are
 * internal, and /q/[code] shows the frozen quotation regardless of what the
 * pipeline says about it.
 */
export async function updateLeadAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/admin/leads");

  const status = String(formData.get("status") ?? "new") as QuoteStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const followUpRaw = String(formData.get("followUpAt") ?? "").trim();

  await db
    .update(quotes)
    .set({
      status,
      notes,
      followUpAt: followUpRaw ? new Date(`${followUpRaw}T09:00:00+03:00`) : null,
    })
    .where(eq(quotes.code, code));

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${code}`);
  redirect(`/admin/leads/${code}?status=saved`);
}

/** One-click advance from the list, for the common case. */
export async function setLeadStatusAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const code = String(formData.get("code") ?? "").trim();
  const status = String(formData.get("status") ?? "") as QuoteStatus;
  if (!code || !status) redirect("/admin/leads");

  await db.update(quotes).set({ status }).where(eq(quotes.code, code));
  revalidatePath("/admin/leads");
  redirect(String(formData.get("returnTo") ?? "/admin/leads"));
}

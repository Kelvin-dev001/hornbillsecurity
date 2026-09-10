"use server";

import { redirect } from "next/navigation";

import { assertAdmin } from "./auth";
import { applyAdjustment, stampPriceReview } from "./price-review";
import { revalidateEverything } from "./revalidate";

/**
 * Commits a previewed price adjustment.
 *
 * The changes arrive as the exact rows that were on screen, not as a filter to
 * re-run. Between previewing and committing the catalogue may have changed, and
 * a bulk price change that quietly includes something the owner never saw is
 * precisely the mistake the preview exists to prevent.
 */
export async function applyAdjustmentAction(formData: FormData): Promise<void> {
  await assertAdmin();

  let changes: { id: string; costAfter: number }[];
  try {
    const parsed = JSON.parse(String(formData.get("changes") ?? "[]"));
    if (!Array.isArray(parsed)) throw new Error("not a list");

    changes = parsed
      .filter(
        (change): change is { id: string; costAfter: number } =>
          typeof change?.id === "string" &&
          Number.isFinite(change?.costAfter) &&
          change.costAfter >= 0,
      )
      .map((change) => ({ id: change.id, costAfter: Math.round(change.costAfter) }));
  } catch {
    redirect("/admin/prices?status=That+preview+could+not+be+read.+Preview+again.");
  }

  if (changes.length === 0) {
    redirect("/admin/prices?status=Nothing+to+apply.");
  }

  await applyAdjustment(changes);

  // docs/01 §7: the review updates prices_updated_at, which drives the visible
  // stamp and every dateModified. A price change without the stamp makes the
  // site claim figures are older than they are.
  await stampPriceReview();

  revalidateEverything();
  redirect(`/admin/prices?status=saved`);
}

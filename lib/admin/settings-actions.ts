"use server";

import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { pricingRules, siteSettings } from "@/db/schema";
import { assertAdmin } from "./auth";
import { revalidateCatalog, revalidateEverything } from "./revalidate";

/**
 * The two tables the owner edits that change the whole site.
 *
 * pricing_rules drives every BOM quantity, so one number here re-prices all
 * seventeen packages and every builder result (docs/01 §6). site_settings holds
 * every business fact — the address, the paybill, the VAT rate, the response
 * promise — and CLAUDE.md §9 forbids any of them appearing anywhere else.
 */

export async function savePricingRulesAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const rules = await db.select({ key: pricingRules.key }).from(pricingRules).orderBy(asc(pricingRules.key));

  for (const rule of rules) {
    const raw = String(formData.get(`rule:${rule.key}`) ?? "").trim();
    if (raw === "") continue;

    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) continue;

    await db
      .update(pricingRules)
      .set({ value: String(value) })
      .where(eq(pricingRules.key, rule.key));
  }

  revalidateCatalog();
  redirect("/admin/rules?status=saved");
}

export async function saveSiteSettingsAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const optional = (name: string) => text(name) || null;
  const int = (name: string, fallback: number) => {
    const value = Number(text(name));
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : fallback;
  };

  const [current] = await db.select().from(siteSettings).limit(1);
  if (!current) redirect("/admin/settings?status=No+settings+row+to+update.");

  await db.update(siteSettings).set({
    legalName: text("legalName") || current.legalName,
    tradingName: text("tradingName") || current.tradingName,
    companyRegistrationNo: text("companyRegistrationNo") || current.companyRegistrationNo,
    kraPin: text("kraPin") || current.kraPin,
    phone: text("phone") || current.phone,
    whatsappNumber: text("whatsappNumber") || current.whatsappNumber,
    email: text("email") || current.email,
    addressStreet: optional("addressStreet"),
    addressArea: optional("addressArea"),
    addressLocality: optional("addressLocality"),
    addressRegion: optional("addressRegion"),
    addressCountry: optional("addressCountry"),
    businessHours: text("businessHours") || current.businessHours,
    responsePromise: text("responsePromise") || current.responsePromise,
    responseTimeLabel: text("responseTimeLabel") || current.responseTimeLabel,
    yearsOperating: int("yearsOperating", current.yearsOperating),
    techniciansCount: int("techniciansCount", current.techniciansCount),
    serviceAreaLabel: text("serviceAreaLabel") || current.serviceAreaLabel,
    mpesaPaybill: text("mpesaPaybill") || current.mpesaPaybill,
    mpesaAccount: text("mpesaAccount") || current.mpesaAccount,
    depositPercent: int("depositPercent", current.depositPercent),
    siteSurveyFee: int("siteSurveyFee", current.siteSurveyFee),
    siteSurveyDeliverable: text("siteSurveyDeliverable") || current.siteSurveyDeliverable,
    vatRate: text("vatRate") || current.vatRate,
    quoteValidityDays: int("quoteValidityDays", current.quoteValidityDays),
    warrantyMonths: int("warrantyMonths", current.warrantyMonths),
    cancellationNoticeMonths: int("cancellationNoticeMonths", current.cancellationNoticeMonths),
    facebookUrl: optional("facebookUrl"),
    instagramUrl: optional("instagramUrl"),
    tiktokUrl: optional("tiktokUrl"),
    youtubeUrl: optional("youtubeUrl"),
    // docs/09 items 15 and 16 are IN PROGRESS. These stay off until the owner
    // ticks them, and no component may claim either while false.
    psraRegistered: formData.get("psraRegistered") === "on",
    caRadioLicensed: formData.get("caRadioLicensed") === "on",
  });

  revalidateEverything();
  redirect("/admin/settings?status=saved");
}

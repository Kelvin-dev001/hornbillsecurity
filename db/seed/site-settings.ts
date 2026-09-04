import type { NewSiteSettings } from "../schema";

/**
 * The real business facts, from CLAUDE.md §9.
 *
 * This file is the ONLY place in the codebase where any of these values
 * appears. Everything else — header, footer, WhatsApp FAB, trust bar, JSON-LD,
 * quotation PDF — reads them back out of the database through
 * getSiteSettings(). Seeding is a one-time write; after that the owner edits
 * them from the admin portal.
 */
export const siteSettingsSeed: NewSiteSettings = {
  id: 1,

  // Identity
  legalName: "Hornbill Technology Solutions Ltd",
  tradingName: "Hornbill Smart Security Services",
  companyRegistrationNo: "PVT-ZE187R28",
  kraPin: "P052483952K",
  vatRegistered: true,

  // Contact
  phone: "0759293030",
  whatsappNumber: "254759293030",
  email: "security@hornbilltech.co.ke",
  // The canonical NAP (docs/09 item 3, confirmed 2026-09-04). These five values
  // must match the Google Business Profile character for character, and must
  // not vary once the listing is verified — changing them later splits the
  // local-SEO signal. Renders as "Hilltop, Mwembe Tayari, Mombasa".
  addressStreet: "Hilltop",
  addressArea: "Mwembe Tayari",
  addressLocality: "Mombasa",
  addressRegion: "Mombasa County",
  addressCountry: "KE",
  // Nairobi is served on request only and is never marketed — CLAUDE.md §1.
  addressNairobi: null,
  businessHours: "Mon–Sat 8am–6pm",
  responsePromise: "We reply within 30 minutes, Mon–Sat 8am–6pm.",
  responseTimeLabel: "Reply within 30 minutes",

  // Trust bar
  authorisedPartnerBrands: ["Hikvision", "Dahua", "Tiandy"],
  yearsOperating: 5,
  techniciansCount: 5,
  serviceAreaLabel: "Mombasa and the coast",
  serviceCounties: ["Mombasa", "Kilifi", "Kwale"],
  // docs/09 items 15 and 16 are IN PROGRESS. Both stay false until the owner
  // confirms they are held — CLAUDE.md §9 forbids claiming either before then.
  psraRegistered: false,
  caRadioLicensed: false,

  // Commercial terms
  mpesaPaybill: "222111",
  mpesaAccount: "3033552",
  depositPercent: 50,
  siteSurveyFee: 1000,
  siteSurveyDeliverable:
    "A written findings report and marked-up camera positions. The fee is credited to your final invoice.",
  vatRate: "16.00",
  quoteValidityDays: 30,
  warrantyMonths: 12,
  cancellationNoticeMonths: 3,

  // Placeholder until the owner runs the first monthly price review from the
  // admin portal. The catalogue seed lands in Sprint 1.
  pricesUpdatedAt: new Date("2026-09-01T00:00:00.000Z"),

  // Social
  facebookUrl: "https://facebook.com/cctv.people",
  tiktokUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
};

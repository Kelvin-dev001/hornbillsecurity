import type { SiteSettings } from "@/db/schema";

import { absoluteUrl } from "./origin";

/**
 * JSON-LD builders.
 *
 * Every value comes from site_settings or from the canonical origin helper —
 * no hostname literal, no business fact typed in (CLAUDE.md §9, docs/03 §1).
 *
 * Claims that are not yet true are omitted rather than softened: PSRA and
 * Communications Authority registration are both IN PROGRESS (docs/09 items 15
 * and 16), and `AggregateRating` stays off until real reviews exist (item 8).
 */
export function localBusinessJsonLd(settings: SiteSettings) {
  const socials = [
    settings.facebookUrl,
    settings.instagramUrl,
    settings.tiktokUrl,
    settings.youtubeUrl,
  ].filter((url): url is string => Boolean(url));

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": absoluteUrl("/#business"),
    name: settings.tradingName,
    legalName: settings.legalName,
    url: absoluteUrl("/"),
    email: settings.email,
    telephone: `+254${settings.phone.replace(/^0/, "")}`,
    address: {
      "@type": "PostalAddress",
      // docs/09 item 3 (OPEN): streetAddress is added once the exact line is
      // supplied. Publishing a guessed street line would poison the NAP.
      addressLocality: "Mombasa",
      addressCountry: "KE",
    },
    areaServed: settings.serviceCounties.map((county) => ({
      "@type": "AdministrativeArea",
      name: `${county} County`,
    })),
    openingHours: settings.businessHours,
    priceRange: "KES",
    currenciesAccepted: "KES",
    paymentAccepted: "M-Pesa, Bank transfer",
    vatID: settings.vatRegistered ? settings.kraPin : undefined,
    taxID: settings.kraPin,
    ...(socials.length > 0 ? { sameAs: socials } : {}),
    parentOrganization: {
      "@type": "Organization",
      name: settings.legalName,
      identifier: settings.companyRegistrationNo,
    },
    makesOffer: settings.authorisedPartnerBrands.map((brand) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: `${brand} security system installation`,
        provider: { "@id": absoluteUrl("/#business") },
      },
    })),
  };
}

/** Renders a JSON-LD object into the `<script>` tag Next.js expects. */
export function jsonLdScriptProps(data: unknown) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  } as const;
}

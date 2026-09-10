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
    // Every part comes from site_settings, so the structured address here, the
    // footer line and the Google Business Profile cannot drift apart.
    address: {
      "@type": "PostalAddress",
      ...(settings.addressStreet
        ? {
            streetAddress: [settings.addressStreet, settings.addressArea]
              .filter(Boolean)
              .join(", "),
          }
        : {}),
      ...(settings.addressLocality ? { addressLocality: settings.addressLocality } : {}),
      ...(settings.addressRegion ? { addressRegion: settings.addressRegion } : {}),
      ...(settings.addressCountry ? { addressCountry: settings.addressCountry } : {}),
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

/**
 * Product + Offer for an item page — docs/03 §3.
 *
 * `sku` and `mpn` both carry the true model number, because that is the string
 * people search and the one an answer engine needs to match a query to a page.
 *
 * The price is VAT-exclusive, and says so: schema.org has no "excluding tax"
 * flag on `price`, so a PriceSpecification with valueAddedTaxIncluded: false
 * sits alongside it. Without that, a crawler reads our figure as VAT-inclusive
 * and we appear 16% cheaper than we are.
 *
 * `priceValidUntil` is the end of the month after the last price review, which
 * is exactly as long as the owner's monthly review cycle promises and no longer.
 */
export function productJsonLd(options: {
  item: {
    sku: string;
    slug: string;
    name: string;
    shortDescription: string;
    description: string | null;
    price: number;
    inStock: boolean;
    primaryImageUrl: string | null;
    brand: { name: string } | null;
    category: { name: string };
  };
  settings: SiteSettings;
}) {
  const { item, settings } = options;
  const url = absoluteUrl(`/catalog/item/${item.slug}`);

  const reviewed = settings.pricesUpdatedAt;
  const validUntil = new Date(
    Date.UTC(reviewed.getUTCFullYear(), reviewed.getUTCMonth() + 2, 0),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: item.name,
    sku: item.sku,
    mpn: item.sku,
    category: item.category.name,
    description: item.description ?? item.shortDescription,
    url,
    ...(item.primaryImageUrl ? { image: item.primaryImageUrl } : {}),
    ...(item.brand ? { brand: { "@type": "Brand", name: item.brand.name } } : {}),
    offers: {
      "@type": "Offer",
      url,
      price: item.price,
      priceCurrency: "KES",
      priceValidUntil: validUntil.toISOString().slice(0, 10),
      availability: item.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/BackOrder",
      itemCondition: "https://schema.org/NewCondition",
      priceSpecification: {
        "@type": "PriceSpecification",
        price: item.price,
        priceCurrency: "KES",
        valueAddedTaxIncluded: false,
      },
      seller: { "@id": absoluteUrl("/#business") },
    },
  };
}

/** BreadcrumbList — docs/03 §3 wants one on every page. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  };
}

/**
 * ItemList of Product/Offer for a listing page — docs/03 §3 for the price list
 * and, by the same argument, for a catalogue page that publishes a full priced
 * table. Kept to name, model, price and URL: the detail belongs on the item page,
 * and a listing that restates all of it just makes the page bigger.
 */
export function itemListJsonLd(options: {
  name: string;
  path: string;
  items: { sku: string; slug: string; name: string; price: number }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: options.name,
    url: absoluteUrl(options.path),
    numberOfItems: options.items.length,
    itemListElement: options.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: item.name,
        sku: item.sku,
        mpn: item.sku,
        url: absoluteUrl(`/catalog/item/${item.slug}`),
        offers: {
          "@type": "Offer",
          price: item.price,
          priceCurrency: "KES",
          priceSpecification: {
            "@type": "PriceSpecification",
            price: item.price,
            priceCurrency: "KES",
            valueAddedTaxIncluded: false,
          },
        },
      },
    })),
  };
}

/**
 * A packaged system: Product + Offer, with the BOM as an ItemList.
 *
 * docs/03 §3 asks for exactly this shape on a solution page. The ItemList is
 * the part with no equivalent anywhere else in this market — a machine-readable
 * bill of materials with a unit price on every line — and it is the reason a
 * cost query has something citable to land on.
 *
 * `AggregateRating` is deliberately absent until real reviews exist (docs/09
 * item 8). Fabricating it is a policy violation and is easily caught.
 */
export function solutionJsonLd(options: {
  solution: {
    slug: string;
    name: string;
    summary: string;
    description: string | null;
    total: number;
    bom: {
      lines: { sku: string | null; name: string; quantity: number; unitPrice: number }[];
      vatRate: number;
    };
  };
  settings: SiteSettings;
}) {
  const { solution, settings } = options;
  const url = absoluteUrl(`/solutions/${solution.slug}`);

  const reviewed = settings.pricesUpdatedAt;
  const validUntil = new Date(Date.UTC(reviewed.getUTCFullYear(), reviewed.getUTCMonth() + 2, 0));

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#solution`,
    name: solution.name,
    description: solution.description ?? solution.summary,
    url,
    category: "CCTV installation",
    brand: { "@type": "Brand", name: settings.tradingName },
    offers: {
      "@type": "Offer",
      url,
      price: solution.total,
      priceCurrency: "KES",
      priceValidUntil: validUntil.toISOString().slice(0, 10),
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "PriceSpecification",
        price: solution.total,
        priceCurrency: "KES",
        valueAddedTaxIncluded: false,
      },
      seller: { "@id": absoluteUrl("/#business") },
    },
    isRelatedTo: {
      "@type": "ItemList",
      name: `${solution.name} bill of materials`,
      numberOfItems: solution.bom.lines.length,
      itemListElement: solution.bom.lines.map((line, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: line.name,
        ...(line.sku ? { item: { "@type": "Product", name: line.name, sku: line.sku, mpn: line.sku } } : {}),
      })),
    },
  };
}

/**
 * Article — docs/03 §3 wants honest datePublished and dateModified.
 *
 * "Honest" is doing work there: publishedAt is stamped once, the first time an
 * article goes live, and never moved again, so an edit does not make a
 * two-year-old guide claim to be new.
 */
export function articleJsonLd(options: {
  post: {
    slug: string;
    title: string;
    excerpt: string;
    author: string;
    coverImageUrl: string | null;
    publishedAt: string | null;
    updatedAt: string;
  };
  settings: SiteSettings;
}) {
  const { post, settings } = options;
  const url = absoluteUrl(`/blog/${post.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    url,
    ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: post.author || settings.tradingName },
    publisher: {
      "@type": "Organization",
      name: settings.tradingName,
      "@id": absoluteUrl("/#business"),
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

/**
 * FAQPage.
 *
 * docs/03 §3 asks for it on the cost pages, and docs/03 §0 explains why those
 * in particular: AI Overviews appear on roughly 80% of cost and pricing queries,
 * and this is the shape they lift an answer out of.
 */
export function faqJsonLd(entries: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

/**
 * A location, as a service area rather than a second business.
 *
 * docs/03 §3 wants LocalBusiness with areaServed on the location pages. It
 * points at the one business @id rather than declaring a new one per town —
 * eleven LocalBusiness entities for one company in Mombasa is exactly the kind
 * of thing that gets an entity ignored.
 */
export function serviceAreaJsonLd(options: {
  location: { slug: string; name: string; county: string; intro: string; lat: number | null; lng: number | null };
  settings: SiteSettings;
  servicePath: string;
  serviceName: string;
}) {
  const { location, settings, servicePath, serviceName } = options;

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${serviceName} in ${location.name}`,
    description: location.intro,
    url: absoluteUrl(servicePath),
    serviceType: serviceName,
    provider: {
      "@type": "HomeAndConstructionBusiness",
      "@id": absoluteUrl("/#business"),
      name: settings.tradingName,
      telephone: `+254${settings.phone.replace(/^0/, "")}`,
    },
    areaServed: {
      "@type": "Place",
      name: `${location.name}, ${location.county} County, Kenya`,
      ...(location.lat !== null && location.lng !== null
        ? { geo: { "@type": "GeoCoordinates", latitude: location.lat, longitude: location.lng } }
        : {}),
    },
  };
}

/**
 * Service + Offer with a real price — docs/03 §3.
 *
 * "Almost nobody in Kenya emits a valid Offer with a real price for an
 * *installation service*, because almost nobody publishes one. That is free
 * distinctiveness."
 *
 * Same VAT handling as productJsonLd: schema.org has no excluding-tax flag on
 * `price`, so the PriceSpecification carries valueAddedTaxIncluded: false.
 * Without it a crawler reads our figures as VAT-inclusive and we look 16%
 * cheaper than we are.
 */
export function serviceJsonLd(options: {
  name: string;
  description: string;
  path: string;
  settings: SiteSettings;
  areaServed?: { name: string; county: string }[];
  offers: { name: string; price: number; url: string; unit?: string }[];
}) {
  const { name, description, path, settings, areaServed, offers } = options;
  const url = absoluteUrl(path);

  const reviewed = settings.pricesUpdatedAt;
  const validUntil = new Date(
    Date.UTC(reviewed.getUTCFullYear(), reviewed.getUTCMonth() + 2, 0),
  )
    .toISOString()
    .slice(0, 10);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name,
    description,
    url,
    serviceType: name,
    provider: {
      "@type": "HomeAndConstructionBusiness",
      "@id": absoluteUrl("/#business"),
      name: settings.tradingName,
      telephone: `+254${settings.phone.replace(/^0/, "")}`,
    },
    areaServed: (areaServed ?? settings.serviceCounties.map((county) => ({ name: county, county })))
      .map((area) => ({
        "@type": "Place",
        name: area.name === area.county ? `${area.county} County, Kenya` : `${area.name}, ${area.county} County, Kenya`,
      })),
    offers: offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      url: absoluteUrl(offer.url),
      price: offer.price,
      priceCurrency: "KES",
      priceValidUntil: validUntil,
      availability: "https://schema.org/InStock",
      ...(offer.unit ? { eligibleQuantity: { "@type": "QuantitativeValue", unitText: offer.unit } } : {}),
      priceSpecification: {
        "@type": "PriceSpecification",
        price: offer.price,
        priceCurrency: "KES",
        valueAddedTaxIncluded: false,
      },
      seller: { "@id": absoluteUrl("/#business") },
    })),
  };
}

/**
 * WebSite with a SearchAction — docs/03 §3, home page.
 *
 * The target is the real catalogue search, so a sitelinks search box (if one is
 * ever granted) lands somewhere that works rather than on a query string the
 * app ignores.
 */
export function websiteJsonLd(settings: SiteSettings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: settings.tradingName,
    url: absoluteUrl("/"),
    inLanguage: "en-KE",
    publisher: { "@id": absoluteUrl("/#business") },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/catalog")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

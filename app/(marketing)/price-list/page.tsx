import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PriceStamp } from "@/components/price-stamp";
import { Button } from "@/components/ui/button";
import { unitShort } from "@/lib/catalog/format";
import { brandFacets, getCatalogLastModified, listItems } from "@/lib/catalog/queries";
import { getPublicServices, serviceUnitPhrase } from "@/lib/catalog/services";
import { formatKes } from "@/lib/money";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  itemListJsonLd,
  jsonLdScriptProps,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * /price-list — every published price on one page.
 *
 * docs/03 §4 Tier 1 item 5: "Hikvision Price List Kenya 2026 — Every Model,
 * Updated Monthly. `cctv camera price in kenya today` is verified; freshness is
 * the moat." This is that page for the whole catalogue, with the per-brand cut
 * at /price-list/[brand].
 *
 * Real <table> elements, server-rendered, with the date stamp visible and
 * machine-readable. CLAUDE.md §2.2 and §2.6.
 *
 * Page weight: the catalogue is around a hundred rows, so the whole thing is
 * well inside the 4MB fetch limit in CLAUDE.md §2.4. If it grows past a few
 * thousand it splits by category, not by pagination — a paginated price list is
 * a price list nothing can quote.
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "Price list", path: "/price-list" },
];

const FAQ = [
  {
    question: "Are these prices current?",
    answer:
      "They are reviewed monthly and the page carries the date of the last review. Kenyan CCTV pricing moves with the shilling and with shipping, so a price list without a date on it is not a price list.",
  },
  {
    question: "Do the prices include VAT?",
    answer:
      "No. Every figure on this site is VAT-exclusive, which is how quotations in this market are written. VAT at 16% is added on the invoice and is shown separately on any quote we send you.",
  },
  {
    question: "Can I buy just the equipment?",
    answer:
      "The catalogue is here so you can check our numbers and build a system that adds up. What we sell is the installed system — half the faults we are called out to fix are bad terminations on kit somebody bought over the counter.",
  },
  {
    question: "Why is your price on some smart-home items close to Jumia?",
    answer:
      "Because it should be. On consumer smart-home and solar items the dealer-to-Jumia spread is thin, and marking those up the way you would mark up professional kit would put us above the price you can check in thirty seconds. We take the thin margin on the hardware and price the installation and app setup as a visible line instead.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const year = settings.pricesUpdatedAt.getUTCFullYear();

  return {
    title: `CCTV and security equipment price list Kenya ${year}`,
    description: `Every model we supply, with its price, updated monthly. Hikvision, Dahua, Tiandy, EZVIZ and Uniview. KES, VAT-exclusive, ${settings.serviceAreaLabel}.`,
    alternates: { canonical: absoluteUrl("/price-list") },
  };
}

export default async function PriceListPage() {
  const [settings, { items }, services, lastModified] = await Promise.all([
    getSiteSettings(),
    listItems(),
    getPublicServices(),
    getCatalogLastModified(),
  ]);

  const brands = brandFacets(items, { manufacturersOnly: true }).filter(
    (facet) => facet.count >= 3,
  );

  // Grouped by category, in the order the catalogue already sorts them.
  const groups = new Map<string, { name: string; slug: string; items: typeof items }>();
  for (const item of [...items].sort((a, b) => a.name.localeCompare(b.name))) {
    const key = item.category.slug;
    const existing = groups.get(key);
    if (existing) existing.items.push(item);
    else groups.set(key, { name: item.category.name, slug: key, items: [item] });
  }
  const sections = [...groups.values()].sort((a, b) => b.items.length - a.items.length);

  const pricedServices = services.filter((service) => service.price !== null);

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      <script
        {...jsonLdScriptProps(
          itemListJsonLd({
            name: `Security equipment price list, ${settings.serviceAreaLabel}`,
            path: "/price-list",
            items,
          }),
        )}
      />
      <script {...jsonLdScriptProps(faqJsonLd(FAQ))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            Price list
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every model we supply, with its price. {items.length} items and{" "}
            {pricedServices.length} published labour rates, reviewed monthly. No &ldquo;call for
            price&rdquo;, no ranges, no login.
          </p>
          <PriceStamp settings={settings} className="mt-4" />
          {lastModified ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Catalogue last changed{" "}
              <time dateTime={lastModified}>
                {new Intl.DateTimeFormat("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Africa/Nairobi",
                }).format(new Date(lastModified))}
              </time>
              .
            </p>
          ) : null}
        </header>

        {brands.length > 0 ? (
          <nav className="mt-8" aria-label="Price list by brand">
            <h2 className="text-sm font-medium text-ink">By brand</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {brands.map((brand) => (
                <li key={brand.key}>
                  <Link
                    href={`/price-list/${brand.key}`}
                    className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                  >
                    {brand.label} ({brand.count})
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <nav className="mt-6" aria-label="Jump to a category">
          <ul className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <li key={section.slug}>
                <a
                  href={`#${section.slug}`}
                  className="inline-flex h-9 items-center rounded-pill bg-paper-warm px-3 text-sm text-ink transition-colors hover:bg-ink/5"
                >
                  {section.name} ({section.items.length})
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {sections.map((section) => (
          <section key={section.slug} id={section.slug} className="mt-12 scroll-mt-24">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-semibold text-ink">{section.name}</h2>
              <Link
                href={`/catalog/${section.slug}`}
                className="text-sm text-action underline underline-offset-4"
              >
                Specs and detail →
              </Link>
            </div>

            <div className="mt-3 overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-[44rem] border-collapse text-sm">
                <caption className="sr-only">
                  {section.name} prices, KES excluding {settings.vatRate}% VAT
                </caption>
                <thead>
                  <tr className="border-b border-line bg-paper-warm text-left">
                    <th scope="col" className="p-3 font-semibold text-ink">
                      Model
                    </th>
                    <th scope="col" className="p-3 font-semibold text-ink">
                      Description
                    </th>
                    <th scope="col" className="p-3 font-semibold text-ink">
                      Brand
                    </th>
                    <th scope="col" className="p-3 font-semibold text-ink">
                      Unit
                    </th>
                    <th scope="col" className="p-3 text-right font-semibold text-ink">
                      Price (KES)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-paper">
                  {section.items.map((item) => (
                    <tr key={item.slug}>
                      {/*
                        The model number in full, as its own cell. CLAUDE.md §6:
                        "DS-2CD1043G2-LIUF/SL … that exact string is an
                        uncontested search query."
                      */}
                      <th scope="row" className="p-3 text-left font-medium text-ink">
                        <Link
                          href={`/catalog/item/${item.slug}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {item.sku}
                        </Link>
                      </th>
                      <td className="p-3 text-muted-foreground">{item.name}</td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {item.brand?.name ?? "—"}
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {unitShort(item.unit)}
                      </td>
                      <td className="p-3 text-right font-medium text-ink tabular-nums">
                        {formatKes(item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <section className="mt-14" id="labour">
          <h2 className="font-display text-xl font-semibold text-ink">Labour and services</h2>
          <div className="mt-3 overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <caption className="sr-only">
                Published labour rates, KES excluding {settings.vatRate}% VAT
              </caption>
              <thead>
                <tr className="border-b border-line bg-paper-warm text-left">
                  <th scope="col" className="p-3 font-semibold text-ink">
                    Service
                  </th>
                  <th scope="col" className="p-3 font-semibold text-ink">
                    Charged
                  </th>
                  <th scope="col" className="p-3 text-right font-semibold text-ink">
                    Rate (KES)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-paper">
                {pricedServices.map((service) => (
                  <tr key={service.slug}>
                    <th scope="row" className="p-3 text-left font-medium text-ink">
                      {service.name}
                    </th>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {serviceUnitPhrase(service.pricingUnit)}
                    </td>
                    <td className="p-3 text-right font-medium text-ink tabular-nums">
                      {formatKes(service.price as number)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14 max-w-(--container-prose)" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-xl font-semibold text-ink">
            About these prices
          </h2>
          <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-paper">
            {FAQ.map((entry) => (
              <div key={entry.question} className="p-5">
                <dt className="font-display font-semibold text-ink">{entry.question}</dt>
                <dd className="mt-2 text-muted-foreground">{entry.answer}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href="/build/cctv">Build a system from these prices</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  "Hello Hornbill. I was looking at your price list and have a question.",
                )}
              >
                Ask a question
              </a>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

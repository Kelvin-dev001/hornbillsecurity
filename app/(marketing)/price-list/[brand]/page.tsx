import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PriceStamp } from "@/components/price-stamp";
import { Button } from "@/components/ui/button";
import { unitShort } from "@/lib/catalog/format";
import { brandFacets, listItems } from "@/lib/catalog/queries";
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
 * /price-list/[brand] — docs/03 §4 Tier 1, item 5.
 *
 * "Hikvision Price List Kenya 2026 — Every Model, Updated Monthly." The query
 * `hikvision price list kenya` is verified and the incumbents answer it with a
 * PDF from 2022 or a contact form. Freshness is the whole moat, so the review
 * date is at the top and in the structured data.
 *
 * Only brands with at least three published models get a page; two rows is a
 * thin page and there is no reason to publish one.
 */
export const revalidate = 3600;

const MIN_MODELS = 3;

async function brandsWithPages() {
  const { items } = await listItems();
  return brandFacets(items, { manufacturersOnly: true }).filter(
    (facet) => facet.count >= MIN_MODELS,
  );
}

export async function generateStaticParams() {
  const brands = await brandsWithPages();
  return brands.map((brand) => ({ brand: brand.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand: slug } = await params;
  const [settings, brands] = await Promise.all([getSiteSettings(), brandsWithPages()]);
  const brand = brands.find((entry) => entry.key === slug);
  if (!brand) return {};

  const year = settings.pricesUpdatedAt.getUTCFullYear();

  return {
    title: `${brand.label} price list Kenya ${year} — every model, updated monthly`,
    description: `Current ${brand.label} prices in Kenya: ${brand.count} models with the full part number against each one. KES, VAT-exclusive, installed on the coast.`,
    alternates: { canonical: absoluteUrl(`/price-list/${brand.key}`) },
  };
}

export default async function BrandPriceListPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand: slug } = await params;
  const [settings, brands, all] = await Promise.all([
    getSiteSettings(),
    brandsWithPages(),
    listItems({ brandSlug: slug }),
  ]);

  const brand = brands.find((entry) => entry.key === slug);
  if (!brand) notFound();

  const items = [...all.items].sort(
    (a, b) => a.category.name.localeCompare(b.category.name) || a.price - b.price,
  );

  const trail = [
    { name: "Home", path: "/" },
    { name: "Price list", path: "/price-list" },
    { name: brand.label, path: `/price-list/${brand.key}` },
  ];

  const cheapest = Math.min(...items.map((item) => item.price));
  const dearest = Math.max(...items.map((item) => item.price));

  const faq = [
    {
      question: `How much does a ${brand.label} camera cost in Kenya?`,
      answer: `Our published ${brand.label} prices run from ${formatKes(cheapest)} to ${formatKes(dearest)}, VAT-exclusive, depending on the model. The table on this page carries the full part number against each price, so you can check it against any other quote you have.`,
    },
    {
      question: `Are you an authorised ${brand.label} dealer?`,
      answer: settings.authorisedPartnerBrands.includes(brand.label)
        ? `Yes. ${brand.label} is one of our authorised partner brands, which matters mainly for warranty: a claim goes through the distributor rather than being your problem.`
        : `We supply ${brand.label} but our authorised partnerships are with ${settings.authorisedPartnerBrands.join(", ")}. Everything we sell is genuine stock through Kenyan distribution, and we will tell you which channel a particular item comes through if you ask.`,
    },
    {
      question: "Is installation included in these prices?",
      answer:
        "No — these are equipment prices. Labour is published separately on our services page, and every packaged system on this site shows equipment and labour as separate lines so you can see which is which.",
    },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      <script
        {...jsonLdScriptProps(
          itemListJsonLd({
            name: `${brand.label} price list, Kenya`,
            path: `/price-list/${brand.key}`,
            items,
          }),
        )}
      />
      <script {...jsonLdScriptProps(faqJsonLd(faq))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            {brand.label} price list
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {items.length} models, {formatKes(cheapest)} to {formatKes(dearest)}, with the full
            part number against each one. Reviewed monthly — a price list without a date on it is
            not a price list.
          </p>
          <PriceStamp settings={settings} className="mt-4" />
        </header>

        <div className="mt-8 overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <caption className="sr-only">
              {brand.label} prices, KES excluding {settings.vatRate}% VAT
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
                  Category
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
              {items.map((item) => (
                <tr key={item.slug}>
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
                    {item.category.name}
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

        <nav className="mt-6" aria-label="Other brands">
          <ul className="flex flex-wrap gap-2">
            {brands
              .filter((other) => other.key !== brand.key)
              .map((other) => (
                <li key={other.key}>
                  <Link
                    href={`/price-list/${other.key}`}
                    className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                  >
                    {other.label}
                  </Link>
                </li>
              ))}
            <li>
              <Link
                href="/price-list"
                className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
              >
                Everything
              </Link>
            </li>
          </ul>
        </nav>

        <section className="mt-14 max-w-(--container-prose)" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-xl font-semibold text-ink">
            Questions people ask
          </h2>
          <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-paper">
            {faq.map((entry) => (
              <div key={entry.question} className="p-5">
                <dt className="font-display font-semibold text-ink">{entry.question}</dt>
                <dd className="mt-2 text-muted-foreground">{entry.answer}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href="/build/cctv">Build a system</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  `Hello Hornbill. I'd like a quote for ${brand.label} equipment.`,
                )}
              >
                Ask on WhatsApp
              </a>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

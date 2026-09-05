import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Phone, ShieldCheck } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ItemCard } from "@/components/catalog/item-card";
import { PlaceholderImage } from "@/components/catalog/placeholder-image";
import { SpecTable } from "@/components/catalog/spec-table";
import { PriceStamp } from "@/components/price-stamp";
import { Button } from "@/components/ui/button";
import { unitLabel } from "@/lib/catalog/format";
import { getAllCategories, getAllItemSlugs, getItemBySlug } from "@/lib/catalog/queries";
import { breadcrumbJsonLd, jsonLdScriptProps, productJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { formatKes, formatPhoneForDisplay, getSiteSettings, telLink, whatsappLink } from "@/lib/site-settings";

/**
 * /catalog/item/[slug] — one SKU, statically generated.
 *
 * The model number appears in full, in mono, three times over: as the heading's
 * companion, in the spec table, and in the JSON-LD as both sku and mpn.
 * CLAUDE.md §6 is the reason — `DS-2CD1043G2-LIUF/SL` is an uncontested search
 * query, and this is the page that should answer it.
 *
 * Every commercial CTA lands in WhatsApp with the model number pre-filled
 * (CLAUDE.md §2.5). There is no cart: clients buy installed solutions.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllItemSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItemBySlug(slug);
  if (!item) return {};

  const settings = await getSiteSettings();

  return {
    title: item.seoTitle ?? `${item.sku} — ${item.name} price in Mombasa`,
    description:
      item.seoDescription ??
      `${item.name} (${item.sku}): ${formatKes(item.price)} ${unitLabel(item.unit)}, ` +
        `VAT-exclusive. ${item.shortDescription}. Supplied and installed by ` +
        `${settings.tradingName} across ${settings.serviceAreaLabel}.`,
    alternates: { canonical: absoluteUrl(`/catalog/item/${item.slug}`) },
  };
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [item, settings, categories] = await Promise.all([
    getItemBySlug(slug),
    getSiteSettings(),
    getAllCategories(),
  ]);

  if (!item) notFound();

  const parent = item.category.parentSlug
    ? (categories.find((c) => c.slug === item.category.parentSlug) ?? null)
    : null;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Catalogue", path: "/catalog" },
    ...(parent ? [{ name: parent.name, path: `/catalog/${parent.slug}` }] : []),
    { name: item.category.name, path: `/catalog/${item.category.slug}` },
    { name: item.sku, path: `/catalog/item/${item.slug}` },
  ];

  const enquiry =
    `Hello Hornbill. I'd like a quote that includes ${item.name} (${item.sku}) — ` +
    `listed at ${formatKes(item.price)} ${unitLabel(item.unit)}.`;

  return (
    <>
      <script {...jsonLdScriptProps(productJsonLd({ item, settings }))} />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
          <div className="min-w-0">
            <header>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {item.brand ? (
                  <Link
                    href={`/catalog/${item.category.slug}?brand=${item.brand.slug}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {item.brand.name}
                  </Link>
                ) : null}
                {item.brand?.isAuthorisedPartner ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Authorised partner
                  </span>
                ) : null}
              </p>

              <h1 className="mt-2 text-3xl font-semibold text-balance text-ink sm:text-4xl">
                {item.name}
              </h1>
              <p className="mt-3 font-mono text-sm tracking-tight text-action">{item.sku}</p>
              <p className="mt-4 text-lg text-muted-foreground">{item.shortDescription}</p>
            </header>

            <div className="mt-8 max-w-lg lg:hidden">
              {item.primaryImageUrl ? (
                <Image
                  src={item.primaryImageUrl}
                  alt={item.name}
                  width={640}
                  height={480}
                  className="aspect-[4/3] w-full rounded-card object-cover"
                />
              ) : (
                <PlaceholderImage sku={item.sku} categoryIcon={item.category.icon} />
              )}
            </div>

            {item.description ? (
              <div className="mt-8 max-w-(--container-prose) text-base text-muted-foreground">
                {item.description}
              </div>
            ) : null}

            {item.useCases.length > 0 ? (
              <section className="mt-10" aria-labelledby="use-cases">
                <h2 id="use-cases" className="font-display text-xl font-semibold text-ink">
                  Where this one goes
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {item.useCases.map((useCase) => (
                    <li
                      key={useCase}
                      className="rounded-pill border border-line bg-paper-warm px-3 py-1 text-sm text-ink"
                    >
                      {useCase}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mt-10" aria-labelledby="specification">
              <h2 id="specification" className="font-display text-xl font-semibold text-ink">
                Specification
              </h2>
              <div className="mt-4">
                <SpecTable specs={item.specs} />
              </div>
              {item.datasheetUrl ? (
                <p className="mt-3">
                  <a
                    href={item.datasheetUrl}
                    className="inline-flex items-center gap-1.5 text-sm text-action hover:underline"
                  >
                    <FileText className="size-4" aria-hidden="true" />
                    Manufacturer datasheet
                  </a>
                </p>
              ) : null}
            </section>

            {item.worksWith.length > 0 ? (
              <section className="mt-12" aria-labelledby="works-with">
                <h2 id="works-with" className="font-display text-xl font-semibold text-ink">
                  Works with
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  What this needs alongside it to be a working system.
                </p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {item.worksWith.slice(0, 6).map((related) => (
                    <li key={related.id}>
                      <ItemCard item={related} />
                    </li>
                  ))}
                </ul>
                {item.worksWith.length > 6 ? (
                  <p className="mt-4 text-sm">
                    <Link href={`/catalog/${item.category.slug}`} className="text-action hover:underline">
                      See all {item.category.name.toLowerCase()} and what pairs with them
                    </Link>
                  </p>
                ) : null}
              </section>
            ) : null}

            {item.alternatives.length > 0 ? (
              <section className="mt-12" aria-labelledby="alternatives">
                <h2 id="alternatives" className="font-display text-xl font-semibold text-ink">
                  Similar options
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nearest prices in {item.category.name.toLowerCase()}, cheaper and dearer.
                </p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {item.alternatives.map((related) => (
                    <li key={related.id}>
                      <ItemCard item={related} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="hidden lg:block">
              {item.primaryImageUrl ? (
                <Image
                  src={item.primaryImageUrl}
                  alt={item.name}
                  width={640}
                  height={480}
                  className="aspect-[4/3] w-full rounded-card object-cover"
                />
              ) : (
                <PlaceholderImage sku={item.sku} categoryIcon={item.category.icon} />
              )}
            </div>

            <div className="mt-6 rounded-card border border-line bg-paper-warm p-5">
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-semibold text-ink tabular-nums">
                  {formatKes(item.price)}
                </span>
                <span className="text-sm text-muted-foreground">{unitLabel(item.unit)}</span>
              </p>
              <PriceStamp settings={settings} className="mt-2 text-xs" />

              <p className="mt-4 text-sm text-muted-foreground">
                {[
                  item.inStock ? "In stock." : "Available to order.",
                  item.leadTimeNote,
                  "Installation, configuration and commissioning are quoted separately — that is what we actually sell.",
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>

              <div className="mt-5 flex flex-col gap-2">
                <Button asChild size="cta">
                  <a href={whatsappLink(settings.whatsappNumber, enquiry)}>
                    Ask about this on WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="cta">
                  <a href={telLink(settings.phone)}>
                    <Phone aria-hidden="true" />
                    {formatPhoneForDisplay(settings.phone)}
                  </a>
                </Button>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">{settings.responsePromise}</p>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Building a whole system?{" "}
              <Link href={`/catalog/${item.category.slug}`} className="text-action hover:underline">
                Compare everything in {item.category.name.toLowerCase()}
              </Link>
              .
            </p>
          </aside>
        </div>
      </div>

      {/* docs/04 wants the FAB's pre-filled message to name the model number
          here. The FAB lives in the root layout so it cannot be missed on any
          page, and a layout in Next.js cannot read the page's data — so the
          model-number message is on the sidebar CTA above, which is the more
          prominent of the two anyway. When the quote basket arrives in Sprint 3
          it brings a client-side context the FAB can read, and the pre-fill
          becomes contextual everywhere. */}
    </>
  );
}

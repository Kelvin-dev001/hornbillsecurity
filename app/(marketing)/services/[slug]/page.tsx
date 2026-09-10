import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Phone, X } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PriceStamp } from "@/components/price-stamp";
import { Button } from "@/components/ui/button";
import { unitShort } from "@/lib/catalog/format";
import { listItems } from "@/lib/catalog/queries";
import {
  getPublicServices,
  getServiceLineBySlug,
  getServiceLines,
  serviceUnitPhrase,
} from "@/lib/catalog/services";
import { getLocations } from "@/lib/content/queries";
import { formatKes } from "@/lib/money";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  jsonLdScriptProps,
  serviceJsonLd,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { formatPhoneForDisplay, getSiteSettings, telLink, whatsappLink } from "@/lib/site-settings";

/**
 * /services/[slug] — one page per service line, from docs/05 Sprint 6.
 *
 * The CCTV line has its own hand-written page at /services/cctv-installation
 * because it carries the packages and is the commercial centre of the site, so
 * the `cctv` category is excluded here and next.config.ts redirects
 * /services/cctv to it. Everything else renders from this one route.
 *
 * The important behaviour is what happens on a line with nothing priced yet,
 * which is most of them until the owner supplies distributor prices (docs/09
 * items 2 and 34). The page shows the copy, the honest limits and the FAQ, and
 * says plainly that prices are not published for this line — it does not invent
 * a figure, and it does not pretend the line does not exist. docs/08 Sprint 6:
 * "do not publish market-research estimates as our prices."
 */
export const revalidate = 3600;

/** The CCTV line's page is written by hand; this route covers the rest. */
const HAS_ITS_OWN_PAGE = ["cctv"];

export async function generateStaticParams() {
  const lines = await getServiceLines();
  return lines
    .filter((line) => !HAS_ITS_OWN_PAGE.includes(line.slug))
    .map((line) => ({ slug: line.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const line = await getServiceLineBySlug(slug);
  if (!line) return {};

  const settings = await getSiteSettings();

  return {
    title: line.seoTitle ?? `${line.name} in ${settings.serviceAreaLabel}`,
    description: line.seoDescription ?? `${line.intro.slice(0, 155)}…`,
    alternates: { canonical: absoluteUrl(`/services/${line.slug}`) },
  };
}

export default async function ServiceLinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const line = await getServiceLineBySlug(slug);
  if (!line || HAS_ITS_OWN_PAGE.includes(slug)) notFound();

  const [settings, catalogue, allServices, locations, lines] = await Promise.all([
    getSiteSettings(),
    listItems({ categorySlug: slug }),
    getPublicServices(),
    getLocations(),
    getServiceLines(),
  ]);

  const products = catalogue.items;
  const rates = allServices.filter((service) => service.categorySlug === slug);
  const priced = rates.filter((service) => service.price !== null);
  const cheapest = products.length > 0 ? Math.min(...products.map((item) => item.price)) : null;

  const others = lines.filter(
    (other) => other.slug !== line.slug && !HAS_ITS_OWN_PAGE.includes(other.slug),
  );

  const trail = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: line.name, path: `/services/${line.slug}` },
  ];

  const enquiry = `Hello Hornbill. I'd like a quote for ${line.name.toLowerCase()}.`;

  return (
    <>
      <script
        {...jsonLdScriptProps(
          serviceJsonLd({
            name: line.name,
            description: line.intro,
            path: `/services/${line.slug}`,
            settings,
            areaServed: locations.map((location) => ({
              name: location.name,
              county: location.county,
              lat: null,
              lng: null,
            })),
            // Only what is actually priced. An Offer with an invented price is
            // worse than no Offer, and a crawler will happily quote it back.
            offers: priced.map((service) => ({
              name: service.name,
              price: service.price as number,
              url: `/services/${line.slug}`,
              unit: serviceUnitPhrase(service.pricingUnit),
            })),
          }),
        )}
      />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      {line.faq.length > 0 ? <script {...jsonLdScriptProps(faqJsonLd(line.faq))} /> : null}

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">{line.name}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{line.intro}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <a href={whatsappLink(settings.whatsappNumber, enquiry)}>Get a quote on WhatsApp</a>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a href={telLink(settings.phone)}>
                <Phone aria-hidden="true" />
                {formatPhoneForDisplay(settings.phone)}
              </a>
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{settings.responsePromise}</p>
        </header>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {line.includes.length > 0 ? (
            <section className="rounded-card border border-line bg-paper p-6" aria-labelledby="inc">
              <h2 id="inc" className="font-display text-lg font-semibold text-ink">
                What the work includes
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {line.includes.map((point) => (
                  <li key={point} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/*
            CLAUDE.md §6: "Every Solution states what it is not suitable for.
            Honesty about limits is the strongest trust signal on the site and
            the most citable kind of sentence." On several of these lines it is
            the only thing on the page a competitor would not also claim.
          */}
          {line.notFor.length > 0 ? (
            <section className="rounded-card border border-line bg-paper p-6" aria-labelledby="not">
              <h2 id="not" className="font-display text-lg font-semibold text-ink">
                What this is not for
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {line.notFor.map((point) => (
                  <li key={point} className="flex gap-2">
                    <X
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {priced.length > 0 ? (
          <section className="mt-14" aria-labelledby="rates">
            <h2 id="rates" className="font-display text-xl font-semibold text-ink">
              What the work costs
            </h2>
            <PriceStamp settings={settings} className="mt-2" />

            <div className="mt-4 overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <caption className="sr-only">
                  {line.name} labour rates, KES excluding {settings.vatRate}% VAT
                </caption>
                <thead>
                  <tr className="border-b border-line bg-paper-warm text-left">
                    <th scope="col" className="p-3 font-semibold text-ink">
                      Work
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
                  {priced.map((service) => (
                    <tr key={service.slug}>
                      <th scope="row" className="p-3 text-left font-medium text-ink">
                        {service.name}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {service.description}
                        </span>
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
        ) : null}

        {products.length > 0 ? (
          <section className="mt-14" aria-labelledby="kit">
            <h2 id="kit" className="font-display text-xl font-semibold text-ink">
              Equipment we supply
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {products.length} item{products.length === 1 ? "" : "s"}
              {cheapest !== null ? <> from {formatKes(cheapest)}</> : null}, with the full part
              number against each price.
            </p>

            <div className="mt-4 overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <caption className="sr-only">
                  {line.name} equipment prices, KES excluding {settings.vatRate}% VAT
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
                      Unit
                    </th>
                    <th scope="col" className="p-3 text-right font-semibold text-ink">
                      Price (KES)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-paper">
                  {products.map((item) => (
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
        ) : (
          /*
            The honest empty state, and it is most of these lines today. Saying
            "we have not published prices for this line yet" is worth more than
            a range, and infinitely more than an estimate presented as our
            price. docs/09 items 2 and 34 track the prices that fill it in.
          */
          <section className="mt-14 rounded-card border border-line bg-paper-warm p-6">
            <h2 className="font-display text-xl font-semibold text-ink">
              {priced.length > 0
                ? "We have not published equipment prices for this line yet"
                : "We have not published prices for this line yet"}
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {priced.length > 0
                ? "The rates above are what the work costs. The equipment prices are not published yet, and we are not going to print an estimate and call it our price — the distributor costs for this category are being collected."
                : "Everywhere else on this site every price is public, and we are not going to break that here by printing an estimate and calling it our price. The distributor costs for this category are being collected; until they are in, this line is quoted from a survey."}
            </p>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Send us the site details and you will get an itemised quotation in the same format as
              everything else here — every line with a price against it, nothing bundled into
              &ldquo;accessories&rdquo;.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="cta">
                <a href={whatsappLink(settings.whatsappNumber, enquiry)}>Ask for a quote</a>
              </Button>
              <Button asChild variant="outline" size="cta">
                <Link href="/price-list">See the prices we do publish</Link>
              </Button>
            </div>
          </section>
        )}

        {line.faq.length > 0 ? (
          <section className="mt-14 max-w-(--container-prose)" aria-labelledby="faq">
            <h2 id="faq" className="font-display text-xl font-semibold text-ink">
              Questions people ask
            </h2>
            <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-paper">
              {line.faq.map((entry) => (
                <div key={entry.question} className="p-5">
                  <dt className="font-display font-semibold text-ink">{entry.question}</dt>
                  <dd className="mt-2 text-muted-foreground">{entry.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="mt-14" aria-labelledby="how">
          <h2 id="how" className="font-display text-xl font-semibold text-ink">
            How a job runs
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Site survey",
                body: `${settings.siteSurveyDeliverable} ${formatKes(settings.siteSurveyFee)}, credited to your invoice.`,
              },
              {
                title: "Quotation",
                body: `Every line priced, valid ${settings.quoteValidityDays} days. Nothing appears on the invoice that was not on it.`,
              },
              {
                title: "Installation",
                body: `${settings.depositPercent}% deposit to begin. M-Pesa Paybill ${settings.mpesaPaybill}, account ${settings.mpesaAccount}.`,
              },
              {
                title: "Handover",
                body: `Shown how it works, and ${settings.warrantyMonths} months of workmanship warranty.`,
              },
            ].map((step, index) => (
              <li key={step.title}>
                <p className="flex items-center gap-2 font-display font-semibold text-ink">
                  <span className="flex size-6 items-center justify-center rounded-pill bg-brand-orange text-xs text-ink">
                    {index + 1}
                  </span>
                  {step.title}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <nav className="mt-14" aria-labelledby="other">
          <h2 id="other" className="font-display text-lg font-semibold text-ink">
            Other things we install
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            <li>
              <Link
                href="/services/cctv-installation"
                className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
              >
                CCTV installation
              </Link>
            </li>
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/services/${other.slug}`}
                  className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                >
                  {other.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

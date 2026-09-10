import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PriceStamp } from "@/components/price-stamp";
import { Button } from "@/components/ui/button";
import {
  getServiceLines,
  getServicesByCategory,
  serviceUnitPhrase,
} from "@/lib/catalog/services";
import { formatKes } from "@/lib/money";
import { breadcrumbJsonLd, jsonLdScriptProps, offerListJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * /services — the human work, priced.
 *
 * docs/01 §5 and CLAUDE.md §4: a Service is the labour, not the hardware.
 * Publishing the day and per-point rates is Tier 3 item 21 in docs/03 §4 —
 * "every competitor hides this" — so the rate table is the page, and the prose
 * is around it.
 *
 * Rows the owner has not priced show "priced at survey" rather than a guess.
 */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Security services and labour rates",
  description:
    "What the work costs: site survey, camera installation per point, data points, access control per door, electric fencing per metre. Published rates, KES, VAT-exclusive.",
  alternates: { canonical: absoluteUrl("/services") },
};

const trail = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
];

export default async function ServicesPage() {
  const [settings, groups, lines] = await Promise.all([
    getSiteSettings(),
    getServicesByCategory(),
    getServiceLines(),
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      {/*
        The published rate card, machine-readable. docs/03 §4 Tier 3 item 21:
        "What CCTV Installation Labour Actually Costs — every competitor hides
        this." Unpriced rows are left out rather than emitted at zero.
      */}
      <script
        {...jsonLdScriptProps(
          offerListJsonLd({
            name: `Security services and labour rates, ${settings.serviceAreaLabel}`,
            path: "/services",
            settings,
            offers: groups
              .flatMap((group) => group.services)
              .filter((service) => service.price !== null)
              .map((service) => ({
                name: service.name,
                description: service.description,
                price: service.price as number,
                url: "/services",
                unit: serviceUnitPhrase(service.pricingUnit),
              })),
          }),
        )}
      />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            Services and labour rates
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            The hardware is the easy part to price. This is what the work costs — per camera
            point, per door, per metre of fence — and it is the number most installers will not
            put in writing until after they have been to your site.
          </p>
          <PriceStamp settings={settings} className="mt-4" />
        </header>

        {/*
          Every service line gets a page — docs/05 Sprint 6. Lines with nothing
          priced yet still have one: the copy, the honest limits and the FAQ are
          worth reading without a price, and the page says plainly that prices
          are not published for that line rather than inventing one.
        */}
        <section className="mt-12" aria-labelledby="lines">
          <h2 id="lines" className="font-display text-xl font-semibold text-ink">
            What we install
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <Link
                href="/services/cctv-installation"
                className="flex h-full flex-col gap-1 rounded-card border border-line bg-paper-warm p-4 transition-colors hover:border-brand-orange/60"
              >
                <span className="font-medium text-ink">CCTV installation</span>
                <span className="text-sm text-muted-foreground">
                  Complete systems, itemised, with the packages and the builder.
                </span>
              </Link>
            </li>
            {lines
              .filter((line) => line.slug !== "cctv")
              .map((line) => (
                <li key={line.slug}>
                  <Link
                    href={`/services/${line.slug}`}
                    className="flex h-full flex-col gap-1 rounded-card border border-line bg-paper p-4 transition-colors hover:border-brand-orange/60"
                  >
                    <span className="font-medium text-ink">{line.name}</span>
                    <span className="text-sm text-muted-foreground">{line.summary}</span>
                    {line.itemCount === 0 ? (
                      <span className="mt-1 text-xs text-muted-foreground">
                        Quoted from survey — prices not yet published
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
          </ul>
        </section>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/build/cctv"
            className="rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60"
          >
            <h2 className="font-display text-lg font-semibold text-ink">Build your own system</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Six questions and you get the whole bill of materials, labour included.
            </p>
            <p className="mt-3 text-sm font-medium text-action">Open the builder →</p>
          </Link>
          <Link
            href="/locations"
            className="rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60"
          >
            <h2 className="font-display text-lg font-semibold text-ink">Where we work</h2>
            <p className="mt-2 text-sm text-muted-foreground">{settings.serviceAreaLabel}.</p>
            <p className="mt-3 text-sm font-medium text-action">See coverage →</p>
          </Link>
        </div>

        {groups.map((group) => (
          <section key={group.slug} className="mt-14" aria-labelledby={`svc-${group.slug}`}>
            <h2 id={`svc-${group.slug}`} className="font-display text-xl font-semibold text-ink">
              {group.name}
            </h2>

            {/*
              A real <table>. CLAUDE.md §2.2: tables are what AI answer engines
              lift, and a rate card is exactly the object we want lifted.
            */}
            <div className="mt-4 overflow-x-auto rounded-card border border-line">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <caption className="sr-only">
                  {group.name} services and rates, KES excluding VAT
                </caption>
                <thead>
                  <tr className="border-b border-line bg-paper-warm text-left">
                    <th scope="col" className="p-3 font-semibold text-ink">
                      Service
                    </th>
                    <th scope="col" className="p-3 font-semibold text-ink">
                      What it covers
                    </th>
                    <th scope="col" className="p-3 text-right font-semibold text-ink">
                      Rate
                    </th>
                    <th scope="col" className="p-3 font-semibold text-ink">
                      Charged
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-paper">
                  {group.services.map((service) => (
                    <tr key={service.slug}>
                      <th scope="row" className="p-3 text-left font-medium text-ink">
                        {service.name}
                      </th>
                      <td className="p-3 text-muted-foreground">
                        {service.description}
                        {service.inclusions.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {service.inclusions.map((inclusion) => (
                              <li key={inclusion} className="flex gap-2">
                                <Check
                                  className="mt-0.5 size-3.5 shrink-0 text-success"
                                  aria-hidden="true"
                                />
                                {inclusion}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                      <td className="p-3 text-right font-medium text-ink tabular-nums">
                        {service.price === null ? (
                          <span className="font-normal text-muted-foreground">
                            Priced at survey
                          </span>
                        ) : (
                          formatKes(service.price)
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {serviceUnitPhrase(service.pricingUnit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <section className="mt-14 rounded-card border border-line bg-paper-warm p-6" aria-labelledby="terms">
          <h2 id="terms" className="font-display text-xl font-semibold text-ink">
            How we charge
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                term: "Site survey",
                detail: `${formatKes(settings.siteSurveyFee)}, credited to your invoice. ${settings.siteSurveyDeliverable}`,
              },
              {
                term: "Deposit",
                detail: `${settings.depositPercent}% before installation begins. M-Pesa Paybill ${settings.mpesaPaybill}, account ${settings.mpesaAccount}.`,
              },
              {
                term: "Quotation validity",
                detail: `${settings.quoteValidityDays} days from the date on the quote.`,
              },
              {
                term: "Warranty",
                detail: `${settings.warrantyMonths} months on workmanship. Equipment carries its manufacturer warranty.`,
              },
            ].map((entry) => (
              <div key={entry.term}>
                <dt className="font-display font-semibold text-ink">{entry.term}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{entry.detail}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  "Hello Hornbill. I'd like to book a site survey.",
                )}
              >
                Book a site survey
              </a>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/price-list">See the full price list</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

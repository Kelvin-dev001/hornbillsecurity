import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PriceStamp } from "@/components/price-stamp";
import { SolutionCard } from "@/components/solutions/solution-card";
import { Button } from "@/components/ui/button";
import { getPublicServices, serviceUnitPhrase } from "@/lib/catalog/services";
import { getSolutions } from "@/lib/catalog/solutions";
import { getLocations } from "@/lib/content/queries";
import { formatKes } from "@/lib/money";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  jsonLdScriptProps,
  serviceJsonLd,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * /services/cctv-installation — the hub the ten location pages hang off.
 *
 * docs/03 §3 asks for Service + Offer with a real price here, and notes that
 * almost nobody in Kenya publishes one for an installation service. The offers
 * below are the actual package totals, computed from live item prices, not a
 * "from" figure invented for the markup.
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "CCTV installation", path: "/services/cctv-installation" },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const solutions = await getSolutions(Number(settings.vatRate));
  const cheapest = Math.min(...solutions.map((solution) => solution.total));

  return {
    title: `CCTV installation in ${settings.serviceAreaLabel} — itemised prices`,
    description: `Complete CCTV systems from ${formatKes(cheapest)} installed, VAT-exclusive. Every camera, cable, connector and hour of labour published with its price. ${settings.responsePromise}`,
    alternates: { canonical: absoluteUrl("/services/cctv-installation") },
  };
}

const FAQ = [
  {
    question: "How much does CCTV installation cost in Mombasa?",
    answer:
      "A four-camera 1080p analog system with a 1TB drive, cabling, connectors and labour comes to about KES 60,000–72,000 excluding VAT, depending on whether you want colour footage at night. Eight cameras roughly doubles the hardware but not the labour. Every package on this site shows the full bill of materials, so you can see exactly which line is driving the price.",
  },
  {
    question: "What is not included in the price?",
    answer:
      "VAT at 16%, and anything a survey turns up that a published package cannot assume: unusually long cable runs, trenching, a pole, mains work, or a UPS. The packages assume a standard run per camera; where a site needs more, the survey says so before you commit rather than after.",
  },
  {
    question: "Do you charge for a site survey?",
    answer:
      "Yes — a commitment fee that is credited to your invoice. You get a written findings report and marked-up camera positions, which is yours to keep whether or not you use us. A free survey is usually a sales visit; this is an engineering one.",
  },
  {
    question: "How long does an installation take?",
    answer:
      "A four-camera residential job is normally one day. Eight cameras is one to two days depending on cable routes. Older buildings with no existing conduit take longer, which is the main thing the survey is establishing.",
  },
  {
    question: "Can I see the footage on my phone?",
    answer:
      "Yes, and setting it up is part of the handover, not an extra. We configure remote viewing on the phones of everyone who needs it before we leave the site, and show you how to export a clip — because the day you actually need footage is not the day to be learning that.",
  },
];

export default async function CctvInstallationPage() {
  const settings = await getSiteSettings();
  const [solutions, locations, services] = await Promise.all([
    getSolutions(Number(settings.vatRate)),
    getLocations(),
    getPublicServices(),
  ]);

  const packages = solutions
    .filter((solution) => !solution.answers.standalone)
    .sort((a, b) => a.total - b.total);
  const featured = packages.slice(0, 6);
  const cheapest = packages[0]?.total ?? 0;

  const labour = services.filter((service) =>
    ["site-survey", "camera-installation-point", "data-point-installation"].includes(service.slug),
  );

  return (
    <>
      <script
        {...jsonLdScriptProps(
          serviceJsonLd({
            name: "CCTV installation",
            description: `Supply and installation of CCTV systems across ${settings.serviceAreaLabel}, quoted as a complete itemised bill of materials.`,
            path: "/services/cctv-installation",
            settings,
            areaServed: locations.map((location) => ({
              name: location.name,
              county: location.county,
            })),
            offers: featured.map((solution) => ({
              name: solution.name,
              price: solution.total,
              url: `/solutions/${solution.slug}`,
            })),
          }),
        )}
      />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      <script {...jsonLdScriptProps(faqJsonLd(FAQ))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            CCTV installation in {settings.serviceAreaLabel}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Complete systems from {formatKes(cheapest)} installed, excluding VAT — and every one
            of them shows you the whole bill of materials before you call. The cameras, the
            recorder, the drive, the metres of cable, the connectors, the trunking and the labour,
            each with a price against it.
          </p>
          <PriceStamp settings={settings} className="mt-4" />

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href="/build/cctv">Build your system</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  "Hello Hornbill. I'd like a CCTV quote.",
                )}
              >
                Ask on WhatsApp
              </a>
            </Button>
          </div>
        </header>

        <section className="mt-14" aria-labelledby="packages">
          <h2 id="packages" className="font-display text-2xl font-semibold text-ink">
            Packages, priced
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Each of these is a real installation, not a starting point. Open any one and you get
            the itemised table — including what the package is <em>not</em> right for.
          </p>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((solution) => (
              <li key={solution.slug}>
                <SolutionCard solution={solution} />
              </li>
            ))}
          </ul>

          <Button asChild variant="outline" size="cta" className="mt-6">
            <Link href="/solutions">All {solutions.length} packages</Link>
          </Button>
        </section>

        <section className="mt-14" aria-labelledby="labour">
          <h2 id="labour" className="font-display text-2xl font-semibold text-ink">
            What the labour costs
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Published, because almost nobody in this market will. If a quote you have been given
            does not separate labour from hardware, this is the number to ask for.
          </p>

          <div className="mt-4 overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <caption className="sr-only">CCTV labour rates, KES excluding VAT</caption>
              <thead>
                <tr className="border-b border-line bg-paper-warm text-left">
                  <th scope="col" className="p-3 font-semibold text-ink">
                    Work
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
                {labour.map((service) => (
                  <tr key={service.slug}>
                    <th scope="row" className="p-3 text-left font-medium text-ink">
                      {service.name}
                    </th>
                    <td className="p-3 text-right text-ink tabular-nums">
                      {service.price === null ? "Priced at survey" : formatKes(service.price)}
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {serviceUnitPhrase(service.pricingUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <Link href="/services" className="text-action underline underline-offset-4">
              Every rate we publish
            </Link>
            , including access control, fencing and data cabling.
          </p>
        </section>

        <section className="mt-14 grid gap-6 sm:grid-cols-2" aria-labelledby="honest">
          <div className="rounded-card border border-line bg-paper p-6">
            <h2 id="honest" className="font-display text-lg font-semibold text-ink">
              What we do well
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {[
                "Residential and commercial CCTV across the Kenyan coast",
                `${settings.authorisedPartnerBrands.join(", ")} as an authorised partner, so warranty claims go somewhere`,
                "Coast-specific work: sealed boxes, salt-air corrosion, long rural runs",
                "Solar and 4G installations where there is no mains and no network",
                "Quotes you can check line by line against anyone else's",
              ].map((point) => (
                <li key={point} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/*
            CLAUDE.md §6: "Every Solution states what it is not suitable for.
            Honesty about limits is the strongest trust signal on the site."
            The same applies to the company.
          */}
          <div className="rounded-card border border-line bg-paper p-6">
            <h2 className="font-display text-lg font-semibold text-ink">What we don&apos;t do</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {[
                "Manned guarding or alarm response — we install, we do not patrol",
                "Nairobi as a marketed area. We will travel on request, but our technicians are on the coast and a Nairobi callout is not a same-week job",
                "Supply-only sales of a camera you install yourself. We quote installed systems, because half the failures we are called to fix are bad terminations",
                "Repairs to systems we did not install, unless we have surveyed them first",
              ].map((point) => (
                <li key={point} className="flex gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="areas">
          <h2 id="areas" className="font-display text-2xl font-semibold text-ink">
            Where we install
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Each of these has its own page, with what is actually different about installing
            there — not the same paragraph with the name swapped.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <li key={location.slug}>
                <Link
                  href={`/services/cctv-installation/${location.slug}`}
                  className="flex h-full flex-col rounded-card border border-line bg-paper p-4 transition-colors hover:border-brand-orange/60"
                >
                  <span className="font-medium text-ink">CCTV installation, {location.name}</span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {location.county} County
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14 max-w-(--container-prose)" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-2xl font-semibold text-ink">
            Questions people ask
          </h2>
          <dl className="mt-6 divide-y divide-line rounded-card border border-line bg-paper">
            {FAQ.map((entry) => (
              <div key={entry.question} className="p-5">
                <dt className="font-display font-semibold text-ink">{entry.question}</dt>
                <dd className="mt-2 text-muted-foreground">{entry.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </>
  );
}

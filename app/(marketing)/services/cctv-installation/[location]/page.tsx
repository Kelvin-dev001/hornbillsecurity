import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MapPin, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PriceStamp } from "@/components/price-stamp";
import { SolutionCard } from "@/components/solutions/solution-card";
import { Button } from "@/components/ui/button";
import { cheapestCompleteSystem, completeSystems, getSolutions } from "@/lib/catalog/solutions";
import { getLocationBySlug, getLocations } from "@/lib/content/queries";
import { formatKes } from "@/lib/money";
import { breadcrumbJsonLd, jsonLdScriptProps, serviceJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { formatPhoneForDisplay, getSiteSettings, telLink, whatsappLink } from "@/lib/site-settings";

/**
 * /services/cctv-installation/[location] — the money pages.
 *
 * docs/03 §2: "Service × location is the engine. services/cctv-installation/nyali
 * is where transactional intent lands." docs/01 §1 says why the coast in
 * particular: AreaSpy holds 28 Nairobi area pages and zero coast pages, and
 * nobody has a Nyali, Bamburi, Mtwapa or Diani page at all.
 *
 * Every one carries a real price and a condition specific to that place. docs/02
 * is explicit that a page with a find-and-replaced town name is thin content and
 * will be treated as such — so the local note is the point of the page, not
 * decoration on it.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const locations = await getLocations();
  return locations.map((location) => ({ location: location.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ location: string }>;
}): Promise<Metadata> {
  const { location: slug } = await params;
  const location = await getLocationBySlug(slug);
  if (!location) return {};

  const settings = await getSiteSettings();
  const solutions = await getSolutions(Number(settings.vatRate));
  const cheapest = cheapestCompleteSystem(solutions);

  return {
    title:
      location.seoTitle ?? `CCTV installation in ${location.name} — prices from ${formatKes(cheapest)}`,
    description:
      location.seoDescription ??
      `${location.intro.slice(0, 150)}… Complete systems from ${formatKes(cheapest)} installed, itemised line by line.`,
    alternates: { canonical: absoluteUrl(`/services/cctv-installation/${location.slug}`) },
  };
}

export default async function LocationServicePage({
  params,
}: {
  params: Promise<{ location: string }>;
}) {
  const { location: slug } = await params;
  const [location, settings, locations] = await Promise.all([
    getLocationBySlug(slug),
    getSiteSettings(),
    getLocations(),
  ]);

  if (!location) notFound();

  const solutions = await getSolutions(Number(settings.vatRate));
  const featured = completeSystems(solutions)
    .sort((a, b) => a.total - b.total)
    .slice(0, 3);

  const cheapest = cheapestCompleteSystem(solutions);
  const nearby = locations.filter((other) => other.slug !== location.slug).slice(0, 6);

  const trail = [
    { name: "Home", path: "/" },
    { name: "CCTV installation", path: "/services/cctv-installation" },
    { name: location.name, path: `/services/cctv-installation/${location.slug}` },
  ];

  const enquiry =
    `Hello Hornbill. I'm in ${location.name} and would like a CCTV quote. ` +
    `Can we book a site survey?`;

  return (
    <>
      {/*
        Service + Offer with real prices, not a bare Service. docs/03 §3:
        "Almost nobody in Kenya emits a valid Offer with a real price for an
        *installation service*, because almost nobody publishes one. That is
        free distinctiveness." The offers are the three package totals actually
        shown on the page, computed from live item prices.
      */}
      <script
        {...jsonLdScriptProps(
          serviceJsonLd({
            name: `CCTV installation in ${location.name}`,
            description: location.intro,
            path: `/services/cctv-installation/${location.slug}`,
            settings,
            areaServed: [
              {
                name: location.name,
                county: location.county,
                lat: location.lat,
                lng: location.lng,
              },
            ],
            offers: featured.map((solution) => ({
              name: solution.name,
              price: solution.total,
              url: `/solutions/${solution.slug}`,
            })),
          }),
        )}
      />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <p className="flex items-center gap-2 text-sm text-action">
            <MapPin className="size-4" aria-hidden="true" />
            {location.name}, {location.county} County
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-balance text-ink sm:text-4xl">
            CCTV installation in {location.name}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{location.intro}</p>

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

        {/*
          The local note. docs/02: this is what separates a location page from a
          template with the town name swapped, so it gets its own section rather
          than a line in the intro.
        */}
        <section className="mt-12 max-w-(--container-prose)" aria-labelledby="local">
          <h2 id="local" className="font-display text-xl font-semibold text-ink">
            What is different about {location.name}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">{location.localNotes}</p>
        </section>

        <section className="mt-14" aria-labelledby="packages">
          <h2 id="packages" className="font-display text-xl font-semibold text-ink">
            What it costs
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Complete systems from {formatKes(cheapest)} installed, excluding VAT. Every package
            shows every line — the cameras, the recorder, the cable, the connectors and the labour.
            Nobody else in Kenya publishes that.
          </p>
          <PriceStamp settings={settings} className="mt-3" />

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((solution) => (
              <li key={solution.slug}>
                <SolutionCard solution={solution} />
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline" size="cta">
              <Link href="/solutions">All packages</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/build/cctv">Build your own</Link>
            </Button>
          </div>
        </section>

        <section className="mt-14 rounded-card border border-line bg-paper-warm p-6" aria-labelledby="how">
          <h2 id="how" className="font-display text-xl font-semibold text-ink">
            How a job in {location.name} runs
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Site survey",
                body: `${settings.siteSurveyDeliverable} ${formatKes(settings.siteSurveyFee)}, credited to your invoice.`,
              },
              {
                title: "Quotation",
                body: `Every line priced, valid ${settings.quoteValidityDays} days. Nothing is added at invoice that was not on it.`,
              },
              {
                title: "Installation",
                body: `${settings.depositPercent}% deposit to begin. M-Pesa Paybill ${settings.mpesaPaybill}, account ${settings.mpesaAccount}.`,
              },
              {
                title: "Handover",
                body: `Remote viewing set up on your phone, and ${settings.warrantyMonths} months of workmanship warranty.`,
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

        <section className="mt-14" aria-labelledby="why">
          <h2 id="why" className="font-display text-xl font-semibold text-ink">
            Why us for {location.name}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              `${settings.authorisedPartnerBrands.join(", ")} authorised partner`,
              `${settings.yearsOperating}+ years on this coast, ${settings.techniciansCount}+ technicians`,
              "Every price published before you call — no quotation theatre",
              `${settings.serviceAreaLabel}, so a survey is days away rather than weeks`,
            ].map((reason) => (
              <li key={reason} className="flex gap-2 text-muted-foreground">
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                {reason}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="nearby">
          <h2 id="nearby" className="font-display text-lg font-semibold text-ink">
            We also cover
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {nearby.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/services/cctv-installation/${other.slug}`}
                  className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                >
                  {other.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

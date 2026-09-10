import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getPublicServices } from "@/lib/catalog/services";
import { getLocationBySlug, getLocations, getProjects } from "@/lib/content/queries";
import {
  breadcrumbJsonLd,
  jsonLdScriptProps,
  serviceAreaJsonLd,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { formatPhoneForDisplay, getSiteSettings, telLink, whatsappLink } from "@/lib/site-settings";

/**
 * /locations/[slug] — the area page.
 *
 * Deliberately a different page from /services/cctv-installation/[slug]: this
 * one is "everything we do in this area and how we get to you", the other is
 * "CCTV here, with prices". Two pages that said the same thing would be two
 * pages competing for the same query, which is worse than one.
 *
 * So the prices live on the service page and this one links to it. What is here
 * instead is coverage: the services that apply, the completed work nearby, and
 * the practical business of reaching the place.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const locations = await getLocations();
  return locations.map((location) => ({ slug: location.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const location = await getLocationBySlug(slug);
  if (!location) return {};

  return {
    title: `Security systems in ${location.name} — coverage and services`,
    description: `CCTV, access control, electric fencing and alarms in ${location.name}, ${location.county} County. ${location.intro.slice(0, 120)}…`,
    alternates: { canonical: absoluteUrl(`/locations/${location.slug}`) },
  };
}

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [location, settings, locations, projects, services] = await Promise.all([
    getLocationBySlug(slug),
    getSiteSettings(),
    getLocations(),
    getProjects(),
    getPublicServices(),
  ]);

  if (!location) notFound();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Coverage", path: "/locations" },
    { name: location.name, path: `/locations/${location.slug}` },
  ];

  const localProjects = projects.filter((project) => project.locationSlug === location.slug);
  const nearby = locations.filter((other) => other.slug !== location.slug).slice(0, 6);

  // The service categories we actually publish, as an "everything we do here"
  // list. Derived from the services table so a new one appears without an edit.
  const categories = [...new Map(services.map((s) => [s.categorySlug, s])).values()];

  return (
    <>
      <script
        {...jsonLdScriptProps(
          serviceAreaJsonLd({
            location,
            settings,
            servicePath: `/locations/${location.slug}`,
            serviceName: "Security system installation",
          }),
        )}
      />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <p className="flex items-center gap-2 text-sm text-action">
            <MapPin className="size-4" aria-hidden="true" />
            {location.county} County
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-balance text-ink sm:text-4xl">
            Security systems in {location.name}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{location.intro}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href={`/services/cctv-installation/${location.slug}`}>
                CCTV prices for {location.name}
              </Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a href={telLink(settings.phone)}>
                <Phone aria-hidden="true" />
                {formatPhoneForDisplay(settings.phone)}
              </a>
            </Button>
          </div>
        </header>

        <section className="mt-12 max-w-(--container-prose)" aria-labelledby="local">
          <h2 id="local" className="font-display text-xl font-semibold text-ink">
            Working in {location.name}
          </h2>
          <p className="mt-3 text-base text-muted-foreground">{location.localNotes}</p>
        </section>

        <section className="mt-14" aria-labelledby="what">
          <h2 id="what" className="font-display text-xl font-semibold text-ink">
            What we install here
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((service) => (
              <li
                key={service.categorySlug}
                className="rounded-card border border-line bg-paper p-4"
              >
                <p className="font-medium text-ink">{service.categoryName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Link
                    href={`/catalog/${service.categorySlug}`}
                    className="text-action underline underline-offset-4"
                  >
                    Equipment and prices
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </section>

        {localProjects.length > 0 ? (
          <section className="mt-14" aria-labelledby="work">
            <h2 id="work" className="font-display text-xl font-semibold text-ink">
              Work we have done in {location.name}
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {localProjects.map((project) => (
                <li key={project.slug}>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="flex h-full flex-col gap-2 rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60"
                  >
                    <span className="font-display font-semibold text-ink">{project.title}</span>
                    <span className="text-sm text-muted-foreground">{project.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-14 rounded-card border border-line bg-paper-warm p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Getting a price for {location.name}
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Two ways. Build a system yourself and see the full bill of materials before you speak
            to anyone, or send us the site details and we will price it the same way. Either
            ends in a survey — {settings.siteSurveyDeliverable}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href="/build/cctv">Build a system</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  `Hello Hornbill. I'm in ${location.name} and would like a quote.`,
                )}
              >
                WhatsApp us
              </a>
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{settings.responsePromise}</p>
        </section>

        <nav className="mt-14" aria-labelledby="nearby">
          <h2 id="nearby" className="font-display text-lg font-semibold text-ink">
            Nearby areas
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {nearby.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/locations/${other.slug}`}
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

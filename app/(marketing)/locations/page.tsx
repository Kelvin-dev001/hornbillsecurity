import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getLocations } from "@/lib/content/queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * /locations — coverage.
 *
 * Coast only. CLAUDE.md §1: "Do not build Nairobi location pages. A single
 * 'we also serve Nairobi on request' line on the contact page is the entire
 * Nairobi footprint." That line lives on /contact and is not repeated here.
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "Coverage", path: "/locations" },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `Areas we cover — ${settings.serviceAreaLabel}`,
    description: `CCTV, access control and electric fencing across ${settings.serviceCounties.join(", ")} counties. Ten coast areas, each with its own page and its own prices.`,
    alternates: { canonical: absoluteUrl("/locations") },
  };
}

export default async function LocationsPage() {
  const [settings, locations] = await Promise.all([getSiteSettings(), getLocations()]);

  const byCounty = new Map<string, typeof locations>();
  for (const location of locations) {
    byCounty.set(location.county, [...(byCounty.get(location.county) ?? []), location]);
  }

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            Where we work
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {settings.serviceAreaLabel} — {settings.serviceCounties.join(", ")} counties. We are
            based in {settings.addressLocality ?? "Mombasa"} and our technicians live here, which
            is the difference between a survey this week and a survey when someone is next
            travelling down.
          </p>
          <p className="mt-4 text-muted-foreground">
            Each area below has its own page, because the job genuinely changes: salt corrosion on
            the seafront, estate access rules in Nyali, the ferry queue at Likoni, empty holiday
            homes in Diani, long boundaries and no mains on the Kilifi plots.
          </p>
        </header>

        {[...byCounty.entries()].map(([county, areas]) => (
          <section key={county} className="mt-12" aria-labelledby={`county-${county}`}>
            <h2 id={`county-${county}`} className="font-display text-xl font-semibold text-ink">
              {county} County
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {areas.map((location) => (
                <li key={location.slug}>
                  <article className="group relative flex h-full flex-col gap-2 rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60">
                    <p className="flex items-center gap-1.5 text-xs text-action">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {location.county}
                    </p>
                    <h3 className="font-display text-lg font-semibold text-ink">
                      <Link href={`/locations/${location.slug}`}>
                        <span className="absolute inset-0" aria-hidden="true" />
                        {location.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-muted-foreground">{location.intro}</p>
                    <p className="mt-auto pt-2 text-sm font-medium text-action">
                      What we do here →
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-14 rounded-card border border-line bg-paper-warm p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Not on the list?
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The pages above are the areas we cover as a matter of course. If you are elsewhere on
            the coast, ask — the answer is usually yes, and if travel changes the price we will
            say so before you commit rather than at invoice.
          </p>
          <Button asChild size="cta" className="mt-4">
            <a
              href={whatsappLink(
                settings.whatsappNumber,
                "Hello Hornbill. Do you cover my area? I'm in ",
              )}
            >
              Ask about your area
            </a>
          </Button>
        </section>
      </div>
    </>
  );
}

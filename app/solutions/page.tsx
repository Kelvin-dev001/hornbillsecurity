import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { SolutionCard } from "@/components/solutions/solution-card";
import { PriceStamp } from "@/components/price-stamp";
import { Button } from "@/components/ui/button";
import {
  cheapestCompleteSystem,
  completeSystems,
  getSolutions,
} from "@/lib/catalog/solutions";
import { formatKes } from "@/lib/money";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * /solutions — the packaged systems, with a real installed price on each.
 *
 * docs/01 §1: Kenyan installers publish package totals without unit prices, and
 * Kenyan shops publish unit prices without package totals. Every card here
 * carries a total, and every card leads to a page that shows the arithmetic
 * behind it.
 */
export const revalidate = 3600;

const TRAIL = [
  { name: "Home", path: "/" },
  { name: "Solutions", path: "/solutions" },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const solutions = await getSolutions(Number(settings.vatRate));
  const complete = completeSystems(solutions);
  const cheapest = cheapestCompleteSystem(solutions);

  return {
    title: "CCTV packages — complete systems, priced line by line",
    description:
      `${complete.length} complete CCTV systems from ${formatKes(cheapest)} installed, ` +
      `VAT-exclusive. Every camera, every metre of cable, every connector and the labour, ` +
      `itemised. ${settings.tradingName}, ${settings.serviceAreaLabel}.`,
    alternates: { canonical: absoluteUrl("/solutions") },
  };
}

export default async function SolutionsPage() {
  const settings = await getSiteSettings();
  const solutions = await getSolutions(Number(settings.vatRate));

  const groups = [
    {
      heading: "Analog systems",
      blurb:
        "Turbo HD on coaxial cable. Cheaper per camera, and the right answer when there is no Cat6 in the building.",
      items: solutions.filter((solution) => solution.answers.technology === "analog"),
    },
    {
      heading: "IP systems",
      blurb:
        "4MP and 8MP cameras on Cat6, one cable per camera carrying video and power. More detail, and room to grow.",
      items: solutions.filter(
        (solution) => solution.answers.technology === "ip" && !solution.answers.standalone,
      ),
    },
    {
      heading: "Wire-free and specials",
      blurb:
        "Nanny cameras, solar and 4G. For rooms you cannot cable and sites with no power at all.",
      items: solutions.filter((solution) => solution.answers.standalone),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(TRAIL))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={TRAIL} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">CCTV packages</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Complete systems with the whole bill of materials published — every camera, every
            metre of cable, every connector, the drive sized by a formula we show you, and the
            labour. No competitor in Kenya publishes this. Nothing here is a starting price that
            grows on the invoice.
          </p>
          <PriceStamp settings={settings} className="mt-4" />

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href="/build/cctv">Build your own instead</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/catalog">Browse the catalogue</Link>
            </Button>
          </div>
        </header>

        {groups.map((group) => (
          <section key={group.heading} className="mt-14" aria-labelledby={group.heading}>
            <h2 id={group.heading} className="font-display text-xl font-semibold text-ink">
              {group.heading}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{group.blurb}</p>

            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((solution) => (
                <li key={solution.slug}>
                  <SolutionCard solution={solution} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-16 rounded-card border border-line bg-paper-warm p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            None of these is quite your building
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            They never are. Answer six questions and the builder puts together a system for your
            property, with the same itemised bill of materials, and lets you swap any line.
          </p>
          <Button asChild size="cta" className="mt-4">
            <Link href="/build/cctv">Build a system</Link>
          </Button>
        </section>
      </div>
    </>
  );
}

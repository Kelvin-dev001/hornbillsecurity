import Link from "next/link";
import { CheckCircle2, MapPin, Phone, ShieldCheck, Timer } from "lucide-react";

import { PriceStamp } from "@/components/price-stamp";
import { SolutionCard } from "@/components/solutions/solution-card";
import { Button } from "@/components/ui/button";
import { getCategoryTree } from "@/lib/catalog/queries";
import { getSolutions } from "@/lib/catalog/solutions";
import { getLocations, getPosts } from "@/lib/content/queries";
import { formatKes } from "@/lib/money";
import { jsonLdScriptProps, localBusinessJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import {
  formatPhoneForDisplay,
  getSiteSettings,
  telLink,
  whatsappLink,
} from "@/lib/site-settings";

/**
 * Homepage.
 *
 * The argument in order: we publish the whole bill of materials, here is a real
 * one, here is what our systems cost, here is where we work, here is how to
 * start. Everything above is server-rendered with the prices in the initial
 * HTML — CLAUDE.md §2.1, and the whole reason this stack was chosen.
 *
 * Nothing on this page is typed in. Prices come from the pricing engine,
 * business facts from site_settings, areas from the locations table.
 */
export const revalidate = 3600;

export default async function HomePage() {
  const settings = await getSiteSettings();
  const [solutions, locations, categories, posts] = await Promise.all([
    getSolutions(Number(settings.vatRate)),
    getLocations(),
    getCategoryTree(),
    getPosts(),
  ]);

  const packages = solutions
    .filter((solution) => !solution.answers.standalone)
    .sort((a, b) => a.total - b.total);
  const featured = packages.slice(0, 3);

  // The worked example is the cheapest complete system: a real BOM with a real
  // total, in the HTML, above the fold on a laptop. docs/03 §0 — this is the
  // object an answer engine can lift.
  const example = packages[0];
  const exampleLines = example
    ? [...example.bom.lines].sort((a, b) => b.extended - a.extended).slice(0, 6)
    : [];
  const exampleRemainder = example ? example.bom.lines.length - exampleLines.length : 0;

  const trustBar = [
    {
      icon: ShieldCheck,
      label: `${settings.authorisedPartnerBrands.join(" · ")} authorised partner`,
    },
    {
      icon: CheckCircle2,
      label: `${settings.yearsOperating}+ years · ${settings.techniciansCount}+ technicians`,
    },
    { icon: MapPin, label: settings.serviceAreaLabel },
    { icon: Timer, label: settings.responseTimeLabel },
  ];

  const topCategories = categories
    .filter((category) => category.itemCount > 0 && category.fromPrice !== null)
    .sort((a, b) => b.itemCount - a.itemCount)
    .slice(0, 6);

  return (
    <>
      <script {...jsonLdScriptProps(localBusinessJsonLd(settings))} />
      <script {...jsonLdScriptProps(websiteJsonLd(settings))} />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-paper-warm">
        <div className="mx-auto max-w-(--container-page) px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-3xl">
            <p className="font-display text-sm font-semibold tracking-wide text-action uppercase">
              {settings.serviceAreaLabel}
            </p>
            <h1 className="mt-4 text-4xl font-semibold text-balance text-ink sm:text-5xl lg:text-6xl">
              The only security company in Kenya that shows you the whole bill
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Every camera, every metre of cable, every connector and every hour of labour —
              published with a price against it, before you call us. Build your own system in six
              questions, see exactly what it costs, then send it to us as a quote request.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="cta">
                <Link href="/build/cctv">Build your system</Link>
              </Button>
              <Button asChild variant="outline" size="cta">
                <a
                  href={whatsappLink(
                    settings.whatsappNumber,
                    `Hello ${settings.tradingName}. I'd like a quote.`,
                  )}
                >
                  WhatsApp {formatPhoneForDisplay(settings.phone)}
                </a>
              </Button>
              <Button asChild variant="ghost" size="cta">
                <a href={telLink(settings.phone)}>
                  <Phone aria-hidden="true" />
                  Call
                </a>
              </Button>
            </div>

            <p className="mt-5 text-sm text-muted-foreground">{settings.responsePromise}</p>
          </div>
        </div>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <section aria-label="Why us" className="border-b border-line bg-paper">
        <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6">
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustBar.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3 text-sm text-ink">
                <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The worked example ────────────────────────────────────────────── */}
      {example ? (
        <section className="mx-auto max-w-(--container-page) px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-balance text-ink sm:text-3xl">
              This is what a quote should look like
            </h2>
            <p className="mt-4 text-muted-foreground">
              Here is our {example.name.toLowerCase()}, in full. Not a range, not
              &ldquo;from&rdquo;, not a figure with the workings hidden. Compare it against any
              other quote you have been given.
            </p>
            <PriceStamp settings={settings} className="mt-3" />
          </div>

          <div className="mt-6 overflow-x-auto rounded-card border border-line">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">
                Bill of materials for the {example.name}, KES excluding {example.bom.vatRate}% VAT
              </caption>
              <thead>
                <tr className="border-b border-line bg-paper-warm text-left">
                  <th scope="col" className="p-3 font-semibold text-ink">
                    Item
                  </th>
                  <th scope="col" className="p-3 text-right font-semibold text-ink">
                    Qty
                  </th>
                  <th scope="col" className="p-3 text-right font-semibold text-ink">
                    Unit price
                  </th>
                  <th scope="col" className="p-3 text-right font-semibold text-ink">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-paper">
                {exampleLines.map((line) => (
                  <tr key={line.id}>
                    <th scope="row" className="p-3 text-left font-normal text-ink">
                      {line.name}
                      {line.sku ? (
                        <span className="block text-xs text-muted-foreground">{line.sku}</span>
                      ) : null}
                    </th>
                    <td className="p-3 text-right text-muted-foreground tabular-nums">
                      {line.quantity}
                    </td>
                    <td className="p-3 text-right text-muted-foreground tabular-nums">
                      {formatKes(line.unitPrice)}
                    </td>
                    <td className="p-3 text-right font-medium text-ink tabular-nums">
                      {formatKes(line.extended)}
                    </td>
                  </tr>
                ))}
                {exampleRemainder > 0 ? (
                  <tr>
                    <td colSpan={4} className="p-3 text-muted-foreground">
                      + {exampleRemainder} more lines — connectors, clips, trunking, power and
                      labour, each priced.{" "}
                      <Link
                        href={`/solutions/${example.slug}`}
                        className="text-action underline underline-offset-4"
                      >
                        See all of them
                      </Link>
                    </td>
                  </tr>
                ) : null}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink/10 bg-paper-warm">
                  <th scope="row" colSpan={3} className="p-3 text-right font-semibold text-ink">
                    Total, excluding {example.bom.vatRate}% VAT
                  </th>
                  <td className="p-3 text-right text-lg font-semibold text-ink tabular-nums">
                    {formatKes(example.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href={`/solutions/${example.slug}`}>See every line</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/price-list">The whole price list</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {/* ── Packages ──────────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-paper-warm">
        <div className="mx-auto max-w-(--container-page) px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
              Systems, priced and complete
            </h2>
            <p className="mt-4 text-muted-foreground">
              {packages.length} packages from {formatKes(packages[0]?.total ?? 0)} installed. Each
              one says what it is right for and — the part nobody else publishes — what it is
              not.
            </p>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <Link href="/build/cctv">Build your own instead</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Coverage ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-(--container-page) px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
            The coast, and only the coast
          </h2>
          <p className="mt-4 text-muted-foreground">
            Salt air, empty holiday homes, plots with no mains, long boundaries on the port
            corridor. Each area has its own page saying what actually changes there — because a
            company that installs everywhere cannot tell you which of those is about to cost you
            money.
          </p>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <li key={location.slug}>
              <Link
                href={`/services/cctv-installation/${location.slug}`}
                className="flex h-full items-baseline justify-between gap-2 rounded-card border border-line bg-paper p-4 transition-colors hover:border-brand-orange/60"
              >
                <span className="font-medium text-ink">{location.name}</span>
                <span className="text-sm text-muted-foreground">{location.county}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Catalogue ─────────────────────────────────────────────────────── */}
      {topCategories.length > 0 ? (
        <section className="border-t border-line bg-paper-warm">
          <div className="mx-auto max-w-(--container-page) px-4 py-16 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
                What we install
              </h2>
              <p className="mt-4 text-muted-foreground">
                The full catalogue, with the real model number and the real price on every row.
              </p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topCategories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/catalog/${category.slug}`}
                    className="flex h-full flex-col gap-1 rounded-card border border-line bg-paper p-4 transition-colors hover:border-brand-orange/60"
                  >
                    <span className="font-medium text-ink">{category.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {category.itemCount} items, from {formatKes(category.fromPrice as number)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ── Guides ────────────────────────────────────────────────────────── */}
      {posts.length > 0 ? (
        <section className="mx-auto max-w-(--container-page) px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold text-ink sm:text-3xl">Guides and real costs</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex h-full flex-col gap-2 rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60"
                >
                  <span className="text-xs text-action uppercase">{post.category}</span>
                  <span className="font-display text-lg font-semibold text-ink">{post.title}</span>
                  <span className="text-sm text-muted-foreground">{post.excerpt}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Close ─────────────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-paper">
        <div className="mx-auto max-w-(--container-prose) px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-semibold text-balance text-ink sm:text-3xl">
            Get a real number today
          </h2>
          <p className="mt-4 text-muted-foreground">
            Build it yourself and see the price in two minutes, or send us the site details and
            we will price it the same way. Survey {formatKes(settings.siteSurveyFee)}, credited to
            your invoice. Deposit {settings.depositPercent}% to begin. Workmanship warranty{" "}
            {settings.warrantyMonths} months.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="cta">
              <Link href="/build/cctv">Build your system</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  `Hello ${settings.tradingName}. I'd like a quote.`,
                )}
              >
                WhatsApp us
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

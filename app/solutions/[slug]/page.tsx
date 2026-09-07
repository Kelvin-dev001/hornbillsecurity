import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Phone, X } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { BomTable } from "@/components/solutions/bom-table";
import { PriceStamp } from "@/components/price-stamp";
import { AddToQuote } from "@/components/quote/add-to-quote";
import { Button } from "@/components/ui/button";
import { getSolutionBySlug, getSolutionSlugs, getSolutions } from "@/lib/catalog/solutions";
import { formatKes } from "@/lib/money";
import { breadcrumbJsonLd, jsonLdScriptProps, solutionJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { formatPhoneForDisplay, getSiteSettings, telLink, whatsappLink } from "@/lib/site-settings";

/**
 * /solutions/[slug] — one package, with its complete bill of materials.
 *
 * Statically generated, so the whole table is in the initial HTML: docs/03 §0
 * is the reason the stack is Next.js and not an SPA, and this page is the one
 * that matters most for it.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getSolutionSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const settings = await getSiteSettings();
  const solution = await getSolutionBySlug(slug, Number(settings.vatRate));
  if (!solution) return {};

  return {
    title: `${solution.name} — ${formatKes(solution.total)} installed, itemised`,
    description:
      `${solution.summary} Complete bill of materials with every unit price, ` +
      `${formatKes(solution.total)} excluding VAT. ${settings.tradingName}, ${settings.serviceAreaLabel}.`,
    alternates: { canonical: absoluteUrl(`/solutions/${solution.slug}`) },
  };
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getSiteSettings();
  const vatRate = Number(settings.vatRate);
  const solution = await getSolutionBySlug(slug, vatRate);
  if (!solution) notFound();

  const all = await getSolutions(vatRate);
  const related = all
    .filter(
      (candidate) =>
        candidate.slug !== solution.slug &&
        candidate.answers.technology === solution.answers.technology,
    )
    .sort((a, b) => Math.abs(a.total - solution.total) - Math.abs(b.total - solution.total))
    .slice(0, 3);

  const trail = [
    { name: "Home", path: "/" },
    { name: "Solutions", path: "/solutions" },
    { name: solution.name, path: `/solutions/${solution.slug}` },
  ];

  const enquiry =
    `Hello Hornbill. I'd like a quote for the ${solution.name} package — ` +
    `${formatKes(solution.total)} excluding VAT on your site. My property is a ` +
    `${solution.answers.propertyType}.`;

  return (
    <>
      <script {...jsonLdScriptProps(solutionJsonLd({ solution, settings }))} />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="min-w-0">
            <header>
              <p className="text-sm text-muted-foreground capitalize">
                {solution.tier} · {solution.answers.technology === "analog" ? "Analog" : "IP"}
                {solution.cameraCount > 0
                  ? ` · ${solution.cameraCount} camera${solution.cameraCount === 1 ? "" : "s"}`
                  : ""}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-balance text-ink sm:text-4xl">
                {solution.name}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">{solution.summary}</p>
            </header>

            {solution.description ? (
              <p className="mt-6 max-w-(--container-prose) text-base text-muted-foreground">
                {solution.description}
              </p>
            ) : null}

            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <section aria-labelledby="best-for">
                <h2 id="best-for" className="font-display text-base font-semibold text-ink">
                  Right for
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {solution.bestFor.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </section>

              {/* CLAUDE.md §6: every Solution states what it is not for. It is the
                  strongest trust signal on the site and the most citable kind of
                  sentence, so it sits beside the good news, not below the fold. */}
              <section aria-labelledby="not-for">
                <h2 id="not-for" className="font-display text-base font-semibold text-ink">
                  Not right for
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {solution.notSuitableFor.map((limit) => (
                    <li key={limit} className="flex gap-2">
                      <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                      {limit}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="mt-12" aria-labelledby="bom">
              <h2 id="bom" className="font-display text-xl font-semibold text-ink">
                Every line in this system
              </h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                What you are buying, what each part costs, and what the labour comes to. This is
                the whole quotation — there is nothing else added at invoice.
              </p>
              <div className="mt-6">
                <BomTable
                  bom={solution.bom}
                  caption={`${solution.name} — bill of materials, KES`}
                  depositPercent={settings.depositPercent}
                />
              </div>
            </section>

            {related.length > 0 ? (
              <section className="mt-14" aria-labelledby="related">
                <h2 id="related" className="font-display text-xl font-semibold text-ink">
                  Near this one
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                  {related.map((candidate) => (
                    <li key={candidate.slug}>
                      <Link
                        href={`/solutions/${candidate.slug}`}
                        className="flex h-full flex-col gap-1 rounded-card border border-line bg-paper p-4 transition-colors hover:border-brand-orange/60"
                      >
                        <span className="font-medium text-ink">{candidate.name}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatKes(candidate.total)} excl. VAT
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card border border-line bg-paper-warm p-5">
              <p className="text-sm text-muted-foreground">Installed, excluding VAT</p>
              <p className="mt-1 text-3xl font-semibold text-ink tabular-nums">
                {formatKes(solution.total)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {formatKes(solution.totalInclVat)} including {solution.bom.vatRate}% VAT
              </p>
              <PriceStamp settings={settings} className="mt-3 text-xs" />

              <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Deposit to start</dt>
                  <dd className="font-medium tabular-nums text-ink">
                    {settings.depositPercent}%
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Workmanship warranty</dt>
                  <dd className="font-medium tabular-nums text-ink">
                    {settings.warrantyMonths} months
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Quote valid</dt>
                  <dd className="font-medium tabular-nums text-ink">
                    {settings.quoteValidityDays} days
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-col gap-2">
                <AddToQuote
                  kind="solution"
                  reference={solution.slug}
                  label="Add this package to a quote"
                />
                <Button asChild variant="outline" size="cta">
                  <a href={whatsappLink(settings.whatsappNumber, enquiry)}>Get this on WhatsApp</a>
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

            <div className="mt-4 rounded-card border border-line p-5">
              <h2 className="font-display text-sm font-semibold text-ink">Before we install</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {settings.siteSurveyDeliverable}
              </p>
              <p className="mt-2 text-sm font-medium text-ink tabular-nums">
                {formatKes(settings.siteSurveyFee)}, credited to your invoice
              </p>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Want it different?{" "}
              <Link href="/build/cctv" className="text-action hover:underline">
                Change the camera count, resolution or retention
              </Link>{" "}
              and watch the total move.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}

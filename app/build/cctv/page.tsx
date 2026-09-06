import type { Metadata } from "next";
import Link from "next/link";
import { Info, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { BomTable } from "@/components/solutions/bom-table";
import { BuilderQuestion } from "@/components/solutions/builder-question";
import { PriceStamp } from "@/components/price-stamp";
import { Button } from "@/components/ui/button";
import { buildBudgetAlternative, buildSystem } from "@/lib/catalog/builder";
import {
  builderHref,
  CABLE_CHOICES,
  CAMERA_CHOICES,
  LOCATION_LABELS,
  parseBuilderAnswers,
  parseBuilderOverrides,
  PROPERTY_LABELS,
  RETENTION_CHOICES,
} from "@/lib/catalog/builder-params";
import type { RawSearchParams } from "@/lib/catalog/search-params";
import { formatKes } from "@/lib/money";
import { PROPERTY_TYPES, SITE_LOCATIONS } from "@/lib/pricing/cctv";
import { STORAGE_FORMULA_TEXT } from "@/lib/pricing/storage";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { formatPhoneForDisplay, getSiteSettings, telLink, whatsappLink } from "@/lib/site-settings";

/**
 * /build/cctv — the Solution Builder.
 *
 * Six questions from docs/01 §5, then a complete itemised bill of materials with
 * every line swappable and the total moving as you change things.
 *
 * The whole state is in the URL, so this is a server component with no client
 * JavaScript at all: the BOM is in the initial HTML for every configuration, the
 * default state is crawlable, and a configuration can be pasted into WhatsApp as
 * a link. Changing an answer is a navigation the Next router makes instant.
 */
export const revalidate = 3600;

const TRAIL = [
  { name: "Home", path: "/" },
  { name: "Build a system", path: "/build" },
  { name: "CCTV", path: "/build/cctv" },
];

export const metadata: Metadata = {
  title: "CCTV cost calculator — build a system and see every line",
  description:
    "Answer six questions and get a complete, itemised CCTV quotation for a Mombasa property: " +
    "every camera, every metre of cable, every connector, the drive sized by a published formula, " +
    "labour and VAT. Swap any line and watch the total move.",
  alternates: { canonical: absoluteUrl("/build/cctv") },
};

export default async function CctvBuilderPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;
  const settings = await getSiteSettings();
  const vatRate = Number(settings.vatRate);

  const answers = parseBuilderAnswers(params);
  const overrides = parseBuilderOverrides(params);

  const [system, budget] = await Promise.all([
    buildSystem(answers, overrides, vatRate),
    buildBudgetAlternative(answers, vatRate),
  ]);

  const href = (change: Parameters<typeof builderHref>[1]) => builderHref(params, change);

  const summary =
    `${answers.cameras} ${answers.technology === "analog" ? "analog" : "IP"} camera` +
    `${answers.cameras === 1 ? "" : "s"} on a ${PROPERTY_LABELS[answers.propertyType].toLowerCase()}, ` +
    `${answers.retentionDays} days of footage`;

  const enquiry =
    `Hello Hornbill. I built a system on your site: ${summary}. ` +
    `It came to ${formatKes(system.bom.subtotal)} excluding VAT. Can you confirm and book a survey?`;

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(TRAIL))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={TRAIL} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Build a CCTV system</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Six questions, then the whole bill of materials with a price on every line. Change
            anything and the total moves. Nobody else in Kenya publishes this, which is why you
            usually have to phone three companies to find out what a system costs.
          </p>
          <PriceStamp settings={settings} className="mt-4" />
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-12">
          {/* ── the six questions ──────────────────────────────────────── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-card border border-line bg-paper p-5">
              <BuilderQuestion
                number={1}
                question="What are you covering?"
                options={PROPERTY_TYPES.map((type) => ({
                  label: PROPERTY_LABELS[type],
                  href: href({ property: type }),
                  active: answers.propertyType === type,
                }))}
              />

              <BuilderQuestion
                number={2}
                question="How many cameras?"
                hint={`${answers.outdoorCameras} outdoors`}
                options={CAMERA_CHOICES.map((count) => ({
                  label: String(count),
                  href: href({ cameras: count }),
                  active: answers.cameras === count,
                }))}
              />

              <BuilderQuestion
                number={3}
                question="Analog or IP?"
                hint="IP costs more and sees more"
                options={[
                  {
                    label: "Analog",
                    sublabel: "2MP, coax",
                    href: href({ tech: "analog" }),
                    active: answers.technology === "analog",
                  },
                  {
                    label: "IP",
                    sublabel: "4MP, Cat6",
                    href: href({ tech: "ip" }),
                    active: answers.technology === "ip",
                  },
                ]}
              />

              <BuilderQuestion
                number={4}
                question="Colour at night?"
                hint="ColorVu instead of infrared"
                options={[
                  { label: "Yes", href: href({ colour: "yes" }), active: answers.colourAtNight },
                  { label: "No", href: href({ colour: "no" }), active: !answers.colourAtNight },
                ]}
              />

              <BuilderQuestion
                number={5}
                question="How many days of footage?"
                hint="Drives the drive size"
                options={RETENTION_CHOICES.map((days) => ({
                  label: `${days} days`,
                  href: href({ days }),
                  active: answers.retentionDays === days,
                }))}
              />

              <BuilderQuestion
                number={6}
                question="Where is the property?"
                options={SITE_LOCATIONS.map((location) => ({
                  label: LOCATION_LABELS[location].split(" — ")[0],
                  href: href({ where: location }),
                  active: answers.location === location,
                }))}
              />

              <BuilderQuestion
                number={7}
                question="Within a kilometre of the sea?"
                hint="Sealed IP66 boxes at every camera"
                options={[
                  { label: "Yes", href: href({ coast: "yes" }), active: answers.coastSpec === true },
                  { label: "No", href: href({ coast: undefined }), active: !answers.coastSpec },
                ]}
              />
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Question 7 is not one of the six. It is here because salt air is the single most
              common reason a coastal system fails early, and it changes the bill.
            </p>
          </div>

          {/* ── the result ─────────────────────────────────────────────── */}
          <div className="min-w-0">
            <section
              aria-labelledby="recommended"
              className="rounded-card border border-line bg-paper-warm p-5"
            >
              <h2 id="recommended" className="font-display text-lg font-semibold text-ink">
                What we would fit
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{summary}</p>

              <p className="mt-4 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-semibold text-ink tabular-nums">
                  {formatKes(system.bom.subtotal)}
                </span>
                <span className="text-sm text-muted-foreground">
                  excluding VAT · {formatKes(system.bom.total)} including {system.bom.vatRate}%
                </span>
              </p>

              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {system.selection.rationale.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <Info className="mt-0.5 size-4 shrink-0 text-action" aria-hidden="true" />
                    {reason}
                  </li>
                ))}
              </ul>

              {budget ? (
                <div className="mt-5 rounded-control border border-line bg-paper p-4">
                  <h3 className="font-display text-sm font-semibold text-ink">
                    A cheaper version, priced honestly
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Infrared instead of colour at night, and {budget.answers.retentionDays} days of
                    footage instead of {answers.retentionDays}. It saves{" "}
                    <strong className="font-semibold text-ink tabular-nums">
                      {formatKes(system.bom.subtotal - budget.bom.subtotal)}
                    </strong>
                    , and you lose the ability to tell a jacket colour at night.
                  </p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-2">
                    <span className="text-xl font-semibold text-ink tabular-nums">
                      {formatKes(budget.bom.subtotal)}
                    </span>
                    <span className="text-sm text-muted-foreground">excluding VAT</span>
                  </p>
                  <Link
                    href={href({ colour: "no", days: budget.answers.retentionDays })}
                    className="mt-2 inline-block text-sm text-action hover:underline"
                  >
                    Build the cheaper one instead →
                  </Link>
                </div>
              ) : null}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button asChild size="cta">
                  <a href={whatsappLink(settings.whatsappNumber, enquiry)}>
                    Send this to us on WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="cta">
                  <a href={telLink(settings.phone)}>
                    <Phone aria-hidden="true" />
                    {formatPhoneForDisplay(settings.phone)}
                  </a>
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Saving a quote to its own page with a PDF arrives in the next sprint. For now the
                WhatsApp message carries the configuration.
              </p>
            </section>

            {/* ── line-level swaps ─────────────────────────────────────── */}
            <section className="mt-8" aria-labelledby="swaps">
              <h2 id="swaps" className="font-display text-xl font-semibold text-ink">
                Change a line
              </h2>

              {system.cameraOptions.length > 1 ? (
                <BuilderQuestion
                  question="Camera"
                  hint="Same category, cheapest first"
                  // Each option shows its own price rather than a difference
                  // against the current one. It is what a buyer actually wants
                  // to compare, and the total below moves when they click.
                  options={system.cameraOptions.map((option) => ({
                    label: option.sku,
                    sublabel: formatKes(option.price),
                    href: href({ camera: option.active ? undefined : option.sku }),
                    active: option.active,
                  }))}
                />
              ) : null}

              {system.storageOptions.length > 0 ? (
                <BuilderQuestion
                  question="Storage"
                  hint={`${STORAGE_FORMULA_TEXT} — ${system.requiredStorageGb.toLocaleString("en-KE")} GB needed`}
                  options={system.storageOptions.map((option) => ({
                    label: `${option.capacityGb / 1000} TB`,
                    sublabel: `${option.coversDays} days`,
                    href: href({ storage: option.active ? undefined : option.sku }),
                    active: option.active,
                  }))}
                />
              ) : null}

              {system.selection.storage ? (
                <BuilderQuestion
                  question="Cable per camera"
                  hint="Ours assumes a typical run; a long plot needs more"
                  options={CABLE_CHOICES.map((metres) => ({
                    label: `${metres} m`,
                    href: href({ cable: metres }),
                    active:
                      (overrides.cablePerCamera ??
                        (["shop", "office", "warehouse", "school", "estate", "farm"].includes(
                          answers.propertyType,
                        )
                          ? 45
                          : 30)) === metres,
                  }))}
                />
              ) : null}
            </section>

            {/* ── the bill of materials ────────────────────────────────── */}
            <section className="mt-10" aria-labelledby="bom">
              <h2 id="bom" className="font-display text-xl font-semibold text-ink">
                Your bill of materials
              </h2>
              <p className="mt-2 text-muted-foreground">
                Every part, every quantity, every unit price. This is the quotation, not a starting
                point that grows at invoice.
              </p>
              <div className="mt-6">
                <BomTable
                  bom={system.bom}
                  caption={`Indicative estimate — ${summary}`}
                  depositPercent={settings.depositPercent}
                />
              </div>
            </section>

            <section className="mt-8 rounded-card border border-line p-5">
              <h2 className="font-display text-base font-semibold text-ink">
                How we sized the storage
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {STORAGE_FORMULA_TEXT}. {system.selection.storage?.explanation}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Published so you can check it, and so you can tell whether anyone else&rsquo;s quote
                has sized the drive at all. Most do not — which is why a system that was meant to
                keep 30 days is overwriting after nine.
              </p>
            </section>

            <section className="mt-8 rounded-card border border-line bg-paper-warm p-5">
              <h2 className="font-display text-base font-semibold text-ink">
                What happens next
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {settings.siteSurveyDeliverable} It is {formatKes(settings.siteSurveyFee)}, credited
                to your invoice. Installation begins on a {settings.depositPercent}% deposit, and
                the workmanship warranty is {settings.warrantyMonths} months.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Prefer a package someone has already thought through?{" "}
                <Link href="/solutions" className="text-action hover:underline">
                  See the seventeen we install most
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

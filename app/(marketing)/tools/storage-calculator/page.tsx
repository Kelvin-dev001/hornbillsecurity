import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { PriceStamp } from "@/components/price-stamp";
import { Button } from "@/components/ui/button";
import { getCatalogItemsById } from "@/lib/catalog/queries";
import { getPricingRules } from "@/lib/catalog/solutions";
import { formatKes } from "@/lib/money";
import {
  sizeStorage,
  STOCKED_DISK_SKUS,
  STORAGE_FORMULA_TEXT,
  storageRuleKey,
} from "@/lib/pricing/storage";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * /tools/storage-calculator — docs/05 Sprint 7, "HDD sizing".
 *
 * Server-rendered from URL parameters, with no JavaScript involved in producing
 * the answer. That is deliberate and it is the whole reason this tool is worth
 * building rather than embedding a widget: docs/03 §0 — "ChatGPT does not
 * execute JavaScript. A client-rendered price table does not exist as far as it
 * is concerned." A calculator whose output only appears after a click is
 * invisible to the audience most likely to be asking the question.
 *
 * So every combination is a real URL with the answer already in the HTML, the
 * arithmetic is shown rather than hidden, and the formula is published as a
 * sentence — docs/01 §6: "Publish the formula on the page — it becomes a
 * quotable fact and an AI-citable answer."
 *
 * The engine is lib/pricing/storage.ts, the same module the CCTV builder and
 * every seeded package use, so this cannot disagree with a quotation.
 */
export const revalidate = 3600;

const CAMERA_CHOICES = [4, 8, 16, 32] as const;
const RESOLUTION_CHOICES = [
  { mp: 2, label: "2MP / 1080p" },
  { mp: 4, label: "4MP" },
  { mp: 8, label: "8MP / 4K" },
] as const;
const RETENTION_CHOICES = [7, 14, 30, 60, 90] as const;

type Params = { cameras?: string; mp?: string; days?: string };

function parse(params: Params) {
  const cameras = Number(params.cameras);
  const mp = Number(params.mp);
  const days = Number(params.days);

  return {
    cameras: CAMERA_CHOICES.includes(cameras as (typeof CAMERA_CHOICES)[number]) ? cameras : 8,
    mp: RESOLUTION_CHOICES.some((r) => r.mp === mp) ? mp : 4,
    days: RETENTION_CHOICES.includes(days as (typeof RETENTION_CHOICES)[number]) ? days : 30,
  };
}

const href = (cameras: number, mp: number, days: number) =>
  `/tools/storage-calculator?cameras=${cameras}&mp=${mp}&days=${days}`;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const { cameras, mp, days } = parse(await searchParams);
  const filtered = Boolean(
    (await searchParams).cameras || (await searchParams).mp || (await searchParams).days,
  );

  return {
    title: "CCTV hard disk size calculator — how much storage do you need?",
    description: `Work out the surveillance drive you need: ${cameras} cameras at ${mp}MP for ${days} days, with the arithmetic shown and the drive priced. KES, VAT-exclusive.`,
    alternates: { canonical: absoluteUrl("/tools/storage-calculator") },
    // Every combination is the same tool with different numbers, so only the
    // bare URL is indexable — docs/03 §0, letting a crawler index sixty
    // permutations splits the ranking signal we are trying to concentrate.
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function StorageCalculatorPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const raw = await searchParams;
  const { cameras, mp, days } = parse(raw);

  const [settings, rules, itemsById] = await Promise.all([
    getSiteSettings(),
    getPricingRules(),
    getCatalogItemsById(),
  ]);

  const items = [...itemsById.values()];
  const gbPerChannelPerDay = rules[storageRuleKey(mp)];

  const sizing = sizeStorage({
    channels: cameras,
    gbPerChannelPerDay,
    retentionDays: days,
    available: items,
  });

  const disk = itemsById.get(
    [...itemsById.keys()].find((id) => itemsById.get(id)?.sku === sizing.sku) ?? "",
  );
  const diskPrice = disk ? disk.price * sizing.count : null;

  // The stocked range, so the page is useful even to somebody whose numbers are
  // not among the presets.
  const stocked = STOCKED_DISK_SKUS.map((sku) => items.find((item) => item.sku === sku)).filter(
    (item): item is NonNullable<typeof item> => item !== undefined,
  );

  // Beyond about four drives no recorder on the market has the bays, so the
  // honest answer stops being "buy more disks" and becomes "this is a different
  // architecture". Without this the calculator cheerfully recommends 17 × 8 TB
  // for 32 cameras at 8MP for 90 days, which is arithmetically right and
  // impossible to buy — exactly the kind of confidently wrong output that makes
  // a tool worse than no tool.
  const MAX_BAYS = 4;
  const beyondOneRecorder = sizing.count > MAX_BAYS;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Tools", path: "/tools" },
    { name: "Storage calculator", path: "/tools/storage-calculator" },
  ];

  const faq = [
    {
      question: "How much hard disk do I need for CCTV?",
      answer: `${STORAGE_FORMULA_TEXT}. At ${mp}MP that is about ${gbPerChannelPerDay} GB per camera per day, so ${sizing.explanation} Higher resolution and more days both scale it linearly — doubling either doubles the disk.`,
    },
    {
      question: "How many days will a 1TB drive record?",
      answer: `Depends entirely on cameras and resolution, which is why a single answer to this is always wrong. On our figures a 1TB drive covers roughly ${Math.floor(1000 / (gbPerChannelPerDay * 4))} days on four ${mp}MP cameras, and about ${Math.floor(1000 / (gbPerChannelPerDay * 8))} days on eight. If somebody quotes you a 1TB drive for eight cameras and thirty days, the arithmetic does not work.`,
    },
    {
      question: "Can I use an ordinary desktop hard drive?",
      answer:
        "You can fit one and it will work for a while. A surveillance-rated drive is built for continuous writing, which is what a recorder does every second of every day, and a desktop drive in that duty usually fails inside two years — silently, so you find out when you need footage. We fit surveillance drives only.",
    },
    {
      question: "What happens when the disk is full?",
      answer:
        "The recorder overwrites the oldest footage, which is normal and intended. The problem is when the disk is much smaller than you assumed: you think you have thirty days and you have nine. That is the single most common thing we find on systems we are asked to look at.",
    },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      <script {...jsonLdScriptProps(faqJsonLd(faq))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            CCTV storage calculator
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            How big a surveillance drive you need, with the arithmetic shown and the drive priced.
            The formula is the one sentence worth remembering:{" "}
            <strong className="text-ink">{STORAGE_FORMULA_TEXT}</strong>.
          </p>
        </header>

        {/*
          Plain links, not a form. Every combination is a real URL whose answer
          is already in the HTML, so it works with JavaScript off and it is
          readable by a fetcher that does not run any — docs/03 §0.
        */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[20rem_1fr]">
          <div className="space-y-6">
            {[
              {
                legend: "Cameras",
                options: CAMERA_CHOICES.map((value) => ({
                  value,
                  label: String(value),
                  url: href(value, mp, days),
                  active: value === cameras,
                })),
              },
              {
                legend: "Resolution",
                options: RESOLUTION_CHOICES.map((choice) => ({
                  value: choice.mp,
                  label: choice.label,
                  url: href(cameras, choice.mp, days),
                  active: choice.mp === mp,
                })),
              },
              {
                legend: "Days of footage",
                options: RETENTION_CHOICES.map((value) => ({
                  value,
                  label: String(value),
                  url: href(cameras, mp, value),
                  active: value === days,
                })),
              },
            ].map((group) => (
              <fieldset key={group.legend}>
                <legend className="text-sm font-medium text-ink">{group.legend}</legend>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {group.options.map((option) => (
                    <li key={option.value}>
                      <Link
                        href={option.url}
                        aria-current={option.active ? "true" : undefined}
                        className={
                          option.active
                            ? "inline-flex h-9 items-center rounded-pill bg-brand-orange px-3 text-sm font-medium text-ink"
                            : "inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                        }
                      >
                        {option.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ))}
          </div>

          <div>
            <section className="rounded-card border border-line bg-paper-warm p-6" aria-live="polite">
              <p className="text-sm text-muted-foreground">
                {cameras} cameras · {mp}MP · {days} days
              </p>
              <p className="mt-2 text-3xl font-semibold text-ink">
                {beyondOneRecorder ? (
                  <>
                    {(sizing.requiredGb / 1000).toLocaleString("en-KE", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    TB
                  </>
                ) : (
                  <>
                    {sizing.count > 1 ? `${sizing.count} × ` : ""}
                    {sizing.capacityGb / 1000} TB
                  </>
                )}
              </p>

              <table className="mt-6 w-full border-collapse text-sm">
                <caption className="sr-only">How that figure was reached</caption>
                <tbody className="divide-y divide-line">
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                      Cameras
                    </th>
                    <td className="py-2 text-right text-ink tabular-nums">{cameras}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                      GB per camera per day at {mp}MP
                    </th>
                    <td className="py-2 text-right text-ink tabular-nums">
                      {gbPerChannelPerDay}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 text-left font-normal text-muted-foreground">
                      Days kept
                    </th>
                    <td className="py-2 text-right text-ink tabular-nums">{days}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 text-left font-medium text-ink">
                      Storage needed
                    </th>
                    <td className="py-2 text-right font-medium text-ink tabular-nums">
                      {sizing.requiredGb.toLocaleString("en-KE")} GB
                    </td>
                  </tr>
                  {diskPrice !== null && !beyondOneRecorder ? (
                    <tr>
                      <th scope="row" className="py-2 text-left font-medium text-ink">
                        {disk?.name}
                        {sizing.count > 1 ? ` × ${sizing.count}` : ""}
                      </th>
                      <td className="py-2 text-right font-medium text-ink tabular-nums">
                        {formatKes(diskPrice)}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              {diskPrice !== null && !beyondOneRecorder ? (
                <PriceStamp settings={settings} className="mt-4" />
              ) : null}

              {beyondOneRecorder ? (
                <div className="mt-4 rounded-control border border-line bg-paper p-4">
                  <p className="text-sm font-medium text-ink">
                    That is more drives than a recorder can hold.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The arithmetic is right — {sizing.requiredGb.toLocaleString("en-KE")} GB is
                    what {cameras} cameras at {mp}MP for {days} days actually produces — but no
                    NVR takes {sizing.count} disks. The largest we fit hold four. At this scale the
                    answer is a different design, not a bigger disk: a server or NAS recording to
                    a RAID array, or a shorter retention on the cameras that do not need {days}{" "}
                    days.
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Most sites that land here find the real requirement is thirty days on the four
                    cameras that matter and a week on the rest. Worth a conversation rather than a
                    calculator.
                  </p>
                </div>
              ) : null}

              <p className="mt-4 text-sm text-muted-foreground">
                Indicative. Real file sizes move with scene activity and with how the camera is
                configured, so we confirm this at survey — and we size up rather than down, because
                the failure mode of guessing low is finding out three weeks after the event.
              </p>
            </section>

            {stocked.length > 0 ? (
              <section className="mt-8" aria-labelledby="stocked">
                <h2 id="stocked" className="font-display text-lg font-semibold text-ink">
                  Drives we fit
                </h2>
                <div className="mt-3 overflow-x-auto rounded-card border border-line">
                  <table className="w-full min-w-[30rem] border-collapse text-sm">
                    <caption className="sr-only">
                      Surveillance drive prices, KES excluding {settings.vatRate}% VAT
                    </caption>
                    <thead>
                      <tr className="border-b border-line bg-paper-warm text-left">
                        <th scope="col" className="p-3 font-semibold text-ink">
                          Model
                        </th>
                        <th scope="col" className="p-3 font-semibold text-ink">
                          Drive
                        </th>
                        <th scope="col" className="p-3 text-right font-semibold text-ink">
                          Price (KES)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line bg-paper">
                      {stocked.map((item) => (
                        <tr key={item.sku}>
                          <th scope="row" className="p-3 text-left font-medium text-ink">
                            <Link
                              href={`/catalog/item/${item.slug}`}
                              className="underline-offset-4 hover:underline"
                            >
                              {item.sku}
                            </Link>
                          </th>
                          <td className="p-3 text-muted-foreground">{item.name}</td>
                          <td className="p-3 text-right font-medium text-ink tabular-nums">
                            {formatKes(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Surveillance-rated throughout. A desktop drive in a recorder is a drive that
                  fails, and it fails quietly.
                </p>
              </section>
            ) : null}
          </div>
        </div>

        <section className="mt-14 max-w-(--container-prose)" aria-labelledby="faq">
          <h2 id="faq" className="font-display text-xl font-semibold text-ink">
            Questions people ask
          </h2>
          <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-paper">
            {faq.map((entry) => (
              <div key={entry.question} className="p-5">
                <dt className="font-display font-semibold text-ink">{entry.question}</dt>
                <dd className="mt-2 text-muted-foreground">{entry.answer}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href="/build/cctv">Build the whole system</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  `Hello Hornbill. I need about ${sizing.capacityGb / 1000} TB for ${cameras} cameras — can you quote a system?`,
                )}
              >
                Ask on WhatsApp
              </a>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Download, Phone } from "lucide-react";

import { BomTable } from "@/components/solutions/bom-table";
import { Button } from "@/components/ui/button";
import { getQuoteByCode, type SavedQuote } from "@/lib/quote/read";
import type { Bom } from "@/lib/pricing/bom";
import { formatKes } from "@/lib/money";
import { absoluteUrl } from "@/lib/seo/origin";
import { formatPhoneForDisplay, getSiteSettings, telLink, whatsappLink } from "@/lib/site-settings";

/**
 * /q/[code] — the saved quotation, exactly as it was submitted.
 *
 * docs/02: "A customer must be able to reopen /q/AB12CD next week and see what
 * they were shown." Every figure here comes from the frozen snapshot, so a price
 * review, a renamed product or an unpublished SKU changes nothing.
 *
 * noindex, and not because it is unimportant. The page carries a customer's
 * name and the area they live in; the URL is shareable and gets forwarded, and
 * a search engine has no business holding a copy. Their phone number is not
 * rendered at all — it is in the PDF and the owner's notification, which go to
 * the two people entitled to it.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const quote = await getQuoteByCode(code);

  return {
    title: quote ? `Quotation ${quote.code}` : "Quotation not found",
    robots: { index: false, follow: false, nocache: true },
    alternates: quote ? { canonical: absoluteUrl(`/q/${quote.code}`) } : undefined,
  };
}

/**
 * The frozen lines, shaped for BOMTable so a saved quote and a live one look
 * identical. Nothing is recomputed — the numbers come straight off the snapshot.
 */
function bomFromSnapshot(quote: SavedQuote): Bom {
  const lines = quote.lines.map((line, index) => ({
    id: `${index}`,
    lineType: line.lineType as "primary",
    sku: line.sku,
    href: line.sku ? `/catalog/item/${line.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : null,
    name: line.name,
    spec: line.spec,
    unit: line.unit,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    extended: line.extended,
    note: line.note,
    provisional: false,
  }));

  return {
    lines,
    groups: quote.groups.map((group) => ({
      lineType: group.lineType as "primary",
      label: group.label,
      lines: lines.filter((line) => line.lineType === group.lineType),
      subtotal: group.subtotal,
    })),
    subtotalItems: quote.groups
      .filter((group) => group.lineType !== "labour")
      .reduce((sum, group) => sum + group.subtotal, 0),
    subtotalLabour: quote.groups
      .filter((group) => group.lineType === "labour")
      .reduce((sum, group) => sum + group.subtotal, 0),
    subtotal: quote.subtotal,
    vatRate: quote.vatRate,
    vatAmount: quote.vatAmount,
    total: quote.total,
    provisionalAmount: 0,
    provisionalShare: 0,
  };
}

export default async function SavedQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ code }, search, settings] = await Promise.all([
    params,
    searchParams,
    getSiteSettings(),
  ]);

  const quote = await getQuoteByCode(code);
  if (!quote) notFound();

  const isNew = search.new !== undefined;

  const whatsappMessage =
    `Hello Hornbill. My quotation is ${quote.code} — ${formatKes(quote.total)} including VAT. ` +
    `${absoluteUrl(`/q/${quote.code}`)}. Can we book the site survey?`;

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
      {isNew ? (
        <p className="mb-6 flex gap-2 rounded-card border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Sent. We have your quotation and will be in touch — {settings.responsePromise} Keep
            this page: the prices on it are held for {settings.quoteValidityDays} days.
          </span>
        </p>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0">
          <header className="rounded-card bg-ink px-5 py-6 text-paper">
            <p className="text-xs tracking-wide text-paper/70 uppercase">Quotation</p>
            <p className="font-display text-4xl font-semibold tracking-widest text-brand-gold tabular-nums">
              {quote.code}
            </p>
            <p className="mt-3 text-sm text-paper/80">
              For {quote.customerName} · {quote.area}, {quote.county} · {quote.propertyType}
            </p>
            <p className="mt-1 text-sm text-paper/80">
              Issued{" "}
              <time dateTime={quote.createdAt.toISOString()}>
                {formatDate(quote.createdAt)}
              </time>{" "}
              · Valid until{" "}
              <time dateTime={quote.validUntil.toISOString()}>
                {formatDate(quote.validUntil)}
              </time>
            </p>
          </header>

          {quote.expired ? (
            <p className="mt-4 flex gap-2 rounded-card border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                This quotation has passed its {settings.quoteValidityDays}-day validity. The
                prices below are what you were quoted; call us and we will confirm what has
                changed.
              </span>
            </p>
          ) : null}

          <section className="mt-10" aria-labelledby="lines">
            <h1 id="lines" className="font-display text-xl font-semibold text-ink">
              Every line in this quotation
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              These are the prices you were given, and they do not move while this quotation is
              valid — even if our catalogue prices do.
            </p>
            <div className="mt-6">
              <BomTable
                bom={bomFromSnapshot(quote)}
                caption={`Quotation ${quote.code} — KES`}
                depositPercent={quote.depositPercent}
              />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-line bg-paper-warm p-5">
            <p className="text-sm text-muted-foreground">Total including VAT</p>
            <p className="mt-1 text-3xl font-semibold text-ink tabular-nums">
              {formatKes(quote.total)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {formatKes(quote.subtotal)} excluding {quote.vatRate}% VAT
            </p>

            <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {quote.depositPercent}% deposit to begin
                </dt>
                <dd className="font-medium tabular-nums text-ink">
                  {formatKes(quote.deposit)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">M-Pesa Paybill</dt>
                <dd className="font-medium tabular-nums text-ink">{settings.mpesaPaybill}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Account</dt>
                <dd className="font-medium tabular-nums text-ink">{settings.mpesaAccount}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-2">
              <Button asChild size="cta">
                <a href={whatsappLink(settings.whatsappNumber, whatsappMessage)}>
                  Book the survey on WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" size="cta">
                <a href={`/q/${quote.code}/pdf`}>
                  <Download aria-hidden="true" />
                  Download the PDF
                </a>
              </Button>
              <Button asChild variant="outline" size="cta">
                <a href={telLink(settings.phone)}>
                  <Phone aria-hidden="true" />
                  {formatPhoneForDisplay(settings.phone)}
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-card border border-line p-5">
            <h2 className="font-display text-sm font-semibold text-ink">
              What happens next
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {settings.siteSurveyDeliverable} It is {formatKes(settings.siteSurveyFee)},
              credited to your invoice. Quantities here are an indicative estimate, and the
              survey is where they stop being one.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Workmanship warranty {settings.warrantyMonths} months.
            </p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Want to change something?{" "}
            <Link href="/build/cctv" className="text-action hover:underline">
              Build another
            </Link>{" "}
            — this one stays exactly as it is.
          </p>
        </aside>
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(date);
}

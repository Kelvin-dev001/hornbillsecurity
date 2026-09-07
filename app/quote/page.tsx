import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { BomTable } from "@/components/solutions/bom-table";
import { PriceStamp } from "@/components/price-stamp";
import { QuoteForm } from "@/components/quote/quote-form";
import { Button } from "@/components/ui/button";
import {
  clearBasketAction,
  removeLineAction,
  updateQuantityAction,
} from "@/lib/quote/actions";
import { priceBasket, readBasketKey, readBasketLines } from "@/lib/quote/basket";
import { formatKes } from "@/lib/money";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * /quote — review what you have gathered, then send it.
 *
 * Dynamic by necessity: it reads the basket cookie. That is confined to this
 * route and /q/[code], so the 126 catalogue and package pages stay static.
 *
 * noindex: a basket is one visitor's working state and there is nothing here
 * for a crawler. The pages worth indexing are the ones the lines came from.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your quote",
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl("/quote") },
};

const TRAIL = [
  { name: "Home", path: "/" },
  { name: "Your quote", path: "/quote" },
];

export default async function QuotePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const settings = await getSiteSettings();
  const cookieKey = await readBasketKey();
  const lines = await readBasketLines(cookieKey);
  const basket = await priceBasket(lines, Number(settings.vatRate));

  const justAdded = params.added !== undefined;

  if (basket.lines.length === 0) {
    return (
      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={TRAIL} />
        <div className="mt-10 max-w-xl">
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Your quote is empty</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Add a package or an individual part and it will appear here, with every line priced
            and a total you can send to us.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href="/build/cctv">Build a system</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/solutions">See the packages</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/catalog">Browse the catalogue</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
      <Breadcrumbs trail={TRAIL} />

      <header className="mt-6 max-w-3xl">
        <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Your quote</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {justAdded ? "Added. " : ""}Every line, every price, and the total. Change the
          quantities or take something out, then send it and we will call you back.
        </p>
        <PriceStamp settings={settings} className="mt-4" />
      </header>

      {basket.hasUnavailable ? (
        <p className="mt-6 flex gap-2 rounded-card border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {basket.unavailable.length}{" "}
            {basket.unavailable.length === 1 ? "line is" : "lines are"} no longer in the
            catalogue and {basket.unavailable.length === 1 ? "has" : "have"} been left out of
            the total. Call us and we will find the current equivalent.
          </span>
        </p>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="min-w-0">
          <section aria-labelledby="lines">
            <h2 id="lines" className="font-display text-xl font-semibold text-ink">
              What you have chosen
            </h2>

            <ul className="mt-4 divide-y divide-line rounded-card border border-line">
              {basket.lines.map((entry) => (
                <li
                  key={`${entry.kind}-${entry.ref}`}
                  className="flex flex-wrap items-center gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={entry.href}
                      className="font-medium text-ink hover:underline"
                    >
                      {entry.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {entry.kind === "solution"
                        ? `Complete package · ${entry.lineCount} lines`
                        : "Individual part"}{" "}
                      · {formatKes(entry.unitPrice)} each
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <QuantityButton
                      kind={entry.kind}
                      reference={entry.ref}
                      quantity={entry.quantity - 1}
                      label={`Reduce ${entry.name}`}
                    >
                      <Minus className="size-4" aria-hidden="true" />
                    </QuantityButton>

                    <span className="w-8 text-center text-sm font-semibold tabular-nums text-ink">
                      {entry.quantity}
                    </span>

                    <QuantityButton
                      kind={entry.kind}
                      reference={entry.ref}
                      quantity={entry.quantity + 1}
                      label={`Add another ${entry.name}`}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </QuantityButton>
                  </div>

                  <p className="w-28 text-right font-semibold tabular-nums text-ink">
                    {formatKes(entry.extended)}
                  </p>

                  <form action={removeLineAction}>
                    <input type="hidden" name="kind" value={entry.kind} />
                    <input type="hidden" name="ref" value={entry.ref} />
                    <button
                      type="submit"
                      aria-label={`Remove ${entry.name}`}
                      className="flex size-11 items-center justify-center rounded-control text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>

            <form action={clearBasketAction} className="mt-3">
              <button
                type="submit"
                className="text-sm text-muted-foreground underline-offset-4 hover:text-danger hover:underline"
              >
                Clear the whole quote
              </button>
            </form>
          </section>

          <section className="mt-12" aria-labelledby="bom">
            <h2 id="bom" className="font-display text-xl font-semibold text-ink">
              Every line in full
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              What a package contains, opened out. This is what we will install and what the
              quotation will say.
            </p>
            <div className="mt-6">
              <BomTable
                bom={basket.bom}
                caption="Your quote — bill of materials, KES"
                depositPercent={settings.depositPercent}
              />
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-line bg-paper-warm p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Send it to us</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              You will get a reference code and a PDF, and the prices are held for{" "}
              {settings.quoteValidityDays} days.
            </p>

            <dl className="mt-4 space-y-1 border-y border-line py-4 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Subtotal excl. VAT</dt>
                <dd className="font-medium tabular-nums text-ink">
                  {formatKes(basket.bom.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">VAT at {basket.bom.vatRate}%</dt>
                <dd className="tabular-nums text-muted-foreground">
                  {formatKes(basket.bom.vatAmount)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 pt-1">
                <dt className="font-semibold text-ink">Total</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatKes(basket.bom.total)}
                </dd>
              </div>
            </dl>

            <div className="mt-4">
              <QuoteForm responsePromise={settings.responsePromise} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** A one-button form, so quantity changes work without JavaScript. */
function QuantityButton({
  kind,
  reference,
  quantity,
  label,
  children,
}: {
  kind: string;
  reference: string;
  quantity: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <form action={updateQuantityAction}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="ref" value={reference} />
      <input type="hidden" name="quantity" value={quantity} />
      <button
        type="submit"
        aria-label={label}
        className="flex size-11 items-center justify-center rounded-control border border-line text-muted-foreground transition-colors hover:border-ink hover:text-ink"
      >
        {children}
      </button>
    </form>
  );
}

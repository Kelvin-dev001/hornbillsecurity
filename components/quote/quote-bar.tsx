"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBasket } from "lucide-react";

import { formatKes } from "@/lib/money";

/**
 * docs/04 §QuoteBar — a sticky bar showing the count and running total once the
 * quote basket is non-empty.
 *
 * A client component, and deliberately so. The basket lives behind a cookie, and
 * reading a cookie in the root layout would make every page in the site
 * dynamically rendered — including the 126 catalogue, package and item pages
 * whose whole value is being static HTML with prices in it (CLAUDE.md §2.1).
 *
 * So the pages stay static and the bar fetches its own state after hydration.
 * It is an affordance, not content: nothing a crawler or an answer engine needs
 * is inside it, and a visitor with no JavaScript still has "Add to quote"
 * buttons that work and a /quote page that shows everything.
 */

type Summary = { count: number; total: number };

/** Lets the add-to-quote button refresh the bar without a full navigation. */
export const QUOTE_UPDATED_EVENT = "hornbill:quote-updated";

export function QuoteBar() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/quote/summary", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as Summary;
        if (!cancelled) setSummary(data);
      } catch {
        // A summary that will not load is not worth an error to the visitor.
      }
    }

    void load();
    window.addEventListener(QUOTE_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(QUOTE_UPDATED_EVENT, load);
    };
  }, [pathname]);

  // Hidden on /quote itself, where the whole page is the basket.
  if (!summary || summary.count === 0 || pathname === "/quote") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-ink text-paper shadow-lg">
      <div className="mx-auto flex max-w-(--container-page) flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="flex items-center gap-2 text-sm">
          <ShoppingBasket className="size-4 shrink-0 text-brand-gold" aria-hidden="true" />
          <span>
            <strong className="font-semibold tabular-nums">{summary.count}</strong>{" "}
            {summary.count === 1 ? "line" : "lines"} in your quote
          </span>
          <span className="font-semibold text-brand-gold tabular-nums">
            {formatKes(summary.total)}
          </span>
          <span className="hidden text-paper/70 sm:inline">excl. VAT</span>
        </p>

        {/* Sits clear of the WhatsApp FAB in the bottom-right corner. */}
        <Link
          href="/quote"
          className="mr-16 inline-flex h-10 items-center rounded-control bg-brand-orange px-4 text-sm font-semibold text-ink transition-colors hover:bg-brand-amber sm:mr-20"
        >
          Review and send
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Camera, Check } from "lucide-react";

import { formatKes } from "@/lib/money";
import type { SolutionDetail } from "@/lib/catalog/solutions";

/**
 * docs/04 §SolutionCard — name, "from KES X", camera count, best-for tags, and a
 * CTA to the full bill of materials.
 *
 * The price shown is the VAT-exclusive total, because that is how every quote in
 * this market is written and how the rest of the site prices. The card says so
 * rather than leaving it ambiguous.
 */
export function SolutionCard({ solution }: { solution: SolutionDetail }) {
  return (
    <article className="group relative flex h-full flex-col gap-3 rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-pill bg-paper-warm px-2 py-0.5 font-medium text-ink capitalize">
          {solution.tier}
        </span>
        {solution.cameraCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Camera className="size-3.5" aria-hidden="true" />
            {solution.cameraCount} camera{solution.cameraCount === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <h3 className="font-display text-lg font-semibold text-ink">
        <Link href={`/solutions/${solution.slug}`}>
          <span className="absolute inset-0" aria-hidden="true" />
          {solution.name}
        </Link>
      </h3>

      <p className="text-sm text-muted-foreground">{solution.summary}</p>

      {solution.bestFor.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {solution.bestFor.slice(0, 2).map((reason) => (
            <li key={reason} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              {reason}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-auto pt-2">
        <span className="text-xl font-semibold text-ink tabular-nums">
          {formatKes(solution.total)}
        </span>{" "}
        <span className="text-sm text-muted-foreground">
          installed, excluding {solution.bom.vatRate}% VAT
        </span>
      </p>

      <p className="text-sm font-medium text-action">See every line →</p>
    </article>
  );
}

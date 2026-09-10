import { AlertTriangle, ArrowRight } from "lucide-react";

import type { PricePanel } from "@/lib/admin/items";
import { formatKes } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * The price panel — docs/08 Sprint 4 asks for this one by name.
 *
 * "shows cost_price, markup, computed price, market_ceiling_price and effective
 * price together, and warns in-line when the computed price would exceed the
 * ceiling."
 *
 * All five in a row, because the interesting case is when they disagree. The
 * EZVIZ solar kit costs 13,000, computes to 18,200, and sells at 16,500 because
 * Jumia lists it at 17,499. Showing only the effective price hides the reason,
 * and the reason is the whole of CLAUDE.md §5 — the base matters more than the
 * multiplier, and on consumer SKUs a 40% markup lands above the market.
 */
export function PricePanelDisplay({ panel }: { panel: PricePanel }) {
  const steps = [
    { label: "Cost", value: panel.costPrice, tone: "private" as const },
    { label: `× ${panel.markupMultiplier}`, value: panel.computed, tone: "normal" as const },
    { label: "Ceiling", value: panel.marketCeilingPrice, tone: "normal" as const },
    ...(panel.priceOverride !== null
      ? [{ label: "Override", value: panel.priceOverride, tone: "normal" as const }]
      : []),
    { label: "Sells at", value: panel.effective, tone: "final" as const },
  ];

  return (
    <div
      className={cn(
        "rounded-card border p-4",
        panel.overCeiling ? "border-warn/40 bg-warn/5" : "border-line bg-paper-warm",
      )}
    >
      <ol className="flex flex-wrap items-end gap-x-2 gap-y-3">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-end gap-2">
            {index > 0 ? (
              <ArrowRight
                className="mb-1.5 size-3.5 shrink-0 text-muted-foreground/60"
                aria-hidden="true"
              />
            ) : null}
            <div>
              <p
                className={cn(
                  "text-xs",
                  step.tone === "private" ? "font-medium text-danger" : "text-muted-foreground",
                )}
              >
                {step.label}
                {step.tone === "private" ? " · private" : ""}
              </p>
              <p
                className={cn(
                  "tabular-nums",
                  step.tone === "final"
                    ? "text-lg font-semibold text-ink"
                    : "text-sm font-medium text-ink",
                )}
              >
                {step.value === null ? "—" : formatKes(step.value)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {panel.overCeiling ? (
        <p className="mt-3 flex gap-2 text-sm text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            The markup puts this{" "}
            <strong className="font-semibold tabular-nums">
              {formatKes(panel.ceilingReduction)}
            </strong>{" "}
            above the ceiling, so it sells at the ceiling instead. Margin on the hardware is thin
            here — price the installation and app onboarding as a visible line instead.
          </span>
        </p>
      ) : null}

      {panel.effective === null ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No price yet, so this item cannot appear on the site whatever its published flag says.
          Give it a cost or an override.
        </p>
      ) : null}
    </div>
  );
}

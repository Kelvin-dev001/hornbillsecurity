import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * One question in the builder, rendered as a row of links.
 *
 * Links rather than a client-side control, so the whole builder is a server
 * component: every configuration has a real URL, the bill of materials is in the
 * initial HTML, and it works with JavaScript off on a mid-range Android
 * (CLAUDE.md §2.1). Answering a question is a navigation, and Next's router
 * makes it feel like a state change.
 */
export function BuilderQuestion({
  number,
  question,
  hint,
  options,
}: {
  /** Omitted for the line-level swaps, which are not one of the six questions. */
  number?: number;
  question: string;
  hint?: string;
  options: { label: string; href: string; active: boolean; sublabel?: string }[];
}) {
  return (
    <fieldset className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <legend className="sr-only">{question}</legend>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {number !== undefined ? (
          <span
            aria-hidden="true"
            className="font-display text-xs font-semibold text-muted-foreground tabular-nums"
          >
            {number}
          </span>
        ) : null}
        <span className="font-display text-base font-semibold text-ink">{question}</span>
        {hint ? <span className="text-sm text-muted-foreground">{hint}</span> : null}
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <li key={option.href + option.label}>
            <Link
              href={option.href}
              aria-current={option.active ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 flex-col justify-center rounded-control border px-3 py-1.5 text-sm transition-colors",
                option.active
                  ? "border-brand-orange bg-brand-orange text-ink"
                  : "border-line text-muted-foreground hover:border-ink hover:text-ink",
              )}
            >
              <span className={cn(option.active && "font-semibold")}>{option.label}</span>
              {option.sublabel ? (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    option.active ? "text-ink/70" : "text-muted-foreground/80",
                  )}
                >
                  {option.sublabel}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

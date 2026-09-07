import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { addToQuoteAction } from "@/lib/quote/actions";
import { cn } from "@/lib/utils";

/**
 * "Add to quote" — docs/05 Sprint 3: on every item and solution.
 *
 * A server component wrapping a plain form. Next progressively enhances it, so
 * with JavaScript it posts in the background and with none the browser posts it
 * and follows the redirect — either way the line lands in the basket. That
 * matters more than it sounds on a site whose audience is mid-range Android on
 * metered data.
 *
 * The action redirects to /quote rather than staying put. Somebody who has just
 * said "add this" wants to see the total, and a static page has no way to
 * acknowledge the click otherwise.
 */
export function AddToQuote({
  kind,
  reference,
  quantity = 1,
  label = "Add to quote",
  variant = "default",
  className,
}: {
  kind: "item" | "solution";
  /** The item or solution slug. */
  reference: string;
  quantity?: number;
  label?: string;
  variant?: "default" | "outline";
  className?: string;
}) {
  return (
    <form action={addToQuoteAction} className={cn("contents", className)}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="ref" value={reference} />
      <input type="hidden" name="quantity" value={quantity} />
      <Button type="submit" size="cta" variant={variant} className="w-full">
        <Plus aria-hidden="true" />
        {label}
      </Button>
    </form>
  );
}

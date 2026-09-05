import { formatPricesUpdated, formatVatRate } from "@/lib/site-settings";
import type { SiteSettings } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * "Prices updated September 2026 · KES, excluding 16% VAT"
 *
 * docs/04 §PriceStamp: this sits beside every price block. It is a trust device
 * and a freshness signal, and competitors almost universally omit it. The date
 * comes from site_settings.prices_updated_at, which the owner sets on each
 * monthly review, and the <time> element carries the machine-readable form so it
 * doubles as the dateModified signal a crawler reads.
 */
export function PriceStamp({
  settings,
  className,
}: {
  settings: SiteSettings;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      Prices updated{" "}
      <time dateTime={settings.pricesUpdatedAt.toISOString()} className="font-medium text-ink">
        {formatPricesUpdated(settings.pricesUpdatedAt)}
      </time>{" "}
      · KES, excluding {formatVatRate(settings.vatRate)}% VAT
    </p>
  );
}

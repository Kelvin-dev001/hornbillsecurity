import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";

import { AdminHeading, Field, FormMessage, Panel, inputClass } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { listBrandOptions, listCategoryOptions } from "@/lib/admin/items";
import { applyAdjustmentAction } from "@/lib/admin/price-actions";
import { previewAdjustment } from "@/lib/admin/price-review";
import { formatKes } from "@/lib/money";
import { getSiteSettings } from "@/lib/site-settings";
import { formatPricesUpdated } from "@/lib/site-settings";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Price review" };

/**
 * The monthly price review, on one screen.
 *
 * docs/01 §7: prices are reviewed monthly and the review updates the visible
 * "Prices updated {Month Year}" stamp. This is that review — filter, set a
 * percentage, look at every before and after, then commit.
 *
 * The preview is a GET, so nothing happens until the owner posts the form he can
 * see. Applying takes the previewed rows by id rather than re-running the
 * filter, so what commits is exactly what was on screen.
 */
export default async function PriceReviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const percent = Number(params.percent ?? "");
  const hasPreview = Number.isFinite(percent) && percent !== 0;

  const [categories, brands, settings] = await Promise.all([
    listCategoryOptions(),
    listBrandOptions(),
    getSiteSettings(),
  ]);

  const changes = hasPreview
    ? await previewAdjustment({
        percent,
        categoryId: params.category || undefined,
        brandId: params.brand || undefined,
        onlyDistributor: params.onlyDistributor === "on",
      })
    : [];

  const capped = changes.filter((change) => change.cappedByCeiling);
  const unchanged = changes.filter((change) => change.priceBefore === change.priceAfter);

  return (
    <>
      <AdminHeading
        title="Price review"
        description={`Last reviewed ${formatPricesUpdated(settings.pricesUpdatedAt)}. Move distributor costs by a percentage; the markup, the ceilings and every package re-price themselves.`}
      />

      <FormMessage status={params.status} />

      <Panel className="mb-6">
        <form className="flex flex-wrap items-end gap-4">
          <Field label="Change by" name="percent" className="w-32">
            <div className="flex items-center gap-2">
              <input
                id="percent"
                name="percent"
                type="number"
                step="0.5"
                defaultValue={params.percent ?? ""}
                placeholder="5"
                className={cn(inputClass, "tabular-nums")}
              />
              <span className="text-muted-foreground">%</span>
            </div>
          </Field>

          <Field label="Category" name="category" className="w-56">
            <select id="category" name="category" defaultValue={params.category ?? ""} className={inputClass}>
              <option value="">Everything</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Brand" name="brand" className="w-48">
            <select id="brand" name="brand" defaultValue={params.brand ?? ""} className={inputClass}>
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex items-center gap-2 pb-3">
            <input
              id="onlyDistributor"
              name="onlyDistributor"
              type="checkbox"
              defaultChecked={params.onlyDistributor !== undefined}
              className="size-4 accent-[var(--brand-orange)]"
            />
            <label htmlFor="onlyDistributor" className="text-sm text-ink">
              Only real distributor costs
            </label>
          </div>

          <Button type="submit" size="cta" variant="outline">
            Preview
          </Button>
        </form>
      </Panel>

      {hasPreview ? (
        changes.length === 0 ? (
          <p className="text-muted-foreground">Nothing matches those filters.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm">
              <p className="flex items-center gap-2 font-medium text-ink">
                {percent > 0 ? (
                  <TrendingUp className="size-4 text-warn" aria-hidden="true" />
                ) : (
                  <TrendingDown className="size-4 text-success" aria-hidden="true" />
                )}
                {changes.length} {changes.length === 1 ? "item" : "items"}, {percent > 0 ? "+" : ""}
                {percent}%
              </p>
              {capped.length > 0 ? (
                <p className="flex items-center gap-2 text-warn">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  {capped.length} held at a market ceiling
                </p>
              ) : null}
              {unchanged.length > 0 ? (
                <p className="text-muted-foreground">
                  {unchanged.length} with no change to the public price
                </p>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-card border border-line bg-paper">
              <table className="w-full min-w-[48rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-paper-warm text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-4 py-2 font-semibold">Model</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Item</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Cost now</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Cost after</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Sells now</th>
                    <th scope="col" className="px-4 py-2 text-right font-semibold">Sells after</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change) => (
                    <tr key={change.id} className="border-b border-line/70 last:border-0">
                      <th scope="row" className="px-4 py-2.5 text-left font-mono text-xs font-normal text-action">
                        {change.sku}
                      </th>
                      <td className="px-4 py-2.5 text-ink">{change.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {formatKes(change.costBefore)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-ink">
                        {formatKes(change.costAfter)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                        {change.priceBefore === null ? "—" : formatKes(change.priceBefore)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-right font-semibold tabular-nums",
                          change.cappedByCeiling
                            ? "text-warn"
                            : change.priceAfter === change.priceBefore
                              ? "text-muted-foreground"
                              : "text-ink",
                        )}
                      >
                        {change.priceAfter === null ? "—" : formatKes(change.priceAfter)}
                        {change.cappedByCeiling ? " °" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form action={applyAdjustmentAction} className="mt-6 flex flex-wrap items-center gap-4">
              <input
                type="hidden"
                name="changes"
                value={JSON.stringify(
                  changes.map((change) => ({ id: change.id, costAfter: change.costAfter })),
                )}
              />
              <Button type="submit" size="cta">
                Apply to {changes.length} {changes.length === 1 ? "item" : "items"}
              </Button>
              <p className="text-sm text-muted-foreground">
                This also stamps today as the review date, which is what the site shows beside
                every price.
              </p>
            </form>
          </>
        )
      ) : (
        <p className="text-muted-foreground">
          Enter a percentage to see exactly what would change before anything does.
        </p>
      )}
    </>
  );
}

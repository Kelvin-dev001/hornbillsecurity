import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";

import { AdminHeading, FormMessage, inputClass } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { listBrandOptions, listCategoryOptions, listItems } from "@/lib/admin/items";
import { togglePublishedAction } from "@/lib/admin/item-actions";
import { formatKes } from "@/lib/money";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Items" };

/**
 * The item list.
 *
 * Filters are a GET form, so a filtered view is a URL the owner can bookmark —
 * "everything unpublished", "everything on a placeholder price" — and come back
 * to next month. The publish switch posts from the row itself, because the
 * monthly review is mostly flipping those and opening a form for each one is how
 * a review stops happening.
 */
export default async function AdminItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const [rows, categories, brands] = await Promise.all([
    listItems({
      search: params.q,
      categoryId: params.category,
      brandId: params.brand,
      published: params.published === "yes" || params.published === "no" ? params.published : undefined,
      basis: params.basis as never,
    }),
    listCategoryOptions(),
    listBrandOptions(),
  ]);

  const overCeiling = rows.filter((row) => row.overCeiling).length;
  const unpriced = rows.filter((row) => row.effectivePrice === null).length;

  return (
    <>
      <AdminHeading
        title="Items"
        description={`${rows.length} shown · ${rows.filter((r) => r.published).length} published`}
      >
        <Button asChild size="cta">
          <Link href="/admin/items/new">
            <Plus aria-hidden="true" />
            New item
          </Link>
        </Button>
      </AdminHeading>

      <FormMessage status={params.status} />

      {overCeiling > 0 ? (
        <p className="mb-4 flex gap-2 rounded-card border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {overCeiling} {overCeiling === 1 ? "item is" : "items are"} priced at their market
            ceiling rather than cost × markup. That is working as intended — the margin is in the
            installation.
          </span>
        </p>
      ) : null}

      <form className="mb-6 flex flex-wrap gap-2 rounded-card border border-line bg-paper p-4">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Model number or name"
          className={cn(inputClass, "min-w-48 flex-1")}
          aria-label="Search items"
        />
        <select name="category" defaultValue={params.category ?? ""} className={cn(inputClass, "w-auto")} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select name="brand" defaultValue={params.brand ?? ""} className={cn(inputClass, "w-auto")} aria-label="Brand">
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <select name="published" defaultValue={params.published ?? ""} className={cn(inputClass, "w-auto")} aria-label="Published">
          <option value="">Published or not</option>
          <option value="yes">Published</option>
          <option value="no">Not published</option>
        </select>
        <Button type="submit" size="cta" variant="outline">
          Filter
        </Button>
      </form>

      {unpriced > 0 ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {unpriced} of these have no price, so they cannot appear on the site whatever the
          publish switch says.{" "}
          <Link href="/admin/items?published=no" className="text-action hover:underline">
            Show everything unpublished
          </Link>
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-card border border-line bg-paper">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-paper-warm text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th scope="col" className="px-4 py-2 font-semibold">Model</th>
              <th scope="col" className="px-4 py-2 font-semibold">Item</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">Cost</th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">Sells at</th>
              <th scope="col" className="px-4 py-2 font-semibold">Basis</th>
              <th scope="col" className="px-4 py-2 font-semibold">Live</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line/70 last:border-0 align-top">
                <th scope="row" className="px-4 py-3 text-left font-normal">
                  <Link
                    href={`/admin/items/${row.id}`}
                    className="font-mono text-xs tracking-tight text-action hover:underline"
                  >
                    {row.sku}
                  </Link>
                </th>
                <td className="px-4 py-3">
                  <Link href={`/admin/items/${row.id}`} className="font-medium text-ink hover:underline">
                    {row.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    {row.categoryName}
                    {row.brandName ? ` · ${row.brandName}` : ""}
                  </span>
                </td>
                {/* Cost is visible here and nowhere the public can reach. */}
                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                  {row.costPrice === null ? "—" : formatKes(row.costPrice)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums",
                    row.overCeiling ? "text-warn" : "text-ink",
                  )}
                >
                  {row.effectivePrice === null ? "—" : formatKes(row.effectivePrice)}
                  {row.overCeiling ? <span title="Capped at the market ceiling"> °</span> : null}
                </td>
                <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                  {row.priceBasis.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3">
                  <form action={togglePublishedAction}>
                    <input type="hidden" name="id" value={row.id} />
                    <input type="hidden" name="returnTo" value="/admin/items?status=saved" />
                    {row.published ? null : <input type="hidden" name="published" value="on" />}
                    <button
                      type="submit"
                      disabled={row.effectivePrice === null && !row.published}
                      className={cn(
                        "rounded-pill px-2.5 py-1 text-xs font-medium transition-colors",
                        row.published
                          ? "bg-success/10 text-success hover:bg-success/20"
                          : "bg-ink/5 text-muted-foreground hover:bg-ink/10 disabled:opacity-50",
                      )}
                    >
                      {row.published ? "Live" : "Hidden"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-muted-foreground">Nothing matches those filters.</p>
      ) : null}
    </>
  );
}

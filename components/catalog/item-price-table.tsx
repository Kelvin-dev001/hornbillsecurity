import Link from "next/link";

import { unitShort } from "@/lib/catalog/format";
import type { CatalogItem } from "@/lib/catalog/types";
import { formatKes } from "@/lib/site-settings";

/**
 * A real HTML <table> of prices.
 *
 * CLAUDE.md §2.2: "Real HTML <table> elements for all pricing and BOM data. Not
 * divs, not grids. Tables are what AI answer engines lift." docs/04 calls
 * PriceTable "the single most important component on the site".
 *
 * So the catalogue shows both: cards for a person browsing on a phone, and this
 * table underneath for the reader — human or machine — who wants the whole list
 * with every model number and every figure in one place. It is entirely
 * server-rendered and appears in view-source.
 *
 * docs/04 §Layout: the table scrolls inside its own container so the page body
 * never scrolls sideways.
 */
export function ItemPriceTable({
  items,
  caption,
}: {
  items: CatalogItem[];
  caption: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[44rem] border-collapse text-sm">
        <caption className="border-b border-line bg-paper-warm px-4 py-3 text-left font-display text-base font-semibold text-ink">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-line bg-paper-warm text-left text-xs tracking-wide text-muted-foreground uppercase">
            <th scope="col" className="px-4 py-2 font-semibold">
              Model
            </th>
            <th scope="col" className="px-4 py-2 font-semibold">
              Item
            </th>
            <th scope="col" className="px-4 py-2 font-semibold">
              Key specification
            </th>
            <th scope="col" className="px-4 py-2 font-semibold">
              Unit
            </th>
            <th scope="col" className="px-4 py-2 text-right font-semibold">
              Price (KES)
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-line last:border-0 even:bg-paper-warm/50">
              <th scope="row" className="px-4 py-3 text-left align-top font-normal">
                <Link
                  href={`/catalog/item/${item.slug}`}
                  className="font-mono text-xs tracking-tight text-action hover:underline"
                >
                  {item.sku}
                </Link>
              </th>
              <td className="px-4 py-3 align-top">
                <span className="block font-medium text-ink">{item.name}</span>
                {item.brand ? (
                  <span className="text-xs text-muted-foreground">{item.brand.name}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 align-top text-muted-foreground">
                {item.shortDescription}
              </td>
              <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                {unitShort(item.unit)}
              </td>
              <td className="px-4 py-3 text-right align-top font-semibold whitespace-nowrap text-ink tabular-nums">
                {formatKes(item.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

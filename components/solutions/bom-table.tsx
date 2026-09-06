import Link from "next/link";

import type { Bom } from "@/lib/pricing/bom";
import { formatKes } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * The bill of materials, as one real HTML table.
 *
 * docs/01 §1: "A page showing '4 × DS-2CD1043G2-LIUF/SL @ 11,900 = 47,600'
 * alongside cable metres, accessories, labour and a total does not exist in
 * Kenya today." This is that page's table, and it is the product.
 *
 * docs/04 §BOMTable: grouped by line type with visual separation, columns
 * Item · Spec · Qty · Unit price · Total, a footer carrying subtotal, VAT and
 * total, tabular numerals, and an overflow-x wrapper so the page body never
 * scrolls sideways.
 *
 * Entirely server-rendered. CLAUDE.md §2.1 and §2.2 — this table is what an
 * answer engine lifts, and ChatGPT does not execute JavaScript.
 */
export function BomTable({
  bom,
  caption,
  depositPercent,
}: {
  bom: Bom;
  caption: string;
  depositPercent: number;
}) {
  const deposit = Math.round((bom.total * depositPercent) / 100);

  return (
    <figure className="m-0">
      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <caption className="border-b border-line bg-paper-warm px-4 py-3 text-left font-display text-base font-semibold text-ink">
            {caption}
          </caption>

          <thead>
            <tr className="border-b border-line bg-paper-warm text-left text-xs tracking-wide text-muted-foreground uppercase">
              <th scope="col" className="px-4 py-2 font-semibold">
                Item
              </th>
              <th scope="col" className="px-4 py-2 font-semibold">
                Spec
              </th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">
                Qty
              </th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">
                Unit price
              </th>
              <th scope="col" className="px-4 py-2 text-right font-semibold">
                Total
              </th>
            </tr>
          </thead>

          {bom.groups.map((group) => (
            <tbody key={group.lineType} className="border-b border-line last:border-0">
              <tr>
                <th
                  scope="colgroup"
                  colSpan={5}
                  className="border-y border-line bg-ink/[0.03] px-4 py-2 text-left font-display text-xs font-semibold tracking-wide text-ink uppercase"
                >
                  {group.label}
                </th>
              </tr>

              {group.lines.map((line) => (
                <tr key={line.id} className="border-b border-line/70 last:border-0 align-top">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="block font-medium text-ink">{line.name}</span>
                    {line.sku ? (
                      <Link
                        href={line.href as string}
                        className="font-mono text-xs tracking-tight text-action hover:underline"
                      >
                        {line.sku}
                      </Link>
                    ) : null}
                    {line.note ? (
                      <span className="mt-1 block text-xs text-muted-foreground">{line.note}</span>
                    ) : null}
                  </th>

                  <td className="px-4 py-3 text-muted-foreground">
                    {line.spec}
                    {line.provisional ? (
                      <sup className="ml-0.5 font-semibold text-warn" title="Estimated price">
                        °
                      </sup>
                    ) : null}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-ink">
                    {line.quantity}
                    <span className="ml-1 text-xs text-muted-foreground">{line.unit}</span>
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatKes(line.unitPrice)}
                  </td>

                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums text-ink">
                    {formatKes(line.extended)}
                  </td>
                </tr>
              ))}

              <tr className="bg-paper-warm/60">
                <td colSpan={4} className="px-4 py-2 text-right text-xs text-muted-foreground">
                  {group.label} subtotal
                </td>
                <td className="px-4 py-2 text-right text-xs font-semibold whitespace-nowrap tabular-nums text-ink">
                  {formatKes(group.subtotal)}
                </td>
              </tr>
            </tbody>
          ))}

          <tfoot className="bg-paper-warm">
            <tr className="border-t-2 border-ink/20">
              <td colSpan={4} className="px-4 py-2 text-right text-sm text-muted-foreground">
                Equipment and materials
              </td>
              <td className="px-4 py-2 text-right text-sm whitespace-nowrap tabular-nums text-ink">
                {formatKes(bom.subtotalItems)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-sm text-muted-foreground">
                Installation and labour
              </td>
              <td className="px-4 py-2 text-right text-sm whitespace-nowrap tabular-nums text-ink">
                {formatKes(bom.subtotalLabour)}
              </td>
            </tr>
            <tr className="border-t border-line">
              <td colSpan={4} className="px-4 py-2 text-right text-sm font-semibold text-ink">
                Subtotal, excluding VAT
              </td>
              <td className="px-4 py-2 text-right text-sm font-semibold whitespace-nowrap tabular-nums text-ink">
                {formatKes(bom.subtotal)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-sm text-muted-foreground">
                VAT at {bom.vatRate}%
              </td>
              <td className="px-4 py-2 text-right text-sm whitespace-nowrap tabular-nums text-muted-foreground">
                {formatKes(bom.vatAmount)}
              </td>
            </tr>
            <tr className="border-t border-line bg-ink text-paper">
              <td colSpan={4} className="px-4 py-3 text-right font-display font-semibold">
                Total, including VAT
              </td>
              <td className="px-4 py-3 text-right font-display text-lg font-semibold whitespace-nowrap tabular-nums text-brand-gold">
                {formatKes(bom.total)}
              </td>
            </tr>
            <tr>
              <td colSpan={4} className="px-4 py-2 text-right text-xs text-muted-foreground">
                {depositPercent}% deposit to start
              </td>
              <td className="px-4 py-2 text-right text-xs whitespace-nowrap tabular-nums text-ink">
                {formatKes(deposit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <figcaption className="mt-3 space-y-2 text-xs text-muted-foreground">
        <p>
          Indicative estimate, confirmed at site survey. Quantities come from published rules —
          cable at 30 m per camera on a house and 45 m on a commercial site, plus 15% for drops and
          re-runs — and a real building never matches a rule exactly.
        </p>
        {bom.provisionalAmount > 0 ? (
          <ProvisionalNote bom={bom} />
        ) : null}
      </figcaption>
    </figure>
  );
}

/**
 * Says plainly which prices are ours and which are estimates, and how much of
 * the total is affected.
 *
 * The consumables carry estimated trade prices until the owner supplies his
 * supplier's list (db/seed/consumables.ts, docs/09 item 29). Naming the share
 * is the honest version of a footnote — CLAUDE.md §6: honesty about limits is
 * the strongest trust signal on the site.
 */
function ProvisionalNote({ bom }: { bom: Bom }) {
  const percent = Math.round(bom.provisionalShare * 100);

  return (
    <p className={cn("rounded-control border border-line bg-paper-warm px-3 py-2")}>
      <span className="font-semibold text-warn">°</span> Lines marked ° are consumables priced at
      prevailing Mombasa trade rates while we confirm our supplier&rsquo;s current list — about{" "}
      <strong className="font-semibold text-ink tabular-nums">{percent}%</strong> of this total.
      Every camera, recorder, drive and labour figure is our own price.
    </p>
  );
}

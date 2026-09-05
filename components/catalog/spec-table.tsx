import { Fragment } from "react";

import type { ItemSpec } from "@/db/schema";

/**
 * docs/04 §SpecTable — a real <table> built from items.specs, grouped.
 *
 * The group headings are rendered as full-width header rows rather than as
 * separate tables, so the whole specification is one table a crawler can lift
 * intact, and a screen reader gets one coherent structure instead of eight.
 */
export function SpecTable({ specs }: { specs: ItemSpec[] }) {
  if (specs.length === 0) return null;

  const groups = new Map<string, ItemSpec[]>();
  for (const spec of specs) {
    const bucket = groups.get(spec.group) ?? [];
    bucket.push(spec);
    groups.set(spec.group, bucket);
  }

  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Specification</caption>
        <tbody>
          {[...groups].map(([group, rows]) => (
            <Fragment key={group}>
              <tr className="bg-paper-warm">
                <th
                  scope="colgroup"
                  colSpan={2}
                  className="border-y border-line px-4 py-2 text-left font-display text-xs font-semibold tracking-wide text-ink uppercase"
                >
                  {group}
                </th>
              </tr>
              {rows.map((spec) => (
                <tr key={`${group}-${spec.label}`} className="border-b border-line last:border-0">
                  <th
                    scope="row"
                    className="w-2/5 px-4 py-2.5 text-left align-top font-medium text-muted-foreground"
                  >
                    {spec.label}
                  </th>
                  <td className="px-4 py-2.5 align-top text-ink">{spec.value}</td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

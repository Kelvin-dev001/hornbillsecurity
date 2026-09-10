import Link from "next/link";
import { AlertTriangle, Download, FileUp } from "lucide-react";

import { AdminHeading, FormMessage, Panel, TextArea } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { applyImportAction } from "@/lib/admin/csv-actions";
import { CSV_COLUMNS, planImport } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import prices" };

/**
 * CSV import, with the same look-then-commit shape as the price review.
 *
 * A spreadsheet round-trip is where a stray column shift silently rewrites three
 * hundred prices, so nothing is written until the owner has seen every field
 * that would move. The text is pasted rather than uploaded: it keeps the whole
 * flow inside one form post, and it means the file that produced the report is
 * byte for byte the file that gets applied.
 */
export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const csv = params.csv ?? "";
  const report = csv.trim() ? await planImport(csv) : null;

  return (
    <>
      <AdminHeading
        title="Import prices"
        description="Paste a CSV in the same shape as your price list. Nothing changes until you have seen what would."
      >
        <Button asChild variant="outline" size="cta">
          <a href="/api/admin/items/export">
            <Download aria-hidden="true" />
            Export current
          </a>
        </Button>
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/items">Back to items</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={params.status === "saved" ? "saved" : params.status} />

      {params.changed ? (
        <p className="mb-6 text-sm text-muted-foreground">
          {params.changed} {params.changed === "1" ? "item" : "items"} updated.
        </p>
      ) : null}

      <Panel
        title="Paste the CSV"
        description={`The header must be exactly: ${CSV_COLUMNS.join(", ")}`}
        className="mb-6"
      >
        <form method="get" className="space-y-4">
          <TextArea
            name="csv"
            rows={10}
            defaultValue={csv}
            placeholder={`${CSV_COLUMNS.join(",")}\nDS-2CD1043G2-LIUF/SL,Hikvision,4MP Bullet,IP Camera,Bullet,4MP; 30m,8500,11900,distributor+40%,`}
          />
          <Button type="submit" size="cta" variant="outline">
            <FileUp aria-hidden="true" />
            Show me what would change
          </Button>
        </form>
      </Panel>

      {report ? (
        <>
          {report.skipped.length > 0 ? (
            <Panel title={`${report.skipped.length} skipped`} className="mb-6 border-warn/40">
              <ul className="space-y-1 text-sm">
                {report.skipped.map((entry, index) => (
                  <li key={`${entry.sku}-${index}`} className="flex gap-2 text-warn">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="font-mono">{entry.sku}</strong> — {entry.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {report.updated.length > 0 ? (
            <Panel title={`${report.updated.length} changes`} className="mb-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs tracking-wide text-muted-foreground uppercase">
                      <th scope="col" className="py-2 pr-4 font-semibold">Model</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Field</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Now</th>
                      <th scope="col" className="py-2 font-semibold">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.updated.map((change, index) => (
                      <tr key={index} className="border-b border-line/60 last:border-0">
                        <th scope="row" className="py-2 pr-4 text-left font-mono text-xs font-normal text-action">
                          {change.sku}
                        </th>
                        <td className="py-2 pr-4 text-muted-foreground">{change.field}</td>
                        <td className="py-2 pr-4 tabular-nums text-muted-foreground">{change.from}</td>
                        <td className="py-2 font-medium tabular-nums text-ink">{change.to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form action={applyImportAction} className="mt-6">
                <input type="hidden" name="csv" value={csv} />
                <Button type="submit" size="cta">
                  Apply these {report.updated.length} changes
                </Button>
              </form>
            </Panel>
          ) : (
            <p className="text-muted-foreground">
              Nothing in that file differs from what is already here.
            </p>
          )}
        </>
      ) : null}
    </>
  );
}

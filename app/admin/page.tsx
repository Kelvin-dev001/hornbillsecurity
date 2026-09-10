import Link from "next/link";
import { AlertTriangle, Clock, Package, Percent } from "lucide-react";

import { AdminHeading, Panel } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { countItems, listItems } from "@/lib/admin/items";
import { dueFollowUps, listLeads, pipelineCounts } from "@/lib/admin/leads";
import { formatKes } from "@/lib/money";
import { formatPricesUpdated, getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Overview" };

/**
 * The overview.
 *
 * Two questions, in the order the owner actually asks them: who is waiting to
 * hear from me, and is anything on the site wrong. Everything else is a tab.
 */
export default async function AdminOverviewPage() {
  await requireAdmin();

  const [settings, counts, pipeline, due, allItems, recent] = await Promise.all([
    getSiteSettings(),
    countItems(),
    pipelineCounts(),
    dueFollowUps(),
    listItems(),
    listLeads(),
  ]);

  const newLeads = pipeline.new ?? 0;
  const unpriced = allItems.filter((item) => item.effectivePrice === null).length;
  const provisional = allItems.filter(
    (item) => item.priceBasis === "placeholder" && item.published,
  ).length;

  const reviewedDaysAgo = Math.floor(
    (Date.now() - settings.pricesUpdatedAt.getTime()) / (24 * 60 * 60 * 1000),
  );

  return (
    <>
      <AdminHeading
        title="Overview"
        description={`${counts.published} of ${counts.total} items are live. Prices last reviewed ${formatPricesUpdated(settings.pricesUpdatedAt)}.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Panel>
          <p className="text-sm text-muted-foreground">Waiting to be called</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">{newLeads}</p>
          <Link href="/admin/leads?status=new" className="mt-2 inline-block text-sm text-action hover:underline">
            Open new leads
          </Link>
        </Panel>

        <Panel>
          <p className="text-sm text-muted-foreground">Due to follow up</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">{due.length}</p>
          <Link href="/admin/leads" className="mt-2 inline-block text-sm text-action hover:underline">
            Open the pipeline
          </Link>
        </Panel>

        <Panel>
          <p className="text-sm text-muted-foreground">Days since the price review</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">{reviewedDaysAgo}</p>
          <Link href="/admin/prices" className="mt-2 inline-block text-sm text-action hover:underline">
            Start a review
          </Link>
        </Panel>
      </div>

      {due.length > 0 ? (
        <Panel title="Due today or overdue" className="mb-6 border-warn/40">
          <ul className="space-y-2 text-sm">
            {due.slice(0, 8).map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center gap-2">
                <Clock className="size-4 shrink-0 text-warn" aria-hidden="true" />
                <Link href={`/admin/leads/${lead.code}`} className="font-mono text-action hover:underline">
                  {lead.code}
                </Link>
                <span className="text-ink">{lead.customerName}</span>
                <span className="text-muted-foreground">
                  {lead.area} · {formatKes(lead.total)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {reviewedDaysAgo > 45 ? (
        <p className="mb-6 flex gap-2 rounded-card border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          <Percent className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Prices were last reviewed {reviewedDaysAgo} days ago. The site shows that date beside
            every price, and it is one of the few things competitors never publish — a stale one
            works against you.
          </span>
        </p>
      ) : null}

      {provisional > 0 ? (
        <p className="mb-6 flex gap-2 rounded-card border border-warn/30 bg-warn/5 px-4 py-3 text-sm text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {provisional} live {provisional === 1 ? "item is" : "items are"} on an estimated price
            and marked as such on every bill of materials.{" "}
            <Link href="/admin/items?basis=placeholder" className="underline">
              Price them properly
            </Link>{" "}
            and the marks disappear.
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Recent quotations">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              None yet. They arrive the moment somebody sends one from the site.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recent.slice(0, 6).map((lead) => (
                <li key={lead.id} className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/admin/leads/${lead.code}`} className="font-mono text-action hover:underline">
                    {lead.code}
                  </Link>
                  <span className="flex-1 truncate text-ink">{lead.customerName}</span>
                  <span className="tabular-nums text-muted-foreground">{formatKes(lead.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="The catalogue">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Live on the site</span>
              <span className="font-medium tabular-nums text-ink">{counts.published}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Held back, no price</span>
              <span className="font-medium tabular-nums text-ink">{unpriced}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">On an estimated price</span>
              <span className="font-medium tabular-nums text-ink">{provisional}</span>
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="cta">
              <Link href="/admin/items">
                <Package aria-hidden="true" />
                Items
              </Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/admin/items/import">Import prices</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

import Link from "next/link";
import { Clock, ExternalLink, MessageCircle, Phone } from "lucide-react";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { requireAdmin } from "@/lib/admin/auth";
import { listLeads, pipelineCounts, PIPELINE } from "@/lib/admin/leads";
import { formatKes } from "@/lib/money";
import { formatKenyanMobile } from "@/lib/quote/phone";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";
import type { QuoteStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Leads" };

/**
 * The lead pipeline.
 *
 * Every row carries the two things the owner does next: call, or open WhatsApp.
 * Both are one tap, and the WhatsApp link is pre-filled with the quote code and
 * total — CLAUDE.md §2.5, every commercial action ends in one of those two.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const active = PIPELINE.find((stage) => stage.status === params.status)?.status;

  const [leads, counts, settings] = await Promise.all([
    listLeads(active as QuoteStatus | undefined),
    pipelineCounts(),
    getSiteSettings(),
  ]);

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <AdminHeading
        title="Leads"
        description={`${total} quotations submitted. ${settings.responsePromise}`}
      />

      <FormMessage status={params.status === "saved" ? "saved" : undefined} />

      <nav aria-label="Pipeline" className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/leads"
          className={cn(
            "rounded-pill border px-3 py-1.5 text-sm transition-colors",
            !active ? "border-ink bg-ink text-paper" : "border-line text-muted-foreground hover:border-ink hover:text-ink",
          )}
        >
          All <span className="tabular-nums opacity-70">{total}</span>
        </Link>
        {PIPELINE.map((stage) => (
          <Link
            key={stage.status}
            href={`/admin/leads?status=${stage.status}`}
            title={stage.hint}
            className={cn(
              "rounded-pill border px-3 py-1.5 text-sm transition-colors",
              active === stage.status
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted-foreground hover:border-ink hover:text-ink",
            )}
          >
            {stage.label}{" "}
            <span className="tabular-nums opacity-70">{counts[stage.status] ?? 0}</span>
          </Link>
        ))}
      </nav>

      {leads.length === 0 ? (
        <p className="text-muted-foreground">
          {total === 0
            ? "No quotations yet. They arrive here the moment somebody sends one from the site."
            : "Nothing at this stage."}
        </p>
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => {
            const overdue =
              lead.followUpAt !== null &&
              lead.followUpAt.getTime() <= Date.now() &&
              lead.status !== "won" &&
              lead.status !== "lost";

            return (
              <li
                key={lead.id}
                className={cn(
                  "rounded-card border bg-paper p-4",
                  overdue ? "border-warn/50" : "border-line",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/leads/${lead.code}`}
                        className="font-mono text-sm font-semibold text-action hover:underline"
                      >
                        {lead.code}
                      </Link>
                      <span className="font-medium text-ink">{lead.customerName}</span>
                      <span className="rounded-pill bg-ink/5 px-2 py-0.5 text-xs text-muted-foreground">
                        {PIPELINE.find((stage) => stage.status === lead.status)?.label}
                      </span>
                      {overdue ? (
                        <span className="inline-flex items-center gap-1 rounded-pill bg-warn/10 px-2 py-0.5 text-xs font-medium text-warn">
                          <Clock className="size-3" aria-hidden="true" />
                          Follow up
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lead.area}, {lead.county} · {lead.propertyType} · {lead.lineCount} lines ·{" "}
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        timeZone: "Africa/Nairobi",
                      }).format(lead.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular-nums text-ink">
                      {formatKes(lead.total)}
                    </span>
                    <a
                      href={`tel:+${lead.customerPhone}`}
                      aria-label={`Call ${lead.customerName}`}
                      className="flex size-11 items-center justify-center rounded-control border border-line text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                    >
                      <Phone className="size-4" aria-hidden="true" />
                    </a>
                    <a
                      href={whatsappLink(
                        lead.customerPhone,
                        `Hello ${lead.customerName}, this is ${settings.tradingName} about your quotation ${lead.code} for ${formatKes(lead.total)}. When would suit for the site survey?`,
                      )}
                      aria-label={`WhatsApp ${lead.customerName}`}
                      className="flex size-11 items-center justify-center rounded-control bg-whatsapp text-ink transition-transform hover:scale-105"
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                    </a>
                    <Link
                      href={`/q/${lead.code}`}
                      target="_blank"
                      aria-label={`Open quotation ${lead.code}`}
                      className="flex size-11 items-center justify-center rounded-control border border-line text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {formatKenyanMobile(lead.customerPhone)}
                  {lead.customerEmail ? ` · ${lead.customerEmail}` : " · no email"}
                </p>

                {lead.notes ? (
                  <p className="mt-2 rounded-control bg-paper-warm px-3 py-2 text-sm text-ink">
                    {lead.notes}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

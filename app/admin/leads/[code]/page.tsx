import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ExternalLink, MessageCircle, Phone, Star } from "lucide-react";

import {
  AdminHeading,
  Field,
  FormMessage,
  Panel,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { getLead, PIPELINE } from "@/lib/admin/leads";
import { markReviewRequestedAction, updateLeadAction } from "@/lib/admin/lead-actions";
import { buildReviewRequest } from "@/lib/admin/review-request";
import { formatKes } from "@/lib/money";
import { formatKenyanMobile } from "@/lib/quote/phone";
import { getQuoteByCode } from "@/lib/quote/read";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Lead" };

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ code }, { status }] = await Promise.all([params, searchParams]);

  const [lead, quote, settings] = await Promise.all([
    getLead(code),
    getQuoteByCode(code),
    getSiteSettings(),
  ]);

  if (!lead || !quote) notFound();

  const reviewRequest = buildReviewRequest({
    settings,
    customerName: lead.customerName,
    customerPhone: lead.customerPhone,
    area: lead.area,
  });

  const followUp = lead.followUpAt
    ? lead.followUpAt.toISOString().slice(0, 10)
    : "";

  return (
    <>
      <AdminHeading title={lead.customerName} description={`Quotation ${lead.code}`}>
        <Button asChild variant="outline" size="cta">
          <Link href={`/q/${lead.code}`} target="_blank">
            <ExternalLink aria-hidden="true" />
            Their quotation
          </Link>
        </Button>
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/leads">Back to leads</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Panel title="Pipeline">
            <form action={updateLeadAction} className="space-y-4">
              <input type="hidden" name="code" value={lead.code} />

              <Field label="Stage" name="status">
                <Select
                  name="status"
                  defaultValue={lead.status}
                  options={PIPELINE.map((stage) => ({
                    value: stage.status,
                    label: `${stage.label} — ${stage.hint}`,
                  }))}
                />
              </Field>

              <Field
                label="Follow up on"
                name="followUpAt"
                hint="Anything due or overdue shows on the overview."
              >
                <TextInput name="followUpAt" type="date" defaultValue={followUp} />
              </Field>

              <Field label="Notes" name="notes" hint="Internal. Never shown to the customer.">
                <TextArea
                  name="notes"
                  rows={5}
                  defaultValue={lead.notes ?? ""}
                  placeholder="Spoke to him — wants the survey Saturday morning. Gate is on the Links Road side."
                />
              </Field>

              <Button type="submit" size="cta">
                Save
              </Button>
            </form>
          </Panel>

          <Panel title="What they asked for" description={`${quote.lines.length} lines, frozen at submission.`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="py-2 pr-4 font-semibold">Item</th>
                    <th scope="col" className="py-2 pr-4 text-right font-semibold">Qty</th>
                    <th scope="col" className="py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line, index) => (
                    <tr key={index} className="border-b border-line/60 last:border-0">
                      <th scope="row" className="py-2 pr-4 text-left font-normal">
                        <span className="block text-ink">{line.name}</span>
                        {line.sku ? (
                          <span className="font-mono text-xs text-action">{line.sku}</span>
                        ) : null}
                      </th>
                      <td className="py-2 pr-4 text-right tabular-nums text-muted-foreground">
                        {line.quantity}
                      </td>
                      <td className="py-2 text-right tabular-nums text-ink">
                        {formatKes(line.extended)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Reach them">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium tabular-nums text-ink">
                  {formatKenyanMobile(lead.customerPhone)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-ink">{lead.customerEmail ?? "Not given"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Where</dt>
                <dd className="text-ink">
                  {lead.area}, {lead.county} · {lead.propertyType}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total quoted</dt>
                <dd className="text-lg font-semibold tabular-nums text-ink">
                  {formatKes(lead.total)}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-col gap-2">
              <Button asChild size="cta">
                <a
                  href={whatsappLink(
                    lead.customerPhone,
                    `Hello ${lead.customerName}, this is ${settings.tradingName} about your quotation ${lead.code} for ${formatKes(lead.total)}. When would suit for the site survey?`,
                  )}
                >
                  <MessageCircle aria-hidden="true" />
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" size="cta">
                <a href={`tel:+${lead.customerPhone}`}>
                  <Phone aria-hidden="true" />
                  Call
                </a>
              </Button>
            </div>
          </Panel>

          <Panel title="Next step">
            <p className="text-sm text-muted-foreground">{settings.siteSurveyDeliverable}</p>
            <p className="mt-2 text-sm font-medium tabular-nums text-ink">
              {formatKes(settings.siteSurveyFee)}, credited to the invoice
            </p>
          </Panel>

          {/*
            The review request, and only once the job is won. docs/05 Sprint 5
            asks for a "review-request flow after job completion", and asking
            before the deposit has landed is how you get a review you did not
            want.
          */}
          {lead.status === "won" ? (
            <Panel
              title="Ask for a review"
              description="docs/03 §5: Google Business Profile is the most-cited source in AI local answers, and AreaSpy — the strongest site in this market — has eight reviews while claiming 2,400+ clients."
            >
              {lead.reviewRequestedAt ? (
                <p className="flex items-start gap-2 text-sm text-success">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    Asked{" "}
                    <time dateTime={lead.reviewRequestedAt.toISOString()}>
                      {new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "Africa/Nairobi",
                      }).format(lead.reviewRequestedAt)}
                    </time>
                    . Nobody needs asking twice.
                  </span>
                </p>
              ) : (
                <>
                  {reviewRequest.missingReviewUrl ? (
                    <p className="mb-3 rounded-control bg-warning/10 p-3 text-sm text-ink">
                      No Google review link is set yet, so the message goes out without one — far
                      less effective. Paste it into{" "}
                      <Link
                        href="/admin/settings"
                        className="text-action underline underline-offset-4"
                      >
                        Business details
                      </Link>{" "}
                      once the Mombasa profile is verified.
                    </p>
                  ) : null}

                  <p className="text-sm text-muted-foreground">
                    Opens WhatsApp with this ready to send. Edit it there before you send if you
                    want to.
                  </p>
                  <pre className="mt-3 max-h-56 overflow-auto rounded-control border border-line bg-paper-warm p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                    {reviewRequest.message}
                  </pre>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button asChild size="cta">
                      <a href={reviewRequest.href} target="_blank" rel="noopener noreferrer">
                        <Star aria-hidden="true" />
                        Open the request in WhatsApp
                      </a>
                    </Button>
                    <form action={markReviewRequestedAction}>
                      <input type="hidden" name="code" value={lead.code} />
                      <Button type="submit" variant="outline" size="cta" className="w-full">
                        Mark as asked
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </Panel>
          ) : null}
        </aside>
      </div>
    </>
  );
}

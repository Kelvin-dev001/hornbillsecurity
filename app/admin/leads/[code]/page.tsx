import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MessageCircle, Phone } from "lucide-react";

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
import { updateLeadAction } from "@/lib/admin/lead-actions";
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
        </aside>
      </div>
    </>
  );
}

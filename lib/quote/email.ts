import "server-only";

import { Resend } from "resend";

import { formatKes } from "@/lib/money";
import { absoluteUrl } from "@/lib/seo/origin";
import { formatAddress, getSiteSettings } from "@/lib/site-settings";
import { quotationFilename, renderQuotationPdf } from "./pdf";
import { getQuoteByCode, type SavedQuote } from "./read";

/**
 * The two emails a submitted quote sends: the quotation to the customer, and a
 * notification to the owner.
 *
 * Both are best-effort. A quote is saved before either is attempted, its page
 * works, and the WhatsApp handoff carries the code — so a mail failure costs a
 * convenience, not a lead. The caller logs and moves on.
 *
 * With no RESEND_API_KEY the module reports that it skipped rather than
 * throwing, so the whole flow can be developed and tested before the owner has
 * a Resend account (docs/09 item 31).
 */

export type EmailOutcome = {
  customer: "sent" | "skipped" | "failed" | "no-address";
  owner: "sent" | "skipped" | "failed";
  reason?: string;
};

/**
 * Resend will only deliver from a domain the account has verified. Until
 * security.hornbilltech.co.ke is attached and verified, its own onboarding
 * sender is the one address that works.
 */
function fromAddress(tradingName: string): string {
  const configured = process.env.RESEND_FROM_EMAIL;
  return configured ?? `${tradingName} <onboarding@resend.dev>`;
}

function plainQuote(quote: SavedQuote, businessName: string, phone: string): string {
  const lines = quote.groups
    .flatMap((group) => [
      "",
      group.label.toUpperCase(),
      ...group.lines.map(
        (line) =>
          `  ${line.quantity} x ${line.name}${line.sku ? ` (${line.sku})` : ""}` +
          ` @ ${formatKes(line.unitPrice)} = ${formatKes(line.extended)}`,
      ),
    ])
    .join("\n");

  return [
    `Your quotation ${quote.code}`,
    "",
    `Hello ${quote.customerName},`,
    "",
    `Here is the quotation you built on our site, with every line priced.`,
    `The PDF is attached, and the same figures stay at ${absoluteUrl(`/q/${quote.code}`)}.`,
    lines,
    "",
    `Subtotal excluding VAT: ${formatKes(quote.subtotal)}`,
    `VAT at ${quote.vatRate}%: ${formatKes(quote.vatAmount)}`,
    `Total: ${formatKes(quote.total)}`,
    `${quote.depositPercent}% deposit to begin: ${formatKes(quote.deposit)}`,
    "",
    `Quantities are an indicative estimate, confirmed at site survey.`,
    "",
    `Reply to this email or call ${phone} and we will book the survey.`,
    "",
    businessName,
  ].join("\n");
}

function ownerNotification(quote: SavedQuote): string {
  return [
    `New quote ${quote.code} — ${formatKes(quote.total)} including VAT`,
    "",
    `${quote.customerName}`,
    `${quote.customerPhone}`,
    quote.customerEmail ?? "no email given",
    `${quote.area}, ${quote.county} — ${quote.propertyType}`,
    "",
    `${quote.lines.length} lines. Subtotal ${formatKes(quote.subtotal)}, total ${formatKes(quote.total)}.`,
    "",
    absoluteUrl(`/q/${quote.code}`),
    "",
    `WhatsApp: https://wa.me/${quote.customerPhone}`,
  ].join("\n");
}

export async function sendQuoteEmails(code: string): Promise<EmailOutcome> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { customer: "skipped", owner: "skipped", reason: "RESEND_API_KEY is not set" };
  }

  const [quote, settings] = await Promise.all([getQuoteByCode(code), getSiteSettings()]);
  if (!quote) return { customer: "failed", owner: "failed", reason: `quote ${code} not found` };

  const resend = new Resend(apiKey);
  const from = fromAddress(settings.tradingName);
  const pdf = await renderQuotationPdf(quote, settings);
  const filename = quotationFilename(quote, settings);

  const outcome: EmailOutcome = { customer: "no-address", owner: "failed" };

  if (quote.customerEmail) {
    try {
      await resend.emails.send({
        from,
        to: quote.customerEmail,
        replyTo: settings.email,
        subject: `Your quotation ${quote.code} — ${formatKes(quote.total)}`,
        text: plainQuote(quote, settings.tradingName, settings.phone),
        attachments: [{ filename, content: pdf.toString("base64") }],
      });
      outcome.customer = "sent";
    } catch (error) {
      outcome.customer = "failed";
      outcome.reason = error instanceof Error ? error.message : String(error);
    }
  }

  try {
    await resend.emails.send({
      from,
      to: settings.email,
      ...(quote.customerEmail ? { replyTo: quote.customerEmail } : {}),
      subject: `Quote ${quote.code} · ${quote.customerName} · ${formatKes(quote.total)}`,
      text: `${ownerNotification(quote)}\n\n${formatAddress(settings)}`,
      attachments: [{ filename, content: pdf.toString("base64") }],
    });
    outcome.owner = "sent";
  } catch (error) {
    outcome.owner = "failed";
    outcome.reason = error instanceof Error ? error.message : String(error);
  }

  return outcome;
}

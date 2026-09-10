import "server-only";

import type { SiteSettings } from "@/db/schema";
import { whatsappLink } from "@/lib/site-settings";

/**
 * The review request that goes out after a completed job.
 *
 * docs/05 Sprint 5 asks for this flow, and docs/03 §5 says why it is worth more
 * than most of the on-site work: Google Business Profile is the most-cited
 * source in AI local answers — 28.6% of all citations, around 67% within Google
 * AI Overviews — and this market is soft on exactly that axis. AreaSpy, the
 * strongest site in the sector, has **eight reviews** while claiming 2,400+
 * clients. A steady four to eight a month beats everyone, and nobody has to
 * write a line of code to do it.
 *
 * Two Kenya-specific details from docs/03 §5 are built into the message rather
 * than left to the owner to remember:
 *
 *   1. **Ask them to name the neighbourhood.** "Six cameras at our place in
 *      Nyali" is matched against local searches in a way that "great service"
 *      never is. This is the single highest-leverage sentence in the whole
 *      review-request message, and it is the one nobody thinks to include.
 *   2. **Ask what they actually had done.** A review naming the equipment and
 *      the area is the shape an answer engine can use.
 *
 * It goes out on WhatsApp because that is where every other conversation with
 * this customer has happened (CLAUDE.md §2.5). No email template, no automation
 * — the owner sends it himself, and can edit it before it goes.
 */

export type ReviewRequest = {
  /** wa.me deep link with the message pre-filled. */
  href: string;
  /** The message itself, so the admin page can show what will be sent. */
  message: string;
  /**
   * True when site_settings.google_review_url is still empty. The request is
   * still sendable — it just asks for a Google review without a link, which is
   * markedly less effective, so the admin page says so.
   */
  missingReviewUrl: boolean;
};

export function buildReviewRequest(options: {
  settings: SiteSettings;
  customerName: string;
  customerPhone: string;
  /** The area they gave on the quote form — used to prompt for the place name. */
  area: string;
}): ReviewRequest {
  const { settings, customerName, customerPhone, area } = options;

  const firstName = customerName.trim().split(/\s+/)[0] || "there";
  const place = area.trim();

  const lines = [
    `Hi ${firstName}, ${settings.tradingName} here.`,
    "",
    "Thank you for the work — we hope the system is doing what you needed.",
    "",
    "If you have two minutes, a short Google review would help us a great deal." +
      (settings.googleReviewUrl ? ` You can leave one here: ${settings.googleReviewUrl}` : ""),
    "",
    // The neighbourhood ask, verbatim from the docs/03 §5 finding.
    place
      ? `One thing that genuinely helps: if you can mention ${place} and what we installed, it helps other people nearby find us.`
      : "One thing that genuinely helps: if you can mention your area and what we installed, it helps other people nearby find us.",
    "",
    "And if anything is not right, tell us first — we would rather fix it than read about it.",
  ];

  const message = lines.join("\n");

  return {
    // The customer's own number, not the business's: this message is sent to
    // them. whatsappLink() strips it to digits and builds the wa.me URL.
    href: whatsappLink(customerPhone, message),
    message,
    missingReviewUrl: !settings.googleReviewUrl,
  };
}

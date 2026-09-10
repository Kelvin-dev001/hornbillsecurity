import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getLocations } from "@/lib/content/queries";
import { formatKes } from "@/lib/money";
import {
  breadcrumbJsonLd,
  jsonLdScriptProps,
  localBusinessJsonLd,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import {
  formatAddress,
  formatPhoneForDisplay,
  getSiteSettings,
  telLink,
  whatsappLink,
} from "@/lib/site-settings";

/**
 * /contact
 *
 * CLAUDE.md §2.5: every commercial action ends on WhatsApp or a phone call.
 * There is no contact form here on purpose — a form is a promise to reply
 * later, and the response promise on this page is thirty minutes.
 *
 * This is also the one page on the site that mentions Nairobi (CLAUDE.md §1:
 * "A single 'we also serve Nairobi on request' line on the contact page is the
 * entire Nairobi footprint").
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: "Contact us",
    description: `WhatsApp or call ${formatPhoneForDisplay(settings.phone)}. ${settings.responsePromise} ${formatAddress(settings)}.`,
    alternates: { canonical: absoluteUrl("/contact") },
  };
}

export default async function ContactPage() {
  const [settings, locations] = await Promise.all([getSiteSettings(), getLocations()]);

  return (
    <>
      <script {...jsonLdScriptProps(localBusinessJsonLd(settings))} />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            Talk to us
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {settings.responsePromise} There is no contact form on this page on purpose — a form
            is a promise to get back to you eventually, and we would rather just answer.
          </p>
        </header>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href={whatsappLink(
              settings.whatsappNumber,
              `Hello ${settings.tradingName}. I'd like a quote.`,
            )}
            className="flex flex-col gap-2 rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60"
          >
            <MessageCircle className="size-5 text-action" aria-hidden="true" />
            <span className="font-display text-lg font-semibold text-ink">WhatsApp</span>
            <span className="text-muted-foreground">{formatPhoneForDisplay(settings.phone)}</span>
            <span className="text-sm text-muted-foreground">
              The fastest way. Send photos of the site and we can usually price it without a
              visit first.
            </span>
          </a>

          <a
            href={telLink(settings.phone)}
            className="flex flex-col gap-2 rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60"
          >
            <Phone className="size-5 text-action" aria-hidden="true" />
            <span className="font-display text-lg font-semibold text-ink">Call</span>
            <span className="text-muted-foreground">{formatPhoneForDisplay(settings.phone)}</span>
            <span className="text-sm text-muted-foreground">{settings.businessHours}</span>
          </a>

          <a
            href={`mailto:${settings.email}`}
            className="flex flex-col gap-2 rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60"
          >
            <Mail className="size-5 text-action" aria-hidden="true" />
            <span className="font-display text-lg font-semibold text-ink">Email</span>
            <span className="break-all text-muted-foreground">{settings.email}</span>
            <span className="text-sm text-muted-foreground">
              For procurement, LPOs and anything that needs a paper trail.
            </span>
          </a>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="visit">
            <h2 id="visit" className="font-display text-xl font-semibold text-ink">
              Where we are
            </h2>
            <p className="mt-3 flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-1 size-4 shrink-0 text-action" aria-hidden="true" />
              <span>{formatAddress(settings)}</span>
            </p>
            <p className="mt-2 flex items-start gap-2 text-muted-foreground">
              <Clock className="mt-1 size-4 shrink-0 text-action" aria-hidden="true" />
              <span>{settings.businessHours}</span>
            </p>
            <p className="mt-4 text-muted-foreground">
              We are an installer, not a shop — the office is where the vans and the stock are,
              so call before coming down if you want to see something specific. Most of what we
              do happens at your site.
            </p>

            {/* CLAUDE.md §1: this line is the entire Nairobi footprint. */}
            <p className="mt-4 text-muted-foreground">
              We work across {settings.serviceCounties.join(", ")} counties, and we also serve
              Nairobi on request.
            </p>
          </section>

          <section aria-labelledby="next">
            <h2 id="next" className="font-display text-xl font-semibold text-ink">
              What happens next
            </h2>
            <ol className="mt-4 space-y-4">
              {[
                {
                  title: "You tell us the site",
                  body: "Where it is, roughly how many cameras, and what you actually want to be able to see. Photos help more than descriptions.",
                },
                {
                  title: "We price it",
                  body: "An itemised quotation with every line visible, usually the same day. Or build it yourself on the site first and send us the reference.",
                },
                {
                  title: "Survey",
                  body: `${formatKes(settings.siteSurveyFee)}, credited to your invoice. ${settings.siteSurveyDeliverable}`,
                },
                {
                  title: "Installation",
                  body: `${settings.depositPercent}% deposit to begin. Most residential jobs are one day.`,
                },
              ].map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-pill bg-brand-orange text-xs font-medium text-ink">
                    {index + 1}
                  </span>
                  <span>
                    <span className="font-display font-semibold text-ink">{step.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{step.body}</span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="cta">
                <Link href="/build/cctv">Build a system first</Link>
              </Button>
              <Button asChild variant="outline" size="cta">
                <Link href="/faq">Read the FAQ</Link>
              </Button>
            </div>
          </section>
        </div>

        <section className="mt-14" aria-labelledby="areas">
          <h2 id="areas" className="font-display text-lg font-semibold text-ink">
            Areas we cover
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {locations.map((location) => (
              <li key={location.slug}>
                <Link
                  href={`/locations/${location.slug}`}
                  className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                >
                  {location.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

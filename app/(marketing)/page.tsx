import { CheckCircle2, MapPin, ShieldCheck, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { jsonLdScriptProps, localBusinessJsonLd } from "@/lib/seo/json-ld";
import {
  formatKes,
  formatPhoneForDisplay,
  getSiteSettings,
  telLink,
  whatsappLink,
} from "@/lib/site-settings";

/**
 * Homepage — Sprint 0 placeholder.
 *
 * Fully server-rendered. Every value on this page is read from site_settings;
 * nothing is typed into the JSX. That is the point of the sprint: the trust bar
 * proves the database → getSiteSettings() → server component path works before
 * a single price exists.
 *
 * The real homepage (hero, featured solutions, coast locations, a priced
 * example) lands in Sprint 4.
 */

// Statically generated. Revalidated by the admin portal on save (Sprint 4).
export const revalidate = 3600;

export default async function HomePage() {
  const settings = await getSiteSettings();

  const trustBar = [
    {
      icon: ShieldCheck,
      label: `${settings.authorisedPartnerBrands.join(" · ")} authorised partner`,
    },
    {
      icon: CheckCircle2,
      label: `${settings.yearsOperating}+ years · ${settings.techniciansCount}+ technicians`,
    },
    { icon: MapPin, label: settings.serviceAreaLabel },
    { icon: Timer, label: settings.responseTimeLabel },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(localBusinessJsonLd(settings))} />

      <section className="border-b border-line bg-paper-warm">
        <div className="mx-auto max-w-(--container-page) px-4 py-16 sm:px-6 sm:py-24">
          <p className="font-display text-sm font-semibold tracking-wide text-action uppercase">
            {settings.legalName}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-balance text-ink sm:text-5xl lg:text-6xl">
            {settings.tradingName}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {settings.responsePromise}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  `Hello ${settings.tradingName}, I would like a quote.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp {formatPhoneForDisplay(settings.phone)}
              </a>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a href={telLink(settings.phone)}>Call {formatPhoneForDisplay(settings.phone)}</a>
            </Button>
          </div>

          <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
            {settings.businessHours} · {settings.addressMombasa} ·{" "}
            <a
              href={`mailto:${settings.email}`}
              className="text-action underline underline-offset-4"
            >
              {settings.email}
            </a>
          </p>
        </div>
      </section>

      {/* TrustBar — docs/04 §Key components. Every claim is a database value.
          PSRA and CA licensing are deliberately absent: docs/09 items 15 and 16
          are IN PROGRESS and CLAUDE.md §9 forbids claiming either until held. */}
      <section aria-label="Why us" className="border-b border-line bg-paper">
        <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6">
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {trustBar.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3 text-sm text-ink">
                <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-action" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-(--container-prose) px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold text-ink">
          Every job priced line by line
        </h2>
        <p className="mt-4 text-muted-foreground">
          Every camera, every metre of cable, every connector and every hour of labour,
          published with its price before you commit. Site survey{" "}
          {formatKes(settings.siteSurveyFee)}, credited to your invoice. {settings.siteSurveyDeliverable} Deposit{" "}
          {settings.depositPercent}% before installation begins. Workmanship warranty{" "}
          {settings.warrantyMonths} months.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          The catalogue, the packaged solutions and the system builder are being built
          now. In the meantime, send us your site details on WhatsApp and we will price
          it the same way.
        </p>
      </section>
    </>
  );
}

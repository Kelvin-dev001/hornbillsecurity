import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getLocations } from "@/lib/content/queries";
import { formatKes } from "@/lib/money";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import {
  formatAddress,
  formatPhoneForDisplay,
  getSiteSettings,
  whatsappLink,
} from "@/lib/site-settings";

/**
 * /about
 *
 * Every claim on this page is either a database value or a fact from
 * CLAUDE.md §9. Two things are deliberately absent: PSRA registration and the
 * Communications Authority radio licence, which are both in progress (docs/09
 * items 15 and 16). The page says they are in progress rather than staying
 * silent, because a security company that does not mention licensing at all
 * reads worse than one that says where it has got to.
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: `About ${settings.tradingName}`,
    description: `${settings.yearsOperating}+ years installing CCTV and security systems in ${settings.serviceAreaLabel}. ${settings.authorisedPartnerBrands.join(", ")} authorised partner. Registered as ${settings.legalName}.`,
    alternates: { canonical: absoluteUrl("/about") },
  };
}

export default async function AboutPage() {
  const [settings, locations] = await Promise.all([getSiteSettings(), getLocations()]);

  const facts = [
    { label: "Registered name", value: settings.legalName },
    { label: "Company registration", value: settings.companyRegistrationNo },
    { label: "KRA PIN", value: settings.kraPin },
    { label: "VAT", value: settings.vatRegistered ? "Registered — 16% applies" : "Not registered" },
    { label: "Address", value: formatAddress(settings) },
    { label: "Counties served", value: settings.serviceCounties.join(", ") },
    { label: "Hours", value: settings.businessHours },
    { label: "Phone and WhatsApp", value: formatPhoneForDisplay(settings.phone) },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <div className="mx-auto mt-6 max-w-(--container-prose)">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            About {settings.tradingName}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            We are the smart-security division of {settings.legalName}, and we install CCTV,
            access control, electric fencing and alarms across {settings.serviceAreaLabel}. We
            have been doing it for {settings.yearsOperating}+ years, with{" "}
            {settings.techniciansCount}+ technicians who live here rather than travelling down
            from Nairobi.
          </p>

          <h2 className="mt-12 font-display text-xl font-semibold text-ink">
            Why we publish our prices
          </h2>
          <p className="mt-3 text-muted-foreground">
            Buying a security system in Kenya normally works like this. You call three companies.
            Each sends someone to look at your house. Each comes back a week later with a single
            figure and a list of equipment with no prices against it. You have no way to compare
            them, so you pick on gut feel, and you never find out whether the KES 90,000 quote
            and the KES 140,000 quote were for the same thing. They usually were not.
          </p>
          <p className="mt-3 text-muted-foreground">
            We decided to be the company that shows the whole bill. Every system on this site is
            published with every line in it — the cameras with their real model numbers, the
            recorder, the drive, the metres of cable, the connectors, the trunking, the labour —
            and a price against each one. You can check our figures against any other quote you
            have been given, line by line. Sometimes that will show you that we are more
            expensive, and you will be able to see exactly why.
          </p>
          <p className="mt-3 text-muted-foreground">
            It is not a marketing position. It is what we would want if we were buying.
          </p>

          <h2 className="mt-12 font-display text-xl font-semibold text-ink">
            Why only the coast
          </h2>
          <p className="mt-3 text-muted-foreground">
            Because we would rather be genuinely good at {locations.length} places than
            plausible everywhere. The coast has conditions that decide whether an installation
            survives: salt air that corrodes an unsealed junction box within a season, holiday
            properties that stand empty for months, plots with no mains supply and no network,
            long boundaries on the port corridor. A company working out of Nairobi can install a
            camera here. It cannot tell you which of those things is about to cost you money.
          </p>
          <p className="mt-3 text-muted-foreground">
            We serve Nairobi on request. We do not market there, and we will tell you honestly
            that a Nairobi callout is not a same-week job for us.
          </p>

          <h2 className="mt-12 font-display text-xl font-semibold text-ink">
            How we work
          </h2>
          <ul className="mt-4 space-y-3 text-muted-foreground">
            {[
              `A survey first — ${formatKes(settings.siteSurveyFee)}, credited to your invoice. ${settings.siteSurveyDeliverable}`,
              `A written quotation with every line priced, valid ${settings.quoteValidityDays} days. Nothing appears on the invoice that was not on it.`,
              `${settings.depositPercent}% deposit to begin, balance on completion. M-Pesa Paybill ${settings.mpesaPaybill}, account ${settings.mpesaAccount}.`,
              `Handover includes remote viewing set up on your phone and how to export a clip — because the day you need footage is not the day to learn that.`,
              `${settings.warrantyMonths} months on workmanship. Equipment carries its manufacturer warranty, and as an authorised partner a claim goes through the distributor rather than becoming your problem.`,
            ].map((point) => (
              <li key={point} className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 font-display text-xl font-semibold text-ink">
            Partners and licensing
          </h2>
          <p className="mt-3 text-muted-foreground">
            We are an authorised partner for {settings.authorisedPartnerBrands.join(", ")}, and we
            also supply EZVIZ and Uniview. On fuel monitoring we are deliberately brand-agnostic —
            the right telematics unit depends on the fleet, not on who gives us the best margin.
          </p>
          {/*
            CLAUDE.md §9: "PSRA registration and Communications Authority radio
            licensing are both in progress — do not claim either as held until
            confirmed." Stated as in-progress, which is true, and no stronger.
          */}
          <p className="mt-3 text-muted-foreground">
            Registration with the Private Security Regulatory Authority and Communications
            Authority radio licensing are both in progress. We will say so here the day each is
            granted and not before — and if another company tells you it holds either, ask for
            the number.
          </p>

          <h2 className="mt-12 font-display text-xl font-semibold text-ink">The details</h2>
          <div className="mt-4 overflow-x-auto rounded-card border border-line">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Company registration details</caption>
              <tbody className="divide-y divide-line bg-paper">
                {facts.map((fact) => (
                  <tr key={fact.label}>
                    <th scope="row" className="p-3 text-left font-medium whitespace-nowrap text-ink">
                      {fact.label}
                    </th>
                    <td className="p-3 text-muted-foreground">{fact.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  `Hello ${settings.tradingName}. I'd like to talk about a system.`,
                )}
              >
                Talk to us on WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/contact">Contact details</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

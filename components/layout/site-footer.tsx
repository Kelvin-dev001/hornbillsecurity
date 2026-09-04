import Link from "next/link";

import { footerNav } from "@/lib/navigation";
import {
  formatPhoneForDisplay,
  formatPricesUpdated,
  formatVatRate,
  getSiteSettings,
  telLink,
} from "@/lib/site-settings";

/**
 * Site footer.
 *
 * Every fact below is read from site_settings. Nothing here is typed into the
 * JSX — CLAUDE.md §9, docs/02 §site_settings.
 *
 * The address is the canonical NAP and must match the Google Business Profile
 * character for character (docs/09 item 3 is still OPEN on the street line).
 */
export async function SiteFooter() {
  const settings = await getSiteSettings();
  const year = new Date().getFullYear();

  const socials = [
    { label: "Facebook", href: settings.facebookUrl },
    { label: "Instagram", href: settings.instagramUrl },
    { label: "TikTok", href: settings.tiktokUrl },
    { label: "YouTube", href: settings.youtubeUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  return (
    <footer className="mt-24 border-t border-line bg-ink text-paper">
      <div className="mx-auto max-w-(--container-page) px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <p className="font-display text-lg font-semibold">{settings.tradingName}</p>
            <address className="space-y-1 text-sm not-italic text-paper/75">
              <p>{settings.addressMombasa}</p>
              <p>
                <a
                  href={telLink(settings.phone)}
                  className="hover:text-brand-gold focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {formatPhoneForDisplay(settings.phone)}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${settings.email}`}
                  className="hover:text-brand-gold focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {settings.email}
                </a>
              </p>
              <p>{settings.businessHours}</p>
            </address>
            <p className="text-sm text-brand-gold">{settings.responsePromise}</p>
            {socials.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-paper/75 underline underline-offset-4 hover:text-brand-gold"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {footerNav.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="font-display text-sm font-semibold tracking-wide text-brand-gold uppercase">
                {group.heading}
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-11 items-center text-paper/75 hover:text-paper focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 space-y-3 border-t border-paper/15 pt-8 text-xs text-paper/60">
          <p>
            {settings.tradingName} is a division of {settings.legalName}. Company
            registration {settings.companyRegistrationNo} · KRA PIN {settings.kraPin}
            {settings.vatRegistered ? " · VAT registered" : ""}.
          </p>
          <p>
            Serving {settings.serviceCounties.join(", ")}
            {settings.serviceCounties.length > 0 ? " counties" : ""}. Nairobi on request.
          </p>
          <p>
            All prices in KES, excluding {formatVatRate(settings.vatRate)}% VAT. Prices updated{" "}
            <time dateTime={settings.pricesUpdatedAt.toISOString()}>
              {formatPricesUpdated(settings.pricesUpdatedAt)}
            </time>
            . Quotations valid {settings.quoteValidityDays} days. Workmanship warranty{" "}
            {settings.warrantyMonths} months.
          </p>
          <p>
            © {year} {settings.legalName}.
          </p>
        </div>
      </div>
    </footer>
  );
}

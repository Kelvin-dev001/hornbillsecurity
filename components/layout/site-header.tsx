import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";

import logoMark from "@/logo/Hornbill_Logo_Transparent_HighRes.png";

import { Button } from "@/components/ui/button";
import { primaryNav } from "@/lib/navigation";
import {
  formatPhoneForDisplay,
  getSiteSettings,
  telLink,
  whatsappLink,
} from "@/lib/site-settings";

/**
 * Site header.
 *
 * Server-rendered. The phone number, WhatsApp number and business name all come
 * from site_settings — CLAUDE.md §9 and docs/02 §site_settings.
 *
 * No hamburger yet: the nav is six items and wraps cleanly on a 360px screen,
 * which is the primary target (docs/04 §Layout). A drawer is only worth a
 * client component once the nav grows.
 */
export async function SiteHeader() {
  const settings = await getSiteSettings();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <div className="mx-auto flex max-w-(--container-page) flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-control focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
        >
          {/* Imported from logo/ rather than copied into public/ so the brand
              artwork has one home. next/image resizes and re-encodes the
              1274px source at build time, and the intrinsic dimensions come
              with the import, so there is no layout shift. */}
          <Image
            src={logoMark}
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            priority
            className="size-9 shrink-0"
          />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight text-ink">
              Hornbill
            </span>
            <span className="text-xs text-muted-foreground">
              {settings.tradingName.replace(/^Hornbill\s+/, "")}
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="order-3 w-full sm:order-none sm:w-auto">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-control text-ink hover:text-action focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none sm:min-h-0"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="cta" className="hidden sm:inline-flex">
            <a href={telLink(settings.phone)}>
              <Phone aria-hidden="true" />
              {formatPhoneForDisplay(settings.phone)}
            </a>
          </Button>
          <Button asChild size="cta">
            <a
              href={whatsappLink(
                settings.whatsappNumber,
                `Hello ${settings.tradingName}, I would like a quote.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get a quote
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

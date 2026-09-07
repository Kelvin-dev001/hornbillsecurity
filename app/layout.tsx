import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { QuoteBar } from "@/components/quote/quote-bar";
import { WhatsAppFAB } from "@/components/whatsapp-fab";
import { getSiteSettings } from "@/lib/site-settings";
import { metadataBase } from "@/lib/seo/origin";
import { cn } from "@/lib/utils";

import "./globals.css";

/** docs/04 §Typography: Space Grotesk for display, Inter for body and numerals. */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    // Never a hostname literal — CLAUDE.md §3, docs/09 item 9.
    metadataBase: metadataBase(),
    title: {
      default: `${settings.tradingName} — CCTV and security installation in ${settings.serviceAreaLabel}`,
      template: `%s · ${settings.tradingName}`,
    },
    description: `Itemised, priced security installations in ${settings.serviceAreaLabel}. ${settings.authorisedPartnerBrands.join(", ")} authorised partner. ${settings.responsePromise}`,
    alternates: { canonical: "/" },
    openGraph: {
      siteName: settings.tradingName,
      locale: "en_KE",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE" className={cn(inter.variable, spaceGrotesk.variable)}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {/* Header, footer and the WhatsApp FAB are on every page — CLAUDE.md
            §2.5. The admin portal (Sprint 4) opts out with its own layout. */}
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <QuoteBar />
        <WhatsAppFAB />
      </body>
    </html>
  );
}

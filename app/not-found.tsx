import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * 404.
 *
 * Most of the IA in the header does not exist yet — the catalogue lands in
 * Sprint 1, solutions and the builder in Sprint 2, the marketing pages in
 * Sprint 4 (docs/05). Until then a click on those nav items lands here, which
 * says so plainly and still offers the one action that always works.
 */
export default async function NotFound() {
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-(--container-prose) px-4 py-24 sm:px-6">
      <p className="font-display text-sm font-semibold tracking-wide text-action uppercase">
        404
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-ink">
        That page is not here yet
      </h1>
      <p className="mt-4 text-muted-foreground">
        The catalogue, the packaged solutions and the system builder are being built.
        Until they land, tell us what you need on WhatsApp and we will price it line by
        line — {settings.responsePromise.toLowerCase()}
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
            Ask on WhatsApp
          </a>
        </Button>
        <Button asChild variant="outline" size="cta">
          <Link href="/">Back to the homepage</Link>
        </Button>
      </div>
    </div>
  );
}

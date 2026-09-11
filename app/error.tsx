"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * What a visitor sees when a page throws — docs/05 Sprint 8.
 *
 * Two things it deliberately does not do.
 *
 * **It does not show the error.** `error.message` on a server error can carry a
 * failed query's SQL, and an admin query's select list names `cost_price`
 * (CLAUDE.md §2.3). Next already redacts server error messages in production,
 * and not rendering it at all means that guarantee does not have to hold.
 *
 * **It does not pretend nothing happened.** The whole business runs on WhatsApp
 * and a phone number, so the useful thing on a broken page is the number — not
 * a "try again" that will fail identically. A visitor who came for a price and
 * hit an error should leave with a way to reach a person.
 *
 * The phone number is hardcoded here, which is the only place on the site it is.
 * That is the point: getSiteSettings() reads the database, and this component
 * exists precisely for the case where reading the database is what failed.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is how this maps to the server-side log line written by
    // instrumentation.ts. Logging it client-side means an owner reading a
    // support message can find the server error without a timestamp hunt.
    console.error("Page error", { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-(--container-prose) flex-col items-start px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-semibold text-ink sm:text-4xl">This page broke</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Not your fault, and we would rather you did not waste time on it. Everything on this site
        is also a phone call away.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="cta">
          <a href="https://wa.me/254759293030">WhatsApp 0759 293 030</a>
        </Button>
        <Button asChild variant="outline" size="cta">
          <a href="tel:+254759293030">Call 0759 293 030</a>
        </Button>
        <Button onClick={reset} variant="ghost" size="cta">
          Try again
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground">
        Or go back to{" "}
        <Link href="/" className="text-action underline underline-offset-4">
          the home page
        </Link>
        ,{" "}
        <Link href="/price-list" className="text-action underline underline-offset-4">
          the price list
        </Link>{" "}
        or{" "}
        <Link href="/solutions" className="text-action underline underline-offset-4">
          the packages
        </Link>
        .
      </p>

      {error.digest ? (
        <p className="mt-6 text-xs text-muted-foreground">
          If you tell us this reference it helps us find what happened:{" "}
          <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Cctv, Zap } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * /build — the front door to the builders.
 *
 * Only CCTV exists so far. The electric fence builder is Sprint 6, and docs/05
 * makes the case for it: `electric fence quotation pdf in kenya` and `electric
 * fence materials price list` are verified unserved Kenyan queries.
 */
export const revalidate = 3600;

const TRAIL = [
  { name: "Home", path: "/" },
  { name: "Build a system", path: "/build" },
];

export const metadata: Metadata = {
  title: "Build a system — see the bill of materials before you call",
  description:
    "Answer a few questions and get a complete, itemised quotation for a security system on a " +
    "Mombasa property, with a price on every line.",
  alternates: { canonical: absoluteUrl("/build") },
};

export default async function BuildPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(TRAIL))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={TRAIL} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Build a system</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Answer a few questions and see the whole bill of materials — every camera, every metre
            of cable, every connector and the labour — before you speak to anyone.{" "}
            {settings.responsePromise}
          </p>
        </header>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          <li>
            <article className="flex h-full flex-col gap-3 rounded-card border border-line bg-paper p-6">
              <Cctv className="size-6 text-action" aria-hidden="true" strokeWidth={1.5} />
              <h2 className="font-display text-lg font-semibold text-ink">CCTV</h2>
              <p className="text-sm text-muted-foreground">
                Analog or IP, one camera or thirty-two. Six questions, then a complete itemised
                quotation you can change line by line.
              </p>
              <Button asChild size="cta" className="mt-auto self-start">
                <Link href="/build/cctv">Build a CCTV system</Link>
              </Button>
            </article>
          </li>

          <li>
            <article className="flex h-full flex-col gap-3 rounded-card border border-dashed border-line bg-paper-warm p-6">
              <Zap className="size-6 text-muted-foreground" aria-hidden="true" strokeWidth={1.5} />
              <h2 className="font-display text-lg font-semibold text-ink">Electric fencing</h2>
              <p className="text-sm text-muted-foreground">
                Perimetre metres and line count into energizer sizing, wire, insulators, posts,
                earth and signage. Being built.
              </p>
              <p className="mt-auto text-sm text-muted-foreground">
                In the meantime,{" "}
                <Link href="/catalog/electric-fencing" className="text-action hover:underline">
                  see what the energizer costs
                </Link>
                .
              </p>
            </article>
          </li>
        </ul>
      </div>
    </>
  );
}

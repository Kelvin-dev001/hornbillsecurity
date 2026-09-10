import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { cheapestCompleteSystem, getSolutions } from "@/lib/catalog/solutions";
import { formatKes } from "@/lib/money";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * /tools — docs/03 §2 and docs/05 Sprint 7.
 *
 * Three tools are planned. Two exist; the electric-fence calculator is blocked
 * on component prices (docs/09 items 29 and 34) and is listed as not built
 * rather than left off, because a visitor who came looking for it should find
 * out that it is coming rather than conclude it does not exist.
 *
 * Every tool here produces its answer server-side. docs/03 §0 is the reason:
 * "ChatGPT does not execute JavaScript" — a calculator whose output appears
 * only after a click is invisible to the audience most likely to be asking.
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "Tools", path: "/tools" },
];

export const metadata: Metadata = {
  title: "Calculators — CCTV cost, storage sizing",
  description:
    "Free calculators for a Kenyan security installation: what a CCTV system costs itemised line by line, and how big a surveillance drive you need. Every answer server-rendered with the arithmetic shown.",
  alternates: { canonical: absoluteUrl("/tools") },
};

export default async function ToolsPage() {
  const settings = await getSiteSettings();
  const solutions = await getSolutions(Number(settings.vatRate));
  const cheapest = cheapestCompleteSystem(solutions);

  const tools = [
    {
      href: "/build/cctv",
      title: "CCTV cost calculator",
      body: `Six questions about your property and you get the complete bill of materials — every camera, every metre of cable, every connector and the labour, each with a price. Complete systems from ${formatKes(cheapest)} installed.`,
      cta: "Open the calculator",
      built: true,
    },
    {
      href: "/tools/storage-calculator",
      title: "Storage calculator",
      body: "How big a surveillance drive you need for a given number of cameras, resolution and days of footage — with the arithmetic shown and the drive priced. The answer most quotations get wrong.",
      cta: "Size a drive",
      built: true,
    },
    {
      href: null,
      title: "Electric fence calculator",
      body: "Perimeter metres and line count into an energizer size, wire rolls, insulator counts, posts, earth and labour. Not built yet: it needs real trade prices for the fence components, and a calculator that cannot total anything is worse than none.",
      cta: "Ask us to quote a fence instead",
      built: false,
    },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">Calculators</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Free, no email required, and the answer is in the page rather than behind a button.
            All prices are KES and exclude VAT, and they are the same figures our quotations use.
          </p>
        </header>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool.title}>
              <article className="flex h-full flex-col gap-3 rounded-card border border-line bg-paper p-5">
                <h2 className="font-display text-lg font-semibold text-ink">{tool.title}</h2>
                <p className="text-sm text-muted-foreground">{tool.body}</p>
                <div className="mt-auto pt-2">
                  {tool.built && tool.href ? (
                    <Button asChild size="cta">
                      <Link href={tool.href}>{tool.cta}</Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="cta">
                      <a
                        href={whatsappLink(
                          settings.whatsappNumber,
                          "Hello Hornbill. I'd like a quote for an electric fence.",
                        )}
                      >
                        {tool.cta}
                      </a>
                    </Button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

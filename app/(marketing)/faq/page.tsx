import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getFaqs } from "@/lib/content/queries";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * /faq
 *
 * Real question-and-answer markup plus FAQPage structured data — docs/03 §3.
 * Grouped, because a flat list of twenty questions is a list nobody reads.
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "FAQ", path: "/faq" },
];

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Prices, surveys, deposits, warranty, retention and coverage — the questions people actually ask before buying a CCTV system on the Kenyan coast, answered plainly.",
  alternates: { canonical: absoluteUrl("/faq") },
};

export default async function FaqPage() {
  const [settings, entries] = await Promise.all([getSiteSettings(), getFaqs()]);

  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry]);
  }

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      {entries.length > 0 ? (
        <script
          {...jsonLdScriptProps(
            faqJsonLd(entries.map(({ question, answer }) => ({ question, answer }))),
          )}
        />
      ) : null}

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <div className="mt-6 gap-12 lg:grid lg:grid-cols-[16rem_1fr]">
          <div>
            <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
              Questions
            </h1>
            <p className="mt-4 text-muted-foreground">
              If the answer you need is not here, ask. {settings.responsePromise}
            </p>

            <nav className="mt-6 hidden lg:block" aria-label="FAQ sections">
              <ul className="space-y-1">
                {[...groups.keys()].map((group) => (
                  <li key={group}>
                    <a
                      href={`#${encodeURIComponent(group.toLowerCase().replace(/\s+/g, "-"))}`}
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
                    >
                      {group}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <Button asChild size="cta" className="mt-6">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  "Hello Hornbill. I have a question about your systems.",
                )}
              >
                Ask on WhatsApp
              </a>
            </Button>
          </div>

          <div className="mt-10 lg:mt-0">
            {[...groups.entries()].map(([group, questions]) => {
              const id = encodeURIComponent(group.toLowerCase().replace(/\s+/g, "-"));
              return (
                <section key={group} id={id} className="mb-12 scroll-mt-24">
                  <h2 className="font-display text-xl font-semibold text-ink">{group}</h2>
                  <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-paper">
                    {questions.map((entry) => (
                      <div key={entry.question} className="p-5">
                        <dt className="font-display font-semibold text-ink">{entry.question}</dt>
                        <dd className="mt-2 text-muted-foreground">{entry.answer}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}

            <p className="text-sm text-muted-foreground">
              More detail lives in the{" "}
              <Link href="/blog" className="text-action underline underline-offset-4">
                guides
              </Link>{" "}
              and on the{" "}
              <Link href="/price-list" className="text-action underline underline-offset-4">
                price list
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

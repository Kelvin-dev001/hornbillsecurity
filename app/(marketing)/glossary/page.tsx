import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { GLOSSARY_GROUPS, glossary } from "@/lib/content/glossary";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";
import { slugify } from "@/lib/slug";

/**
 * /glossary — docs/03 §2, docs/05 Sprint 7.
 *
 * Emitted as a DefinedTermSet, which is the schema.org type built for exactly
 * this and which almost nothing in this market uses. Each term is a DefinedTerm
 * with a stable fragment id, so a definition can be linked and cited on its own
 * rather than only as part of a page.
 *
 * The "watch for" note on many terms is the part that earns the page its keep:
 * half the value of a glossary here is telling a reader which words are being
 * used to make an ordinary thing sound expensive.
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "Glossary", path: "/glossary" },
];

export const metadata: Metadata = {
  title: "CCTV and security glossary — what the terms on your quotation mean",
  description:
    "Plain definitions of the terms on a Kenyan security quotation — DVR, NVR, PoE, ColorVu, retention, per point, bill of materials — and which ones are used to inflate a price.",
  alternates: { canonical: absoluteUrl("/glossary") },
};

export default async function GlossaryPage() {
  const settings = await getSiteSettings();

  const byGroup = GLOSSARY_GROUPS.map((group) => ({
    group,
    terms: glossary
      .filter((term) => term.group === group)
      .sort((a, b) => a.term.localeCompare(b.term)),
  })).filter((entry) => entry.terms.length > 0);

  const withWarnings = glossary.filter((term) => term.watchFor).length;

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      <script
        {...jsonLdScriptProps({
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          "@id": `${absoluteUrl("/glossary")}#glossary`,
          name: "CCTV and security glossary",
          url: absoluteUrl("/glossary"),
          inLanguage: "en-KE",
          publisher: { "@id": absoluteUrl("/#business") },
          hasDefinedTerm: glossary.map((term) => ({
            "@type": "DefinedTerm",
            "@id": `${absoluteUrl("/glossary")}#${slugify(term.term)}`,
            name: term.expansion ? `${term.term} (${term.expansion})` : term.term,
            description: term.definition,
            inDefinedTermSet: `${absoluteUrl("/glossary")}#glossary`,
          })),
        })}
      />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">Glossary</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {glossary.length} terms you will meet on a security quotation, defined by what they
            mean for you rather than by what the acronym expands to. {withWarnings} of them carry
            a note about how the word gets used to make an ordinary thing sound expensive.
          </p>
        </header>

        <nav className="mt-8" aria-label="Glossary sections">
          <ul className="flex flex-wrap gap-2">
            {byGroup.map((entry) => (
              <li key={entry.group}>
                <a
                  href={`#${slugify(entry.group)}`}
                  className="inline-flex h-9 items-center rounded-pill bg-paper-warm px-3 text-sm text-ink transition-colors hover:bg-ink/5"
                >
                  {entry.group} ({entry.terms.length})
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {byGroup.map((entry) => (
          <section key={entry.group} id={slugify(entry.group)} className="mt-12 scroll-mt-24">
            <h2 className="font-display text-xl font-semibold text-ink">{entry.group}</h2>

            <dl className="mt-4 divide-y divide-line rounded-card border border-line bg-paper">
              {entry.terms.map((term) => (
                <div key={term.term} id={slugify(term.term)} className="scroll-mt-24 p-5">
                  <dt className="font-display font-semibold text-ink">
                    {term.term}
                    {term.expansion ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        — {term.expansion}
                      </span>
                    ) : null}
                  </dt>
                  <dd className="mt-2 text-muted-foreground">
                    {term.definition}

                    {term.watchFor ? (
                      <span className="mt-3 flex items-start gap-2 rounded-control bg-paper-warm p-3 text-sm">
                        <AlertTriangle
                          className="mt-0.5 size-4 shrink-0 text-action"
                          aria-hidden="true"
                        />
                        <span className="text-ink">
                          <strong>Watch for:</strong> {term.watchFor}
                        </span>
                      </span>
                    ) : null}

                    {term.see && term.see.length > 0 ? (
                      <span className="mt-3 block text-sm text-muted-foreground">
                        See also{" "}
                        {term.see.map((related, index) => (
                          <span key={related}>
                            {index > 0 ? ", " : ""}
                            <a
                              href={`#${slugify(related)}`}
                              className="text-action underline underline-offset-4"
                            >
                              {related}
                            </a>
                          </span>
                        ))}
                        .
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <section className="mt-14 max-w-(--container-prose) rounded-card border border-line bg-paper-warm p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            A term on your quotation that is not here?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Send it to us and we will tell you what it means and whether it is worth paying for —
            whether or not the quotation is ours. And we will add it here.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  "Hello Hornbill. There's a term on a quotation I don't understand: ",
                )}
              >
                Ask what a term means
              </a>
            </Button>
            <Button asChild variant="outline" size="cta">
              <Link href="/blog/how-to-read-a-cctv-quotation-kenya">
                How to read a CCTV quotation
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

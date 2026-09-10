import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Check, X } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd, faqJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * /cctv-and-the-law-in-kenya
 *
 * docs/03 §4 item 29 rates this the highest-authority page on the site: "most
 * likely to earn editorial links, strongest AI-citation candidate — and it
 * sells a compliance service no competitor offers." docs/10 goes further —
 * "the strongest pure content gap found in the entire research", because the
 * only substantive treatments in Kenya are on law-firm sites that do not sell
 * installations.
 *
 * Three rules govern how it is written, and they matter more here than
 * anywhere else on the site.
 *
 * **Statute and draft guidance are labelled differently.** The Data Protection
 * Act 2019 is law. The ODPC's Draft Guidance Note for Private Security
 * (December 2025, cited in docs/06b) is draft, and presenting draft guidance as
 * binding obligation on a commercial page would be exactly the kind of
 * overreach this page exists to be better than. Every requirement below says
 * which it comes from.
 *
 * **Figures that move are marked as needing checking.** The penalty ceiling and
 * the registration threshold are stated because they are the two things people
 * actually want to know, and both carry an explicit "verify with the ODPC"
 * because regulations are amended and this page is not a subscription service.
 *
 * **No claim about our own status that is not recorded as true.** We do not say
 * we are ODPC-registered, and PSRA registration is in progress rather than held
 * (CLAUDE.md §9, docs/09 items 15 and 38).
 *
 * This is a static page rather than an article because it is a reference
 * document that should not carry a "published two years ago" byline — docs/03
 * §2 lists it beside /privacy and /terms for that reason.
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "CCTV and the law in Kenya", path: "/cctv-and-the-law-in-kenya" },
];

export const metadata: Metadata = {
  title: "CCTV and the Law in Kenya: the Data Protection Act, ODPC Rules and What You Must Do",
  description:
    "What the Data Protection Act 2019 and the ODPC actually require of anyone running CCTV in Kenya — signage, lawful basis, retention, subject access to footage, and DPIAs. Written by installers, not lawyers, and clear about which parts are law and which are draft guidance.",
  alternates: { canonical: absoluteUrl("/cctv-and-the-law-in-kenya") },
};

const FAQ = [
  {
    question: "Is it legal to install CCTV outside my house in Kenya?",
    answer:
      "Yes. Securing your own property is a legitimate interest and nothing in the Data Protection Act 2019 prevents it. Two things change the picture: cameras that capture a neighbour's property, a shared corridor or a public footpath bring you into the Act's scope as a data controller for that footage, and cameras where anyone has a reasonable expectation of privacy — a bathroom, a bedroom, a live-in worker's own room — are not defensible in any circumstances.",
  },
  {
    question: "Do I need a sign saying there is CCTV?",
    answer:
      "You should have one, and you should assume it will be treated as required. The Act's transparency principle means people must know they are being recorded before it happens, and the ODPC's draft guidance for private security states visible surveillance signage explicitly. A sign costs almost nothing and it is the single cheapest compliance step there is.",
  },
  {
    question: "How long can I keep CCTV footage?",
    answer:
      "For as long as you can justify, and no longer — the Act's storage-limitation principle. There is no fixed number in Kenyan law. In practice 14 to 30 days is what most sites can defend, and the important thing is that the retention period is a decision you made and can explain, not whatever the drive happened to hold. Keeping footage indefinitely because the disk is large is exactly what the principle prohibits.",
  },
  {
    question: "Does someone have the right to see footage of themselves?",
    answer:
      "Yes. Access is a data-subject right under the Act, and the ODPC's draft guidance for private security puts a seven-day window on responding for footage. That has a practical consequence most people miss: if your retention is a week and a request takes you two weeks to handle, the footage is gone before you answer, which is itself a failure. It also means you need a way to export one person's footage without handing over everybody else's.",
  },
  {
    question: "Can I put cameras where my staff work?",
    answer:
      "In shared and work areas, generally yes, with notice — and consent is a weak basis in an employment relationship because an employee cannot freely refuse. In changing areas, washrooms or rest areas, no. Continuous monitoring of an individual at their desk is very hard to justify and is the kind of processing that would need a data protection impact assessment before it started, not after somebody complains.",
  },
  {
    question: "What happens if I get it wrong?",
    answer:
      "The Act provides for administrative penalties — up to KES 5 million, or for an undertaking up to 1% of annual turnover, whichever is lower. Verify the current figure with the ODPC before relying on it. In practice the more common consequence is a complaint you have to answer with records you do not have, which is why the paperwork matters as much as the cameras.",
  },
];

export default async function CctvLawPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      <script {...jsonLdScriptProps(faqJsonLd(FAQ))} />
      <script
        {...jsonLdScriptProps({
          "@context": "https://schema.org",
          "@type": "Article",
          "@id": `${absoluteUrl("/cctv-and-the-law-in-kenya")}#article`,
          headline:
            "CCTV and the Law in Kenya: the Data Protection Act, ODPC Rules and What You Must Do",
          description: metadata.description,
          url: absoluteUrl("/cctv-and-the-law-in-kenya"),
          dateModified: settings.updatedAt.toISOString(),
          author: { "@type": "Organization", name: settings.tradingName },
          publisher: { "@id": absoluteUrl("/#business") },
          about: [
            { "@type": "Legislation", name: "Data Protection Act, No. 24 of 2019 (Kenya)" },
            { "@type": "Legislation", name: "Private Security Regulation Act, No. 13 of 2016 (Kenya)" },
          ],
        })}
      />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <article className="mx-auto mt-6 max-w-(--container-prose)">
          <header>
            <p className="text-sm tracking-wide text-action uppercase">Reference</p>
            <h1 className="mt-2 text-3xl font-semibold text-balance text-ink sm:text-4xl">
              CCTV and the law in Kenya
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              What the Data Protection Act 2019 and the Office of the Data Protection Commissioner
              actually require of anyone running CCTV — and which parts of it are law, which are
              draft guidance, and which are simply good practice that will keep you out of an
              argument.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Reviewed and kept current by {settings.tradingName}. Last updated{" "}
              <time dateTime={settings.updatedAt.toISOString()}>
                {new Intl.DateTimeFormat("en-GB", {
                  month: "long",
                  year: "numeric",
                  timeZone: "Africa/Nairobi",
                }).format(settings.updatedAt)}
              </time>
              .
            </p>
          </header>

          {/*
            The disclaimer goes at the top, not buried at the bottom. We install
            systems; we are not advocates, and a page that implies otherwise
            would be the one thing on this site that could actually harm a
            reader.
          */}
          <aside className="mt-8 rounded-card border border-line bg-paper-warm p-5">
            <p className="flex items-start gap-2 text-sm text-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-action" aria-hidden="true" />
              <span>
                <strong>This is not legal advice.</strong> We install security systems for a living
                and this is the summary we wish somebody had given us. For anything consequential —
                a workplace monitoring policy, a complaint you have received, a processing
                arrangement with a third party — talk to an advocate. Where a figure below could
                change with an amendment, we say so.
              </span>
            </p>
          </aside>

          <div className="prose-hornbill mt-10">
            <h2>The short version</h2>
            <p>
              If you point a camera only at your own property and nobody else&apos;s, and no
              employee is being monitored, the law asks very little of you. The moment your
              cameras capture other people — a neighbour&apos;s gate, a shared stairwell, a
              footpath, your own staff — you are handling other people&apos;s personal data, and
              five obligations follow. None of them is expensive. All of them are cheaper before
              somebody complains than after.
            </p>

            <ol>
              <li>
                <strong>Tell people.</strong> Visible signage where the cameras are.
              </li>
              <li>
                <strong>Have a reason you can state.</strong> Not &ldquo;security&rdquo; in the
                abstract — what you are protecting and from what.
              </li>
              <li>
                <strong>Decide how long you keep footage, and why.</strong> Then configure the
                system to actually do that.
              </li>
              <li>
                <strong>Be able to hand somebody their own footage.</strong> Without handing over
                everybody else&apos;s.
              </li>
              <li>
                <strong>Assess the risk before you do anything intrusive.</strong> A written
                assessment, before the cameras go up.
              </li>
            </ol>

            <h2>What is actually law</h2>
            <p>
              The <strong>Data Protection Act, No. 24 of 2019</strong> is the statute. It
              establishes the Office of the Data Protection Commissioner and sets out the
              principles every data controller must follow. CCTV footage of an identifiable person
              is personal data, so running cameras that capture people other than yourself makes
              you a data controller for that footage. That is not a Kenyan peculiarity — it is how
              every comparable regime treats it.
            </p>
            <p>The principles that bite hardest on CCTV are these four:</p>
            <ul>
              <li>
                <strong>Transparency.</strong> People must be able to know they are being
                recorded, which is what signage is for.
              </li>
              <li>
                <strong>Purpose limitation.</strong> Footage collected to deter theft is not
                footage you may use to check what time staff arrive, unless you said so up front.
              </li>
              <li>
                <strong>Data minimisation.</strong> Cameras cover what they need to cover. A
                camera aimed into a neighbour&apos;s garden is collecting data you have no reason
                to hold.
              </li>
              <li>
                <strong>Storage limitation.</strong> You keep footage only as long as the purpose
                requires. &ldquo;The drive is 8 TB so we keep six months&rdquo; is not a
                justification; it is the absence of one.
              </li>
            </ul>
            <p>
              The Act also gives people rights over data about them, including the right of
              access. And it provides for <strong>administrative penalties of up to KES 5 million,
              or for an undertaking up to 1% of annual turnover, whichever is lower</strong>.
              Treat that figure as indicative and confirm the current position with the ODPC — it
              is the kind of number that moves.
            </p>

            <h2>What is draft guidance, not law</h2>
            <p>
              In December 2025 the ODPC published a{" "}
              <strong>Draft Guidance Note for the Private Security sector</strong>. Draft is doing
              real work in that sentence: it signals clearly how the regulator reads the Act for
              this industry, and it is not itself binding. Almost nobody in Kenyan security has
              written about it, which is why most of what you will be told about CCTV compliance
              here is either invented or copied from a British website.
            </p>
            <p>What it sets out, and what we would plan around regardless:</p>
            <ul>
              <li>Visible &ldquo;CCTV surveillance&rdquo; signage.</li>
              <li>
                A stated lawful basis — legitimate interest, public interest, or consent, and
                consent is the weakest of the three in a workplace because an employee cannot
                freely refuse.
              </li>
              <li>
                A justified retention period, with no &ldquo;just in case&rdquo; storage.
              </li>
              <li>
                A <strong>data protection impact assessment</strong> before high-risk processing.
              </li>
              <li>Data protection by design, rather than bolted on afterwards.</li>
              <li>An incident-response plan for a breach.</li>
              <li>
                <strong>Subject access to footage within seven days.</strong>
              </li>
            </ul>
            <p>
              That last one is the requirement with the sharpest practical edge, and it is worth
              sitting with. If your retention is seven days and a request takes you two weeks to
              process, the footage is gone before you have answered — and having destroyed it in
              the ordinary course does not make the failure to respond go away. It also means you
              need a way to export one person&apos;s footage without exporting everybody
              else&apos;s, which is a configuration decision, not a legal one.
            </p>

            <h2>Registration with the ODPC</h2>
            <p>
              Data controllers and processors may be required to register with the ODPC, subject to
              thresholds set by regulation — smaller organisations below a turnover and headcount
              threshold are exempt, with exceptions for particular kinds of processing. Whether
              you fall inside it depends on your size and on what you actually do with footage, and
              it is the one question on this page where we would send you to the ODPC or an
              advocate rather than guess on your behalf.
            </p>
            <p>
              What we will say plainly: if you operate CCTV across multiple sites, monitor staff,
              or handle footage for other people, assume you need to look into it properly.
            </p>

            <h2>Where the other statute comes in</h2>
            <p>
              The <strong>Private Security Regulation Act, No. 13 of 2016</strong> governs who may
              provide private security services in Kenya and establishes the Private Security
              Regulatory Authority. It matters when you are choosing an installer rather than when
              you are running a camera.
            </p>
            <p>
              Our own position, stated because you should ask it of anybody:{" "}
              <strong>PSRA registration is in progress and we do not hold it yet.</strong>{" "}
              Communications Authority radio licensing, which applies to two-way radio rather than
              CCTV, is also in progress. Anybody in this industry telling you they hold either
              should be able to give you the number.
            </p>

            <h2>The five things worth doing this week</h2>
          </div>

          <ol className="mt-6 space-y-4">
            {[
              {
                title: "Put up signage",
                body: "At every entrance a camera covers. It is the cheapest step on this list and the most visible if you are ever asked what you did.",
              },
              {
                title: "Write down why the cameras are there",
                body: "One paragraph. What you are protecting, from what, and who can view footage. This is the document that answers a complaint.",
              },
              {
                title: "Set retention deliberately, then check it",
                body: "Decide the number, configure the recorder to it, and confirm the drive actually holds that long at your resolution and camera count. Most systems we survey are keeping far less than the owner believes.",
              },
              {
                title: "Know how you would export one person's footage",
                body: "Before somebody asks. If the answer is \"hand over the whole day\", that is a second problem on top of the first.",
              },
              {
                title: "Re-aim anything pointing off your property",
                body: "A camera covering a neighbour's door or a public footpath is the most common single compliance failure we see, and it is usually fixed by loosening two screws.",
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-brand-orange text-sm font-medium text-ink">
                  {index + 1}
                </span>
                <span>
                  <span className="font-display font-semibold text-ink">{step.title}</span>
                  <span className="mt-1 block text-muted-foreground">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <section className="rounded-card border border-line bg-paper p-5">
              <h2 className="font-display text-lg font-semibold text-ink">
                Positions we will support
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {[
                  "Your own boundary, your own gate, your own yard",
                  "Entrances and approaches, with signage",
                  "Shared areas of a workplace, with staff told in advance",
                  "A let property's exterior, disclosed in the listing",
                  "A till, a stockroom, a loading bay",
                ].map((point) => (
                  <li key={point} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-card border border-line bg-paper p-5">
              <h2 className="font-display text-lg font-semibold text-ink">
                Positions we will decline
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {[
                  "Bathrooms, changing areas and washrooms",
                  "Bedrooms, including a live-in worker's own room",
                  "Inside a space a guest or tenant has exclusive use of",
                  "A camera aimed into a neighbour's property",
                  "Covert cameras in a workplace",
                ].map((point) => (
                  <li key={point} className="flex gap-2">
                    <X
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                We will say so at survey rather than after installing it. It has cost us jobs.
              </p>
            </section>
          </div>

          <section className="mt-14" aria-labelledby="faq">
            <h2 id="faq" className="font-display text-2xl font-semibold text-ink">
              Questions people ask
            </h2>
            <dl className="mt-6 divide-y divide-line rounded-card border border-line bg-paper">
              {FAQ.map((entry) => (
                <div key={entry.question} className="p-5">
                  <dt className="font-display font-semibold text-ink">{entry.question}</dt>
                  <dd className="mt-2 text-muted-foreground">{entry.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-card border border-line bg-paper-warm p-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              Getting a system that is compliant by design
            </h2>
            <p className="mt-2 text-muted-foreground">
              Most of this is decided at survey, not afterwards: where the cameras point, what the
              retention is set to, who can view what, and whether the signage went up. We will
              tell you if a position you have asked for is one we think you should not have.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild size="cta">
                <a
                  href={whatsappLink(
                    settings.whatsappNumber,
                    "Hello Hornbill. I'd like to talk about CCTV and data protection compliance.",
                  )}
                >
                  Talk to us about compliance
                </a>
              </Button>
              <Button asChild variant="outline" size="cta">
                <Link href="/services/cctv-installation">CCTV installation</Link>
              </Button>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-lg font-semibold text-ink">Sources</h2>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li>Data Protection Act, No. 24 of 2019 (Kenya) — the statute.</li>
              <li>
                Office of the Data Protection Commissioner, Draft Guidance Note for the Private
                Security Sector, December 2025 — draft, not binding.
              </li>
              <li>Private Security Regulation Act, No. 13 of 2016 (Kenya).</li>
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              If you spot something on this page that is out of date or wrong, tell us and we will
              correct it. That is a genuine offer — a page like this is only worth anything if it
              is accurate.
            </p>
          </section>
        </article>
      </div>
    </>
  );
}

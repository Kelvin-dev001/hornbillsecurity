import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { BomTable } from "@/components/solutions/bom-table";
import { PriceStamp } from "@/components/price-stamp";
import { Button } from "@/components/ui/button";
import { getSolutionBySlug } from "@/lib/catalog/solutions";
import { getProjectBySlug, getProjects } from "@/lib/content/queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * A case study.
 *
 * docs/05 Sprint 5 asks for "the brief, the site conditions, the equipment
 * specified and why, photos, and the outcome", and the owner wants these
 * "documented vividly enough that a potential client believes them — treat this
 * as a primary trust asset, not a gallery."
 *
 * Two things do that work here, and neither is a photograph.
 *
 * **Site conditions.** Anybody can claim an installation. Only somebody who was
 * on site can tell you what the building made them do differently, so that
 * section gets its own heading rather than being folded into the narrative.
 *
 * **The bill of materials.** Where the owner has linked a package, the case
 * study renders its complete priced BOM. No competitor in this market publishes
 * a case study you can cost. It is labelled as what a system like this contains
 * rather than as the client's invoice, because the client's actual figures are
 * theirs and the site's published prices move monthly.
 *
 * Nothing on this page is generated. It renders what the owner entered in the
 * admin portal, and a project with sections left blank simply shows fewer of
 * them rather than having the gaps filled with copy nobody has verified.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: absoluteUrl(`/projects/${project.slug}`) },
    openGraph: {
      title: project.title,
      description: project.summary,
      type: "article",
      ...(project.images[0] ? { images: [project.images[0]] } : {}),
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, settings] = await Promise.all([getProjectBySlug(slug), getSiteSettings()]);

  if (!project) notFound();

  const solution = project.solutionSlug
    ? await getSolutionBySlug(project.solutionSlug, Number(settings.vatRate))
    : null;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: project.title, path: `/projects/${project.slug}` },
  ];

  const sections = [
    { heading: "The brief", body: project.challenge },
    { heading: "What the site imposed", body: project.siteConditions },
    { heading: "What we installed, and why", body: project.solution },
    { heading: "The result", body: project.outcome },
  ].filter((section): section is { heading: string; body: string } => Boolean(section.body));

  // The client if we may name them, the sector if not, and nothing rather than
  // a vague claim if neither is recorded.
  const attribution = project.clientName ?? project.sector;

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      <script
        {...jsonLdScriptProps({
          "@context": "https://schema.org",
          "@type": "Article",
          "@id": `${absoluteUrl(`/projects/${project.slug}`)}#article`,
          headline: project.title,
          description: project.summary,
          url: absoluteUrl(`/projects/${project.slug}`),
          ...(project.images[0] ? { image: project.images[0] } : {}),
          ...(project.completedAt ? { datePublished: project.completedAt } : {}),
          dateModified: project.updatedAt,
          author: { "@type": "Organization", name: settings.tradingName },
          publisher: { "@id": absoluteUrl("/#business") },
          ...(project.locationName
            ? {
                contentLocation: {
                  "@type": "Place",
                  name: `${project.locationName}, Kenya`,
                },
              }
            : {}),
        })}
      />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <article className="mx-auto mt-6 max-w-(--container-prose)">
          <header>
            {project.locationName ? (
              <p className="flex items-center gap-2 text-sm text-action">
                <MapPin className="size-4" aria-hidden="true" />
                {project.locationSlug ? (
                  <Link
                    href={`/locations/${project.locationSlug}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {project.locationName}
                  </Link>
                ) : (
                  project.locationName
                )}
              </p>
            ) : null}
            <h1 className="mt-2 text-3xl font-semibold text-balance text-ink sm:text-4xl">
              {project.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{project.summary}</p>
            {attribution || project.completedAt ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {attribution}
                {attribution && project.completedAt ? " · " : ""}
                {project.completedAt ? (
                  <time dateTime={project.completedAt}>
                    Completed{" "}
                    {new Intl.DateTimeFormat("en-GB", {
                      month: "long",
                      year: "numeric",
                      timeZone: "Africa/Nairobi",
                    }).format(new Date(project.completedAt))}
                  </time>
                ) : null}
              </p>
            ) : null}
          </header>

          {project.images[0] ? (
            <Image
              src={project.images[0]}
              alt=""
              width={1200}
              height={900}
              priority
              className="mt-8 w-full rounded-card object-cover"
            />
          ) : null}

          {sections.map((section) => (
            <section key={section.heading} className="mt-10">
              <h2 className="font-display text-xl font-semibold text-ink">{section.heading}</h2>
              <p className="mt-3 whitespace-pre-line text-muted-foreground">{section.body}</p>
            </section>
          ))}

          {project.images.length > 1 ? (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {project.images.slice(1).map((image) => (
                <li key={image}>
                  <Image
                    src={image}
                    alt=""
                    width={800}
                    height={600}
                    className="w-full rounded-card object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        {/*
          Outside the prose column, because a bill of materials needs the width.
          This is the part of a case study nobody else in this market publishes.
        */}
        {solution ? (
          <section className="mt-14" aria-labelledby="bom">
            <div className="mx-auto max-w-(--container-prose)">
              <h2 id="bom" className="font-display text-xl font-semibold text-ink">
                What a system like this contains
              </h2>
              <p className="mt-3 text-muted-foreground">
                This job was built on our{" "}
                <Link
                  href={`/solutions/${solution.slug}`}
                  className="text-action underline underline-offset-4"
                >
                  {solution.name}
                </Link>
                . Here is every line in it, at today&apos;s prices. Not this client&apos;s invoice
                — their figures are theirs, and ours are reviewed monthly — but the same
                specification, itemised the way we quote it.
              </p>
              <PriceStamp settings={settings} className="mt-3" />
            </div>

            <div className="mt-6">
              <BomTable
                bom={solution.bom}
                caption={`Bill of materials for the ${solution.name}`}
                depositPercent={settings.depositPercent}
              />
            </div>
          </section>
        ) : null}

        <section className="mx-auto mt-14 max-w-(--container-prose) rounded-card border border-line bg-paper-warm p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Want something similar?</h2>
          <p className="mt-2 text-muted-foreground">
            Build the system on the site and you will see the full bill of materials and the price
            before you speak to anybody. Or send us the site details and we will price it the same
            way.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="cta">
              <Link href="/build/cctv">Build a system</Link>
            </Button>
            <Button asChild variant="outline" size="cta">
              <a
                href={whatsappLink(
                  settings.whatsappNumber,
                  `Hello Hornbill. I saw the ${project.title} project and would like something similar.`,
                )}
              >
                Ask on WhatsApp
              </a>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

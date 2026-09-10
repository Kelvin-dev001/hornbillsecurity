import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getProjectBySlug, getProjects } from "@/lib/content/queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * A case study.
 *
 * Nothing is generated for this page — it renders what the owner enters in the
 * admin portal, including whether the client may be named. A project with no
 * completed sections simply shows fewer of them rather than filling the gaps
 * with copy nobody has verified.
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
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, settings] = await Promise.all([getProjectBySlug(slug), getSiteSettings()]);

  if (!project) notFound();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Projects", path: "/projects" },
    { name: project.title, path: `/projects/${project.slug}` },
  ];

  const sections = [
    { heading: "The problem", body: project.challenge },
    { heading: "What we installed", body: project.solution },
    { heading: "The result", body: project.outcome },
  ].filter((section): section is { heading: string; body: string } => Boolean(section.body));

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

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
            <p className="mt-3 text-sm text-muted-foreground">
              {project.clientName ? <>{project.clientName} · </> : null}
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

          <section className="mt-12 rounded-card border border-line bg-paper-warm p-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              Want something similar?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Build the system on the site and you will see the full bill of materials and the
              price before you speak to anybody.
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
        </article>
      </div>
    </>
  );
}

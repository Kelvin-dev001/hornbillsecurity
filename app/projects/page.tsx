import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getProjects, getTestimonials } from "@/lib/content/queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * /projects — completed work.
 *
 * Empty at launch, and honestly so. docs/09 items 6 and 8: the photographs and
 * the written permissions are the owner's to supply, and CLAUDE.md forbids
 * fabricating a reference or a review. A stock photograph of somebody else's
 * building on a page headed "our work" is exactly the thing this site exists to
 * be the opposite of.
 *
 * So the empty state says what it is, names only the clients whose permission
 * is on record (CLAUDE.md §9), and points at the thing we can actually show:
 * the priced bill of materials for every system we install.
 */
export const revalidate = 3600;

const trail = [
  { name: "Home", path: "/" },
  { name: "Projects", path: "/projects" },
];

export const metadata: Metadata = {
  title: "Completed installations",
  description:
    "CCTV, access control and perimeter security installations across Mombasa and the coast — what was installed, why, and what it cost.",
  alternates: { canonical: absoluteUrl("/projects") },
};

export default async function ProjectsPage() {
  const [settings, projects, testimonials] = await Promise.all([
    getSiteSettings(),
    getProjects(),
    getTestimonials(),
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            Work we have done
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {settings.yearsOperating}+ years of installations across{" "}
            {settings.serviceAreaLabel}, from four-camera homes to yards on the port corridor.
          </p>
        </header>

        {projects.length > 0 ? (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.slug}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-paper transition-colors hover:border-brand-orange/60">
                  {project.images[0] ? (
                    <Image
                      src={project.images[0]}
                      alt=""
                      width={800}
                      height={600}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : null}
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    {project.locationName ? (
                      <p className="flex items-center gap-1.5 text-xs text-action">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {project.locationName}
                      </p>
                    ) : null}
                    <h2 className="font-display text-lg font-semibold text-ink">
                      <Link href={`/projects/${project.slug}`}>
                        <span className="absolute inset-0" aria-hidden="true" />
                        {project.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">{project.summary}</p>
                    {project.clientName ? (
                      <p className="mt-auto pt-2 text-sm font-medium text-ink">
                        {project.clientName}
                      </p>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <section className="mt-10 rounded-card border border-line bg-paper-warm p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold text-ink">
              Case studies are being written up
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              We are photographing recent installations and getting each client&apos;s written
              permission before anything appears here. That takes a few weeks, and we would
              rather show you nothing than show you a stock photograph of a building we have
              never been to — which is what most of this industry&apos;s &ldquo;portfolio&rdquo;
              pages are.
            </p>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              In the meantime the honest version of a portfolio is on the rest of the site: every
              system we install is published with its complete bill of materials and its price,
              which tells you considerably more about how we work than a photograph would.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="cta">
                <Link href="/solutions">See what we install</Link>
              </Button>
              <Button asChild variant="outline" size="cta">
                <a
                  href={whatsappLink(
                    settings.whatsappNumber,
                    "Hello Hornbill. Could you put me in touch with a reference client?",
                  )}
                >
                  Ask for a reference
                </a>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Clients who have agreed to be named: Nebsam Digital Solutions and Mash East Africa
              Ltd. We are happy to arrange a conversation with either.
            </p>
          </section>
        )}

        {testimonials.length > 0 ? (
          <section className="mt-14" aria-labelledby="said">
            <h2 id="said" className="font-display text-xl font-semibold text-ink">
              What clients have said
            </h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <li
                  key={`${testimonial.author}-${testimonial.quote.slice(0, 20)}`}
                  className="rounded-card border border-line bg-paper p-5"
                >
                  <blockquote className="text-muted-foreground">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <p className="mt-3 text-sm font-medium text-ink">
                    {testimonial.author}
                    {testimonial.role ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {testimonial.role}
                      </span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}

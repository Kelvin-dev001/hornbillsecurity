import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { readingMinutes, renderMarkdown } from "@/lib/content/markdown";
import { getPostBySlug, getPosts, getRelatedPosts } from "@/lib/content/queries";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  jsonLdScriptProps,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings, whatsappLink } from "@/lib/site-settings";

/**
 * An article.
 *
 * Statically generated with the whole body in the HTML — docs/03 §0 is the
 * reason the stack is Next.js and not an SPA, and a cost guide nobody can read
 * without JavaScript is a cost guide ChatGPT cannot cite.
 *
 * The FAQ block renders as real question-and-answer markup and as FAQPage
 * structured data. docs/03: AI Overviews appear on about 68% of local searches
 * and on cost queries roughly 80% of the time, and this is the shape they lift.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    alternates: { canonical: absoluteUrl(`/blog/${post.slug}`) },
    openGraph: {
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, settings, related] = await Promise.all([
    getPostBySlug(slug),
    getSiteSettings(),
    // Tag overlap, then category, then recency. Taking the three newest meant
    // every article on a seven-article site linked to the same three, which is
    // useless to a reader and useless as an internal-linking signal.
    getRelatedPosts(slug),
  ]);

  if (!post) notFound();

  const trail = [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  const html = renderMarkdown(post.body);

  return (
    <>
      <script {...jsonLdScriptProps(articleJsonLd({ post, settings }))} />
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      {post.faq.length > 0 ? <script {...jsonLdScriptProps(faqJsonLd(post.faq))} /> : null}

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <article className="mx-auto mt-6 max-w-(--container-prose)">
          <header>
            <p className="text-sm tracking-wide text-action uppercase">{post.category}</p>
            <h1 className="mt-2 text-3xl font-semibold text-balance text-ink sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {post.author}
              {post.publishedAt ? (
                <>
                  {" · "}
                  <time dateTime={post.publishedAt}>
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "Africa/Nairobi",
                    }).format(new Date(post.publishedAt))}
                  </time>
                </>
              ) : null}
              {" · "}
              {readingMinutes(post.body)} min read
            </p>
          </header>

          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt=""
              width={1200}
              height={675}
              priority
              className="mt-8 aspect-[16/9] w-full rounded-card object-cover"
            />
          ) : null}

          {/*
            The body is markdown the owner wrote in the admin portal, rendered
            server-side with HTML escaped (lib/content/markdown.ts). The prose
            styles are here rather than in a plugin so the type scale stays the
            one in docs/04.
          */}
          <div
            className="prose-hornbill mt-10"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {post.faq.length > 0 ? (
            <section className="mt-14" aria-labelledby="faq">
              <h2 id="faq" className="font-display text-2xl font-semibold text-ink">
                Questions people ask
              </h2>
              <dl className="mt-6 divide-y divide-line rounded-card border border-line">
                {post.faq.map((entry) => (
                  <div key={entry.question} className="p-5">
                    <dt className="font-display font-semibold text-ink">{entry.question}</dt>
                    <dd className="mt-2 text-muted-foreground">{entry.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          <section className="mt-14 rounded-card border border-line bg-paper-warm p-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              See what your own system would cost
            </h2>
            <p className="mt-2 text-muted-foreground">
              Six questions and you get the whole bill of materials — every camera, every metre of
              cable, every connector and the labour, with a price on each line.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button asChild size="cta">
                <Link href="/build/cctv">Build a system</Link>
              </Button>
              <Button asChild variant="outline" size="cta">
                <a
                  href={whatsappLink(
                    settings.whatsappNumber,
                    `Hello Hornbill. I was reading "${post.title}" and would like to talk about a system.`,
                  )}
                >
                  Ask on WhatsApp
                </a>
              </Button>
            </div>
          </section>
        </article>

        {related.length > 0 ? (
          <section className="mx-auto mt-16 max-w-(--container-prose)" aria-labelledby="related">
            <h2 id="related" className="font-display text-xl font-semibold text-ink">
              More like this
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {related.map((other) => (
                <li key={other.slug}>
                  <Link
                    href={`/blog/${other.slug}`}
                    className="flex h-full flex-col gap-1 rounded-card border border-line bg-paper p-4 transition-colors hover:border-brand-orange/60"
                  >
                    <span className="text-xs text-action uppercase">{other.category}</span>
                    <span className="font-medium text-ink">{other.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}

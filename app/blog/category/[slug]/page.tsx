import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { readingMinutes } from "@/lib/content/markdown";
import { getPostCategories, getPostsByCategory } from "@/lib/content/queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * /blog/category/[slug] — docs/03 §2, docs/05 Sprint 7.
 *
 * Categories are derived from the articles rather than stored, so a category
 * with nothing in it does not exist and cannot be created by accident.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await getPostCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPostsByCategory(slug);
  if (!result) return {};

  const settings = await getSiteSettings();

  return {
    title: `${result.category.name} — guides and real costs`,
    description: `${result.category.count} article${result.category.count === 1 ? "" : "s"} on ${result.category.name.toLowerCase()} from ${settings.tradingName}. Real prices, itemised, ${settings.serviceAreaLabel}.`,
    alternates: { canonical: absoluteUrl(`/blog/category/${slug}`) },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, categories] = await Promise.all([
    getPostsByCategory(slug),
    getPostCategories(),
  ]);

  if (!result) notFound();
  const { category, posts } = result;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/blog" },
    { name: category.name, path: `/blog/category/${category.slug}` },
  ];

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-balance text-ink sm:text-4xl">
            {category.name}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {posts.length} article{posts.length === 1 ? "" : "s"}. Every price in them comes from
            the same catalogue our quotations do.
          </p>
        </header>

        <nav className="mt-8" aria-label="Article categories">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href="/blog"
                className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
              >
                All guides
              </Link>
            </li>
            {categories.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`/blog/category/${entry.slug}`}
                  aria-current={entry.slug === category.slug ? "page" : undefined}
                  className={
                    entry.slug === category.slug
                      ? "inline-flex h-9 items-center rounded-pill bg-brand-orange px-3 text-sm font-medium text-ink"
                      : "inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                  }
                >
                  {entry.name} ({entry.count})
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="group relative flex h-full flex-col gap-2 rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60">
                <h2 className="font-display text-lg font-semibold text-ink">
                  <Link href={`/blog/${post.slug}`}>
                    <span className="absolute inset-0" aria-hidden="true" />
                    {post.title}
                  </Link>
                </h2>
                <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                <p className="mt-auto pt-2 text-xs text-muted-foreground">
                  {readingMinutes(post.body)} min read
                </p>
              </article>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <Button asChild variant="outline" size="cta">
            <Link href="/blog">All guides</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

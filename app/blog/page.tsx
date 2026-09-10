import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { getPostCategories, getPosts } from "@/lib/content/queries";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings } from "@/lib/site-settings";

export const revalidate = 3600;

const TRAIL = [
  { name: "Home", path: "/" },
  { name: "Guides", path: "/blog" },
];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: "Guides and costs",
    description:
      `What security equipment actually costs in Kenya, what it does not do, and how to tell ` +
      `one quotation from another. ${settings.tradingName}, ${settings.serviceAreaLabel}.`,
    alternates: { canonical: absoluteUrl("/blog") },
  };
}

export default async function BlogIndexPage() {
  const [posts, settings, categories] = await Promise.all([
    getPosts(),
    getSiteSettings(),
    getPostCategories(),
  ]);

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(TRAIL))} />

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={TRAIL} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Guides and costs</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            What things cost, what they do not do, and how to read a quotation. Written for someone
            comparing three of them on WhatsApp.
          </p>
        </header>

        {categories.length > 1 ? (
          <nav className="mt-8" aria-label="Article categories">
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/blog/category/${category.slug}`}
                    className="inline-flex h-9 items-center rounded-pill border border-line px-3 text-sm text-muted-foreground transition-colors hover:border-ink hover:text-ink"
                  >
                    {category.name} ({category.count})
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {posts.length === 0 ? (
          <p className="mt-10 text-muted-foreground">
            Nothing published yet. {settings.responsePromise}
          </p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.slug}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-paper transition-colors hover:border-brand-orange/60">
                  {post.coverImageUrl ? (
                    <Image
                      src={post.coverImageUrl}
                      alt=""
                      width={640}
                      height={360}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : null}

                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <p className="text-xs tracking-wide text-action uppercase">{post.category}</p>
                    <h2 className="font-display text-lg font-semibold text-ink">
                      <Link href={`/blog/${post.slug}`}>
                        <span className="absolute inset-0" aria-hidden="true" />
                        {post.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-muted-foreground">{post.excerpt}</p>
                    {post.publishedAt ? (
                      <p className="mt-auto pt-2 text-xs text-muted-foreground">
                        <time dateTime={post.publishedAt}>
                          {new Intl.DateTimeFormat("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            timeZone: "Africa/Nairobi",
                          }).format(new Date(post.publishedAt))}
                        </time>
                      </p>
                    ) : null}
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

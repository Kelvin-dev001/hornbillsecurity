import { getPosts } from "@/lib/content/queries";
import { absoluteUrl } from "@/lib/seo/origin";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * /rss.xml — docs/03 §2.
 *
 * Modest but not pointless. Nobody in this market publishes a feed, the
 * content plan in docs/10 commits to two articles a week after launch, and a
 * feed is how the handful of people who would syndicate or monitor that
 * actually find out. It costs twenty lines.
 *
 * Full content is deliberately NOT included, only the excerpt. The articles
 * carry price tables whose numbers are reviewed monthly, and a feed reader
 * showing a cached copy of a price from four months ago is exactly the kind of
 * stale figure the rest of this codebase works to prevent — the link goes to
 * the page, where the table is current.
 */
export const revalidate = 3600;

/** XML-escape. Article titles contain ampersands and quotation marks. */
function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [settings, posts] = await Promise.all([getSiteSettings(), getPosts()]);

  const updated = posts[0]?.publishedAt ?? settings.updatedAt.toISOString();

  const items = posts
    .map((post) =>
      [
        "    <item>",
        `      <title>${escape(post.title)}</title>`,
        `      <link>${absoluteUrl(`/blog/${post.slug}`)}</link>`,
        `      <guid isPermaLink="true">${absoluteUrl(`/blog/${post.slug}`)}</guid>`,
        `      <description>${escape(post.excerpt)}</description>`,
        `      <category>${escape(post.category)}</category>`,
        post.publishedAt
          ? `      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>`
          : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escape(settings.tradingName)} — guides and real costs</title>`,
    `    <link>${absoluteUrl("/blog")}</link>`,
    `    <description>${escape(
      `What security equipment actually costs in ${settings.serviceAreaLabel}, itemised. Written for somebody comparing three quotations on WhatsApp.`,
    )}</description>`,
    "    <language>en-KE</language>",
    `    <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${absoluteUrl("/rss.xml")}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

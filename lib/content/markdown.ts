import { marked } from "marked";

/**
 * Article bodies, from markdown.
 *
 * docs/02 has posts.body as MDX. MDX compiles at build time; these live in the
 * database and are written by the owner in the admin portal, so they are
 * rendered at request time from markdown instead. Same authoring experience,
 * no build step between writing and publishing.
 *
 * Raw HTML is escaped rather than passed through. The only author is the owner,
 * so this is not about untrusted input — it is about the day an admin session is
 * compromised, when the difference between "they can edit an article" and "they
 * can inject a script into every visitor's browser" is this one setting.
 *
 * Synchronous on purpose: marked can be async with extensions, and an article
 * body that returns a Promise into JSX renders as "[object Promise]".
 */
marked.setOptions({
  gfm: true,
  breaks: false,
  async: false,
});

export function renderMarkdown(source: string): string {
  return marked.parse(source, { async: false }) as string;
}

/**
 * The first paragraph, for a meta description when none was written.
 *
 * Trimmed to 155 characters at a word boundary, because a description cut
 * mid-word looks like a broken page in a search result.
 */
export function excerptFrom(source: string, limit = 155): string {
  const text = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Rough reading time, for the article header. */
export function readingMinutes(source: string): number {
  const words = source.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

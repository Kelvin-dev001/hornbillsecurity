/**
 * The canonical origin of the site.
 *
 * We launch on the Vercel production URL and attach
 * security.hornbilltech.co.ke later (docs/09 item 9). Swapping the domain must
 * therefore be a config change and nothing else, so no hostname may ever appear
 * as a literal in a sitemap, a canonical tag, JSON-LD, an OG tag or the
 * quotation PDF. Everything reads from NEXT_PUBLIC_SITE_URL through here.
 *
 * NEXT_PUBLIC_ so the same value is available in client components; it is not a
 * secret.
 */

const ENV_VAR = "NEXT_PUBLIC_SITE_URL";

export function getSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;

  if (!raw) {
    throw new Error(
      `${ENV_VAR} is not set. Set it to the full origin this deployment is ` +
        `served from, e.g. https://hornbillsecurity.vercel.app in production ` +
        `or http://localhost:3000 locally. See .env.example.`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `${ENV_VAR} is not a valid absolute URL (received "${raw}"). ` +
        `It must include the scheme, e.g. https://example.com.`,
    );
  }

  // Normalise away any trailing slash or path so callers can safely join.
  return parsed.origin;
}

/** Absolute URL for a site-relative path, e.g. absoluteUrl("/catalog"). */
export function absoluteUrl(path = "/"): string {
  return new URL(path, getSiteOrigin()).toString();
}

/** `new URL(...)` form Next.js wants for `metadata.metadataBase`. */
export function metadataBase(): URL {
  return new URL(getSiteOrigin());
}

/**
 * The one cache window every read layer shares.
 *
 * Why this exists, and it is not a tidiness thing.
 *
 * Every reader in lib/catalog, lib/content and lib/site-settings wraps its query
 * in `unstable_cache` with a tag, so the admin portal can bust it with
 * `revalidateTag` on save. That part works. What was missing was an expiry: an
 * `unstable_cache` entry with no `revalidate` is kept **indefinitely**, and it is
 * persisted to `.next/cache/fetch-cache`, which survives across builds — and on
 * Vercel, across deployments.
 *
 * The failure that found this: articles were seeded into the database, the site
 * was rebuilt, and every article rendered as a 404 while `generateStaticParams`
 * happily produced their slugs. Earlier builds had cached an empty posts list,
 * that entry had no expiry, and nothing in the app had called `revalidateTag`
 * because the change came from a seed script rather than from the admin portal.
 * A build reflecting a database it had already read hours earlier is a very quiet
 * way to launch a site with no content on it.
 *
 * So every cached reader now carries this window. Tag revalidation is still the
 * fast path for an admin edit; this is the floor that keeps a stale entry from
 * outliving the data forever when a change arrives from outside the app.
 *
 * It matches the `revalidate` on the public pages deliberately: two caching
 * layers in front of the same row with different lifetimes is how a price ends up
 * disagreeing with itself between two pages.
 */
export const CACHE_TTL_SECONDS = 3600;

/**
 * `unstable_cache` plus a retry on a transient database failure.
 *
 * Every cached reader in lib/ goes through this. Two problems it solves.
 *
 * **The repetition.** Thirteen call sites were each repeating
 * `{ tags: [TAG], revalidate: CACHE_TTL_SECONDS }`, and one of them forgetting
 * the revalidate is how the stale-cache bug in docs/11 happened in the first
 * place.
 *
 * **The build-killing one.** A cold build asks Supabase for the same handful of
 * rows from every prerender worker at once, and under that burst a query can
 * come back `57014 canceling statement due to statement timeout`. Next retries
 * its *own* 120-second prerender timeout, but a query that errors is a hard
 * prerender failure — so one slow moment on a trivial
 * `select … from site_settings limit 1` took down an entire build.
 *
 * A read is safe to retry by definition, so it is retried with a short backoff
 * rather than being allowed to fail a build or an ISR revalidation. Only
 * transient classes are retried: a genuine error — a missing column, a bad
 * query — must still fail loudly and immediately rather than three times slowly.
 */
const TRANSIENT_CODES = new Set([
  "57014", // statement timeout
  "57P01", // admin shutdown
  "57P03", // cannot connect now, server starting up
  "08000", // connection exception
  "08003", // connection does not exist
  "08006", // connection failure
  "53300", // too many connections
  "XX000", // Supabase pooler, including EMAXCONNSESSION when the session pool is full
  "40001", // serialisation failure
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "CONNECT_TIMEOUT",
]);

function isTransient(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && TRANSIENT_CODES.has(code)) return true;
  // The Supabase pooler reports a full pool in the message rather than in a
  // distinct code: "(EMAXCONNSESSION) max clients reached in session mode".
  // Losing that race is a wait-and-retry, not a failure.
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string" && message.includes("EMAXCONNSESSION")) return true;
  // postgres.js wraps the driver error; drizzle wraps that again.
  const cause = (error as { cause?: unknown }).cause;
  return cause ? isTransient(cause) : false;
}

const ATTEMPTS = 3;

export async function readWithRetry<T>(read: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      if (!isTransient(error)) throw error;
      lastError = error;

      if (attempt < ATTEMPTS) {
        // 250ms, then 1s. Long enough for a connection burst to drain, short
        // enough that a build does not crawl.
        await new Promise((resolve) => setTimeout(resolve, 250 * 4 ** (attempt - 1)));
        console.warn(`  retrying ${label} after a transient database error (attempt ${attempt})`);
      }
    }
  }

  throw lastError;
}

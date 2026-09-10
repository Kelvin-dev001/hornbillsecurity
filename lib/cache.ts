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

/**
 * Throws away Next's persisted read cache before a build.
 *
 * Wired as `prebuild`, so it runs on every `npm run build` including Vercel's.
 *
 * ## Why a build must not trust this cache
 *
 * Every reader in `lib/` wraps its query in `unstable_cache` with a tag, so the
 * admin portal can bust it with `revalidateTag` on save. Those entries are
 * written to `.next/cache/fetch-cache`, which **survives across builds** — and
 * on Vercel, across deployments.
 *
 * That is fine when every change to the data goes through the app. It is not
 * fine here, because several do not:
 *
 *   - `npm run db:seed` rewrites the catalogue, the packages and the articles.
 *   - `npm run db:migrate` can backfill columns with an `UPDATE`.
 *   - The owner can edit a row in the Supabase dashboard.
 *
 * None of those calls `revalidateTag`, so a build afterwards can faithfully
 * reflect a database it read hours earlier. This has now bitten twice, both
 * times the same way: an article was seeded, the site was rebuilt, and every
 * article rendered as a **404** while `generateStaticParams` cheerfully produced
 * its slug — because an earlier build had cached an empty posts list. The
 * second time, the seed's own cache clear was not enough, because a `db:migrate`
 * and another build had run in between and repopulated it.
 *
 * ## Why clearing it costs almost nothing
 *
 * Deduplication *within* a build still works: the first page to read a row
 * populates the cache and every later page hits it. What disappears is only
 * reuse *between* builds — and for a site whose content lives entirely in
 * Postgres and which is rebuilt on deploy, that reuse buys a few seconds and
 * risks shipping a page that is silently wrong.
 *
 * The visible price is a burst of prerender timeouts at the start of a cold
 * build — around a dozen on a 167-page build — as every worker misses the cache
 * at once and reaches Supabase together. They retry and succeed, and
 * `staticPageGenerationTimeout` is set to 120 s to absorb it. Noisy, not broken.
 *
 * `lib/cache.ts` puts a one-hour ceiling on every entry as well, which is the
 * backstop for a change that arrives while the site is running rather than at
 * build time.
 */
import { rm } from "node:fs/promises";
import { join } from "node:path";

const dir = join(process.cwd(), ".next", "cache", "fetch-cache");

try {
  await rm(dir, { recursive: true, force: true });
  console.log("• cleared .next/cache/fetch-cache so this build reads the database");
} catch (error) {
  // Never fail a build over a cache directory. The worst case is the stale-read
  // behaviour this script exists to prevent, which lib/cache.ts caps at an hour.
  console.warn(`! could not clear the Next read cache: ${error.message}`);
}

# 11 · Launch Checklist

The list in `docs/05-sprint-plan.md` Sprint 4, with what is actually done and what is left. Anything marked **owner** cannot be done from this repository — it needs an account, a dashboard or a password, and nothing here handles a password.

Status as at the end of Sprint 4.

## In the code — done

| Item | State | Where |
|---|---|---|
| `sitemap.xml` | Done. Built from the database, so a page the owner publishes appears without a code change | `app/sitemap.ts` — 160+ URLs: home, catalogue, categories, items, solutions, price list and brand price lists, services, both location page sets, blog, projects, about, contact, FAQ |
| `robots.txt` | Done. `/admin/`, `/api/`, `/quote` and `/q/` disallowed | `app/robots.ts` |
| `llms.txt` | Done, and generated rather than hand-kept, so it cannot go stale | `app/llms.txt/route.ts`. See `docs/03` §6 for the honest assessment of what it is worth: publish it, do not believe in it |
| Canonical tags | Done on every page, read from `NEXT_PUBLIC_SITE_URL` — no hostname literal anywhere | `lib/seo/origin.ts` |
| `noindex` on admin | Done, and the pages are also auth-gated and `force-dynamic` | `app/admin/layout.tsx`, `middleware.ts` |
| `noindex` on `/quote` and `/q/[code]` | Done. One is a visitor's working state, the other carries a customer's name | Their own metadata plus `robots.ts` |
| Prices in the HTML | Done and verified by fetching the built pages with no JavaScript. Evidence below |  |
| Structured data | Done: `LocalBusiness`, `WebSite`+`SearchAction`, `Product`+`Offer`, `Service`+`Offer`, `ItemList`, `Article`, `FAQPage`, `BreadcrumbList` | `lib/seo/json-ld.ts` |
| `AggregateRating` | Deliberately absent until real reviews exist — `docs/09` item 8. Fabricating it is a policy violation and is easily caught |  |
| Cost price cannot leak | Four independent layers, and a 173-route scan that has twice been proved to fail when a real leak is planted | `tests/cost-price-leak.test.ts` |

## Owner actions — cannot be done from here

| Item | Who | Notes |
|---|---|---|
| Create the single admin user | **owner** | Supabase → Authentication → Users. `docs/09` item 33. Nothing in this repository may set a password, so there is no sign-up route and never will be |
| DNS and SSL for `security.hornbilltech.co.ke` | **owner** | `docs/09` item 9. Launching on the Vercel production URL by design; the canonical origin is an env var, so attaching the domain is a config change and a redeploy |
| Google Search Console | **owner** | Register the property and submit `/sitemap.xml`. Register the Vercel URL now and the custom domain when it lands |
| Bing Webmaster Tools | **owner** | Ten minutes, free, and it is what Copilot reads. `docs/03` §6 |
| GA4 | **owner** | Measurement ID into the env, then it renders |
| Google Business Profile — Mombasa | **owner** | `docs/09` item 7. The highest-return single asset on the whole list: ~67% of Google AI Overview local citations. Primary category **Security System Installer**, not Supplier. One profile, Mombasa only |
| `RESEND_API_KEY` | **owner** | `docs/09` item 31. Without it a quote still saves, `/q/[code]` still works and the PDF still downloads — only the two emails are skipped |
| `QUOTE_HASH_SALT` | **owner** | `docs/09` item 32. `openssl rand -hex 32` |

## Outstanding in the code

| Item | State |
|---|---|
| OG images | **Not done.** Article and page metadata carry `openGraph` titles and descriptions, and an article with a cover image uses it. There is no generated OG image for pages without one, so a WhatsApp link preview currently shows a title and no picture. `next/og` would generate them from the page title and price — a small, self-contained piece of work, and it matters more than usual here because the whole distribution model is a link pasted into WhatsApp |
| Lighthouse ≥95 on throttled mobile | **Not measured.** Lighthouse cannot be run from this environment — there is no Chrome to drive and no way to apply the mobile throttling profile, so any number reported here would be invented. It has to be run by the owner, or in CI, against the deployed URL. What can be said from the build output is below |

### What the build output actually says

Every public page ships **103 kB of shared JavaScript** and between 148 B and 3.85 kB of its own. Everything that carries a price is statically prerendered, so the HTML arrives complete on the first byte with no client-side fetch. The largest page is `/price-list` at **287 kB of HTML** — well inside the 4 MB limit in `CLAUDE.md` §2.4, and it is the only page anywhere near that size because it is deliberately the whole catalogue on one page.

That is the shape a good Lighthouse score comes from, but it is not a score. Run it and record the real number.

## Verified: prices are in the HTML

Fetched from the production build with `curl`, which executes no JavaScript. This is the check `docs/05` asks for.

Home page, the worked bill of materials, tags stripped:

```
Bill of materials for the Home Essential 4, KES excluding 16% VAT
Item | Qty | Unit price | Total
Camera installation, per point        | 4  | KES 3,000 | KES 12,000
PVC Trunking 25 x 16 mm, 2 m Length   | 24 | KES 400   | KES 9,600
1 TB Surveillance Hard Disk Drive     | 1  | KES 9,100 | KES 9,100
RG59 Siamese Coaxial + Power Cable    | 1  | KES 8,400 | KES 8,400
4-Channel Turbo HD 1080p DVR          | 1  | KES 7,100 | KES 7,100
2MP EXIR Fixed Bullet Turbo HD Camera | 4  | KES 1,600 | KES 6,400
+ 6 more lines — connectors, clips, trunking, power and labour, each priced.
Total, excluding 16% VAT              | KES 60,400
```

Per page, from the raw HTML — real `<table>` elements, `KES` amounts and JSON-LD blocks, with no JavaScript run:

| Page | HTML | `<table>` | KES amounts | JSON-LD |
|---|---:|---:|---:|---:|
| `/price-list` | 287 kB | 13 | 180 | 6 |
| `/services` | 92 kB | 6 | 14 | 2 |
| `/services/cctv-installation` | 128 kB | 1 | 30 | 6 |
| `/services/cctv-installation/nyali` | 91 kB | 0 | 22 | 4 |
| `/solutions/home-colour-4-camera-colorvu-cctv` | 119 kB | 1 | 92 | 4 |
| `/blog/cctv-installation-cost-kenya-itemised-bill-of-materials` | 105 kB | 3 | 240 | 4 |
| `/catalog/item/hikvision-ds-2cd1043g2-liuf-sl` | 121 kB | 1 | 26 | 4 |

## The build failure that the prebuild clear exposed

Worth reading before touching `db/index.ts` or `lib/cache.ts`.

Clearing the read cache before every build (above) means all 88 routes hit
Supabase cold at the same moment. Under that burst a trivial query —
`select … from site_settings limit 1` — came back `57014 canceling statement
due to statement timeout`, and **Next does not retry a query that errors**. It
retries its own 120-second prerender timeout, but a failed read is a hard
prerender failure, so one slow moment ended the whole export.

Two changes, and both are needed:

- `db/index.ts` drops the pool from `max: 5` to `max: 3`. Next prerenders with
  several worker processes and each holds its own pool, so five per worker was
  what saturated the pooler in the first place. Three covers the parallel reads
  a single page makes.
- `lib/cache.ts` retries a transient failure — statement timeout, connection
  loss, too many connections — with a short backoff. A read is safe to retry by
  definition. A *real* error (a missing column, a bad query) still fails at
  once, because retrying it three times only makes a broken build slower to
  diagnose.

`tests/read-retry.test.ts` covers the guard, including the exact nesting the
failure arrived in: postgres.js wraps the driver error and Drizzle wraps that
again, so the code that matters is two levels down. If a dependency bump moves
it, that test fails instead of the next production build.

## One build characteristic worth knowing

A build with a cold read cache produces a burst of prerender timeouts that then retry and succeed — around a dozen on an 88-route build. Every prerender worker misses the persisted cache at the same moment and they all reach Supabase together; once the first read lands, the rest are served from cache. `staticPageGenerationTimeout` is set to 120 s to absorb it.

It is noisy rather than broken, and a warm build produces none. If a Vercel build ever fails outright on this, raise the timeout rather than reducing the page count.

## The same caching bug, twice

It is written up below because it came back, and the second time is the more
useful lesson.

**First time.** Articles were seeded, the site was rebuilt, and all five rendered
as 404. Fixed with `lib/cache.ts` (a TTL on every cached reader) and a cache
clear at the end of `npm run db:seed`.

**Second time, in Sprint 5.** Two more articles were seeded and did exactly the
same thing — even though the seed had cleared the cache. A `npm run db:migrate`
and another build had run in between, and the migrate step does not clear
anything, so a stale entry was back before the final build.

The fix that actually closes it is structural rather than another place to
remember: **a build must not trust a cache that can disagree with the
database.** `scripts/clear-read-cache.mjs` is wired as `prebuild`, so every
build — including Vercel's — starts from the database. Deduplication *within* a
build still works; only reuse *between* builds is given up, and that reuse was
buying a few seconds while risking a page that is silently wrong.

Read the header comment in that script before removing it.

## The original write-up

Articles were seeded into the database, the site was rebuilt, and all five rendered as **404** while `generateStaticParams` cheerfully produced their slugs.

Every reader in `lib/` wraps its query in `unstable_cache` with a tag so the admin portal can bust it with `revalidateTag` on save. None of them had a `revalidate`, and an `unstable_cache` entry with no expiry is kept indefinitely **and persisted to `.next/cache/fetch-cache`, which survives across builds** — and on Vercel, across deployments. An earlier build had cached an empty posts list, nothing had called `revalidateTag` because the change came from a seed script rather than the admin portal, and so the build faithfully reflected a database it had read hours earlier.

Two fixes, both in place:

1. `lib/cache.ts` defines one TTL and every cached reader now carries it, so no entry can outlive the data by more than an hour. Tag revalidation is still the fast path for an admin edit; this is the floor for a change that arrives from outside the app.
2. `db/seed/index.ts` clears `.next/cache/fetch-cache` when it finishes, because a seed knows it has just changed data behind the app's back. A build straight after a seed now reflects what was seeded.

Worth remembering as a class of bug rather than a one-off: **a build can be stale with respect to a database it can reach.** If content is in the database and missing from the site, clear the read cache before doubting the query.

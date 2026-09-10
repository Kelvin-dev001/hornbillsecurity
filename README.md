# Hornbill Smart Security Services

Lead-generation and quoting site for **Hornbill Smart Security Services**, the
smart-security division of **Hornbill Technology Solutions Ltd** (Mombasa,
Kenya).

Read [`CLAUDE.md`](./CLAUDE.md) before changing anything — it is the operating
contract. The documents it points at in [`docs/`](./docs) settle the business
rules, the schema, the URL architecture and the design system.

Not an e-commerce site. No cart, no checkout, no payment gateway. Every
commercial action ends in a WhatsApp conversation or a phone call.

## Stack

Next.js 15 (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui ·
Supabase Postgres · Drizzle ORM · Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill it in — every variable is documented
npm run db:migrate             # schema, RLS policies, the public_items view
npm run db:seed                # business facts, pricing rules, the catalogue
npm run dev
```

`npm run dev` will not render without a seeded `site_settings` row: every
business fact on the site is read from the database and there are deliberately
no hardcoded fallbacks.

The seed reads [`docs/07-catalog-seed.csv`](./docs/07-catalog-seed.csv) — the
owner's own price list — and is idempotent, so editing a price there and
re-running updates the row in place.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint, including the service-role import guard |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Everything below |
| `npm run test:unit` | The pricing rule, and its agreement with the database |
| `npm run test:leak` | Fetches every public route and hunts for a leaked cost price |
| `npm run test:e2e` | Walks the quote flow as an anonymous visitor |
| `npm run db:generate` | Generate a migration from `db/schema.ts` |
| `npm run db:migrate` | Apply migrations (uses `DATABASE_URL_DIRECT`) |
| `npm run db:seed` | Seed / re-seed everything (idempotent) |
| `npm run db:studio` | Drizzle Studio |

There is deliberately no `db:push`. Migrations carry the RLS policies, and
`push` would silently skip them.

## Five rules the code enforces for you

**1. Cost prices cannot reach the browser.** `lib/supabase/admin.ts` holds the
service-role client, which bypasses RLS. It starts with `import "server-only"`,
so a client-bundle import is a build error; ESLint forbids importing it outside
`app/api/**`, `app/admin/**` and `db/**`; and `SUPABASE_SERVICE_ROLE_KEY` may
only be read inside that one file. Public queries use `lib/supabase/server.ts`
with an explicit select list. See CLAUDE.md §2.3.

Above that sit three more layers, because one mistake should not be enough.
Every catalogue query reads the `public_items` view, which has no
`cost_price` column — so `publicItems.costPrice` does not compile. The `anon`
and `authenticated` roles hold column-level SELECT grants that exclude
`cost_price`, `markup_multiplier` and `internal_note`, so `select *` through
PostgREST fails closed. And `npm run test:leak` fetches all 95 public routes and
asserts that no distributor cost appears in any response body, in the HTML or in
the RSC payload.

**2. No hostname literals.** The canonical origin is read from
`NEXT_PUBLIC_SITE_URL` through `lib/seo/origin.ts` and nowhere else, so
attaching `security.hornbilltech.co.ke` to the Vercel deployment later is a
config change and nothing else.

**4. No quantity is a literal.** Every BOM quantity is a formula over
`pricing_rules` — `ceil(cameras * cable_m_per_camera_residential *
cable_wastage_factor / 305)` — evaluated by `lib/pricing/formula.ts`, which is a
hand-written allow-list parser and **never `eval` or `new Function`**. Those
strings are editable from an admin form, so an evaluator with access to the
language would be a remote code execution hole. Change one rule and all
seventeen packages and every builder result re-price together.

**5. A quote freezes its prices.** `quotes.lines` is a jsonb snapshot carrying
the name, spec, unit and price of every line — and deliberately no foreign keys.
docs/02: "A customer must be able to reopen /q/AB12CD next week and see what they
were shown." The monthly price review, a renamed product or an unpublished SKU
must change nothing on a quotation already issued, and
`npm run test:e2e` proves it by repricing an item mid-test and re-reading the
saved quote.

**3. No hardcoded business facts.** The WhatsApp number, address, M-Pesa
paybill, VAT rate, response promise, warranty and quote validity all live in the
single `site_settings` row and are read through `getSiteSettings()`
(`lib/site-settings.ts`). `db/seed/site-settings.ts` is the only file in the
repo where any of those values is written down.

## Layout

```
app/
  (marketing)/        home, about, contact, faq
    services/         labour rates, the CCTV service page, service x location
    locations/        coverage, and a page per coast area
    price-list/       every published price, and a page per brand
  catalog/            catalogue, category pages, item pages
  solutions/          packaged systems and their bills of materials
  build/              the Solution Builder
  quote/              the basket and the submission form
  q/[code]/           a saved quotation, and its PDF
  blog/               the guides
  projects/           case studies
  admin/              the portal, auth-gated and noindex
                      items · prices · leads · articles · case studies ·
                      areas · testimonials · FAQs · packages · services ·
                      quantity rules · images · business details
  api/                quote summary, CSV export
  layout.tsx          fonts, header, footer, WhatsApp FAB
  robots.ts sitemap.ts llms.txt/
components/
  catalog/            ItemCard, SpecTable, price tables, facets
  solutions/          BOMTable, SolutionCard, the builder's questions
  quote/              add-to-quote, the sticky bar, the submission form
  layout/             header, footer
  ui/                 shadcn/ui
lib/
  admin/              auth, the price panel, CSV, bulk review, media,
                      content editors, the review-request builder
  cache.ts            the one TTL every cached reader shares — read the comment
  catalog/            the read layer — public_items only, plus the builder
  pricing/            effectivePrice(), the formula evaluator, BOM expansion
  quote/              basket, submission, the frozen snapshot, PDF and email
  content/            posts, locations, projects, testimonials, FAQs; markdown
  seo/                canonical origin, JSON-LD builders
  supabase/           browser · server · service-role clients
  site-settings.ts    getSiteSettings() and its formatters
db/
  schema.ts migrations/ seed/
scripts/
  clear-read-cache.mjs  prebuild; read its header before removing it
tests/                the cost-price leak scan and the pricing rule
docs/                 the business, schema, SEO and design documents
```

## Caching, and the one trap in it

Every reader in `lib/` wraps its query in `unstable_cache` with a tag, so an
admin save can bust it with `revalidateTag`. Two things to know before you
touch that:

- **`unstable_cache` round-trips its payload through JSON.** A `Date` comes back
  as a string on a cache *hit* — and only on a hit, so the bug passes the first
  request and fails the second. The cached functions therefore return ISO
  strings in their types, and the caller rehydrates. Do not widen those types
  back to `Date`.
- **An entry with no `revalidate` never expires, and it is persisted to
  `.next/cache/fetch-cache`, which survives across builds and deployments.**
  That twice made a build serve seeded articles as 404 while
  `generateStaticParams` produced their slugs, because an earlier build had
  cached an empty list and nothing had called `revalidateTag` — the change came
  from a seed script, not the admin portal.

  Three things now stand between you and that: `lib/cache.ts` puts a one-hour
  ceiling on every entry, `npm run db:seed` clears the cache directory, and
  `scripts/clear-read-cache.mjs` runs as `prebuild` so **no build trusts a cache
  that can disagree with the database**. If content is in the database and
  missing from the site, clear that directory before doubting the query.
  `docs/11-launch-checklist.md` has both write-ups.

## Accessibility

The brand orange fails AA with white text (3.25:1). The primary button is
`--brand-orange` with `--ink` text (5.88:1), which is what the logo itself does.
Where white on orange is unavoidable, use `--action` (`#C64200`, 5.02:1).
Never white on `#F85A00`. See `docs/04-design-system.md`.

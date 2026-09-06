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
| `npm run db:generate` | Generate a migration from `db/schema.ts` |
| `npm run db:migrate` | Apply migrations (uses `DATABASE_URL_DIRECT`) |
| `npm run db:seed` | Seed / re-seed everything (idempotent) |
| `npm run db:studio` | Drizzle Studio |

There is deliberately no `db:push`. Migrations carry the RLS policies, and
`push` would silently skip them.

## Four rules the code enforces for you

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

**3. No hardcoded business facts.** The WhatsApp number, address, M-Pesa
paybill, VAT rate, response promise, warranty and quote validity all live in the
single `site_settings` row and are read through `getSiteSettings()`
(`lib/site-settings.ts`). `db/seed/site-settings.ts` is the only file in the
repo where any of those values is written down.

## Layout

```
app/
  (marketing)/        home, services, locations, about, contact
  catalog/            catalogue, category pages, item pages
  solutions/          packaged systems and their bills of materials
  build/              the Solution Builder
  layout.tsx          fonts, header, footer, WhatsApp FAB
  robots.ts sitemap.ts
components/
  catalog/            ItemCard, SpecTable, price tables, facets
  solutions/          BOMTable, SolutionCard, the builder's questions
  layout/             header, footer
  ui/                 shadcn/ui
lib/
  catalog/            the read layer — public_items only, plus the builder
  pricing/            effectivePrice(), the formula evaluator, BOM expansion
  seo/                canonical origin, JSON-LD builders
  supabase/           browser · server · service-role clients
  site-settings.ts    getSiteSettings() and its formatters
db/
  schema.ts migrations/ seed/
tests/                the cost-price leak scan and the pricing rule
docs/                 the business, schema, SEO and design documents
```

## Accessibility

The brand orange fails AA with white text (3.25:1). The primary button is
`--brand-orange` with `--ink` text (5.88:1), which is what the logo itself does.
Where white on orange is unavoidable, use `--action` (`#C64200`, 5.02:1).
Never white on `#F85A00`. See `docs/04-design-system.md`.

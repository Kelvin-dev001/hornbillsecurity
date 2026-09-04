# 08 · Claude Code Kickoff Prompts

Open Claude Code in `C:\Projects\sss` and paste one sprint at a time. Do not paste two at once — each sprint is meant to be reviewed in a browser before the next begins.

Claude Code reads `CLAUDE.md` automatically. These prompts assume that.

---

## Sprint 0 — Foundation

```
Read CLAUDE.md, docs/04-design-system.md and docs/09-open-items.md in full
before writing any code.

Scaffold this project in place. It is an empty folder with a docs/ directory,
a logo/ folder and a screenshots/ folder — leave all three alone.

STACK
- Next.js 15, App Router, TypeScript, ESLint, no src/ directory
- Tailwind CSS v4 + shadcn/ui
- Drizzle ORM against Supabase Postgres
- Deployed on Vercel, repo github.com/Kelvin-dev001/hornbillsecurity

BUILD

1. Scaffold Next.js and Tailwind. Follow the folder layout in CLAUDE.md §7.

2. Supabase wiring — three clients, clearly separated:
   - browser client
   - server client (cookie-based, for server components and route handlers)
   - service-role admin client that must NEVER be imported into anything that
     ships to the browser. Add an ESLint rule or a lint-staged check that
     fails if it is imported outside lib/supabase/admin.ts and app/api or
     app/admin server code.

3. Drizzle config plus an initial migration containing only the
   site_settings table (single row) with the fields listed in
   docs/02-data-model.md. Seed it with the real business facts from
   CLAUDE.md §9 — company name, registration, KRA PIN, address, WhatsApp
   number, email security@hornbilltech.co.ke, business hours, response
   promise, M-Pesa Paybill and account, VAT rate, deposit percent, site
   survey fee, quote validity, warranty period, Facebook URL,
   prices_updated_at. Nothing from that list may be hardcoded anywhere else
   in the codebase.

4. A cached getSiteSettings() server helper. Every component that needs a
   business fact calls it. No exceptions.

5. CANONICAL ORIGIN: read the site origin from NEXT_PUBLIC_SITE_URL and
   nothing else. We launch on the Vercel production URL and attach
   security.hornbilltech.co.ke later, so no hostname may ever appear as a
   literal in sitemaps, canonical tags, JSON-LD, OG tags or the quotation
   PDF. Add a lib/seo/origin.ts helper and use it everywhere.

6. Design tokens from docs/04-design-system.md as CSS custom properties in
   globals.css, wired into the Tailwind v4 theme. Include the light and dark
   token blocks exactly as specified. Load Space Grotesk and Inter via
   next/font.
   CRITICAL: the primary button is --brand-orange background with --ink text.
   White text on --brand-orange measures 3.25:1 and fails AA. Do not use it.

7. Root layout, header with navigation, footer, and the WhatsAppFAB
   component — fixed bottom-right, on every page, reading the number from
   site_settings and opening a real wa.me chat.

8. A placeholder homepage, fully server-rendered, showing the business name,
   the response promise and a trust bar (Hikvision / Dahua / Tiandy
   authorised partner, 5+ years, Mombasa and the coast, reply within 30
   minutes) — every value read from the database, none typed into the JSX.

9. .env.example documenting every variable with a comment explaining what it
   is and where to get it.

10. git init, .gitignore, initial commit, and push to
    github.com/Kelvin-dev001/hornbillsecurity.

CONSTRAINTS
- Everything server-rendered. "use client" only where there is real
  interactivity.
- Do not build any catalogue, solution, quote or admin code in this sprint.
- Do not add dependencies beyond the stack above without telling me why.

WHEN DONE
Tell me exactly what to paste into .env.local, what to click in the Supabase
dashboard to get each value, and the command to run the dev server. Then stop
and let me look at it before Sprint 1.
```

## Sprint 1 — Catalogue foundation

```
Read CLAUDE.md, docs/02-data-model.md and docs/01-business-and-pricing.md §7.

Build the full catalogue layer.

1. Complete Drizzle schema for: categories, brands, items, services,
   pricing_rules, media. Exactly as specified in docs/02-data-model.md,
   including the effective_price generated column.

2. RLS policies, plus the public_items VIEW with an explicit column list that
   omits cost_price and markup_multiplier. Every public query must read the
   view, never the table.

3. WRITE THIS TEST FIRST, before the pages: a test that fetches every public
   route and asserts the string "cost_price" and each seeded cost value do not
   appear in any response body. This is the most important test in the
   repository — a leaked distributor price ends the business.

4. Seed script importing docs/07-catalog-seed.csv (73 SKUs), plus the category
   tree, brands, services and pricing_rules defaults from
   docs/01-business-and-pricing.md §6. Rows with an empty price are seeded
   unpublished with price_basis = 'quote_required'.

5. lib/pricing/effectivePrice.ts implementing the same rule as the generated
   column, with unit tests covering: normal markup, price_override, and the
   market_ceiling case (EZVIZ CS-HB8c/SP must resolve to 16500, not 18200).

6. Pages, all statically generated:
   /catalog, /catalog/[category], /catalog/item/[slug]
   with SpecTable, ItemCard, PlaceholderImage, PriceStamp per
   docs/04-design-system.md. Faceted filtering by category, brand and price
   band. Postgres full-text search that matches on model number.

Every price must be present in the server-rendered HTML. Verify with
view-source, not devtools — devtools shows the hydrated DOM and will mislead
you.
```

---

## Sprint 2 — Solutions, BOMs and the Builder

```
Read CLAUDE.md and docs/01-business-and-pricing.md §3-6 carefully. This is the
sprint that makes the product different from every competitor in Kenya.

1. solutions and solution_lines tables per docs/02-data-model.md.

2. A safe formula evaluator in lib/pricing/formula.ts: parses expressions over
   pricing_rules keys and builder variables with + - * / ( ) and min/max/ceil,
   using an allow-list. NEVER eval or Function(). Unit-test it, including
   rejection of anything not on the allow-list.

3. Seed the 13 CCTV packages from docs/01-business-and-pricing.md §4. Each one
   needs a COMPLETE bill of materials — not just cameras and a recorder.
   Include the things clients forget: cable with the wastage factor, HDD sized
   by the published formula, power supply, adapter/junction boxes, baluns and
   connectors for analog, PoE switch for IP, trunking, clips, and labour at
   labour_per_camera_point. Quantities as formulas over pricing_rules, never
   as literals.

4. BOMTable component: a real HTML <table>, grouped into Primary equipment /
   Secondary components / Consumables / Installation & labour, with columns
   Item (linked to its page) · Spec · Qty · Unit price · Total, and a footer
   carrying subtotal, VAT line and total. tabular-nums. Wrapped in
   overflow-x:auto so the page body never scrolls sideways.

5. /solutions and /solutions/[slug], statically generated, each showing its
   full BOM.

6. /build/cctv — the six-question flow from docs/01-business-and-pricing.md §5.
   After the questions, render the generated BOM with every line swappable
   (resolution, analog vs IP, camera count, cable length, retention days,
   storage) and the total recalculating live. Show the recommended system and
   a budget alternative side by side. Label all output "Indicative estimate —
   confirmed at site survey".

The BOM must be in the server-rendered HTML for the solution pages. The
builder is necessarily interactive, but its default state for each package
must also render server-side so it is crawlable.
```

---

## Sprint 3 — Quote flow

```
Read CLAUDE.md and docs/05-sprint-plan.md Sprint 3.

1. Quote basket: server-backed, cookie-keyed, holding solutions and items.
   "Add to quote" on item pages, solution pages and the builder. Sticky
   QuoteBar showing count and running total once non-empty.

2. /quote review page — editable quantities, remove lines, running total.

3. Submission form: name, phone (validate Kenyan formats: 07xx, 01xx, +254),
   county, area, property type. Creates a quotes row with a FROZEN snapshot of
   every line price and a 6-character code from an unambiguous alphabet
   (no O, 0, I or 1).

4. /q/[code] — public, noindex, showing the frozen quote exactly as submitted.

5. PDF generation with @react-pdf/renderer, server-side: letterhead with the
   logo, quote code, date, validity, full itemised lines, subtotal, 16% VAT,
   total, 50% deposit terms, M-Pesa Paybill 222111 / Account 3033552, the
   KES 1,000 site survey commitment fee note, and company details from
   site_settings.

6. Resend: email the PDF to the customer, notify the owner.

7. WhatsApp handoff: deep link to 254759293030 pre-filled with the quote code,
   total and the /q/[code] URL.

8. Rate limit submissions at the edge. Honeypot field, no CAPTCHA.

Test the whole path end to end as an anonymous visitor before telling me it
works.
```

---

## Sprint 4 — Admin portal and launch

```
Read CLAUDE.md and docs/05-sprint-plan.md Sprint 4.

Build /admin, auth-gated with Supabase Auth (single admin user), noindex.

CRUD for: items, solutions and their BOM lines, services, pricing_rules,
posts, locations, projects, testimonials, FAQs, site_settings.

Specific requirements that matter more than the CRUD:

- The item price panel shows cost_price, markup, computed price,
  market_ceiling_price and effective price together, and warns in-line when
  the computed price would exceed the ceiling.
- CSV import and export for items, round-tripping docs/07-catalog-seed.csv.
- A bulk percentage price adjustment tool, filterable by category or brand,
  with a preview of before/after before it commits. The monthly price review
  must be one screen, not 300 edits.
- Image upload to Supabase Storage. Alt text is a required field — the form
  does not submit without it. Auto-convert to WebP and record dimensions.
- Lead pipeline over quotes and leads: New → Contacted → Survey booked →
  Surveyed → Quoted → Won/Lost, with notes and a follow-up date.
- Editing anything triggers ISR revalidation of the affected public routes.
- Works on a laptop first; usable on a phone.

Then the launch pages: home, about, contact, /services/cctv-installation,
/services/cctv-installation/[location] for the ten coast locations in
docs/03-site-architecture-and-seo.md §2, /price-list, /projects, and the five
Tier 1 articles from §4. No Nairobi location pages — coast only.

Finally the launch checklist in docs/05-sprint-plan.md Sprint 4. Report
Lighthouse scores on throttled mobile and paste me the view-source proof that
prices are in the HTML.
```

---

## Sprints 5–8

Same pattern — read `CLAUDE.md` and the matching section of `docs/05-sprint-plan.md`, then execute. By then the conventions are established and the prompts can be short:

```
Read CLAUDE.md and docs/05-sprint-plan.md Sprint 6, plus
docs/03-site-architecture-and-seo.md §4.

Execute Sprint 6. Ask me for the distributor price lists before seeding any
category — do not publish market-research estimates as our prices, and do not
put any fuel monitoring price live until I give you written supplier quotes.
```

---

## A note on the original request

You asked for a prompt to give Cowork so it would generate these documents. Since you were already in Cowork, they have been written directly instead — `CLAUDE.md` and `docs/01` through `docs/08` are on disk now. If you ever need to regenerate or extend them, this is the prompt shape that produced them:

```
Act as a senior software architect and a Kenyan smart-security industry
specialist. Read C:\Projects\sss\CLAUDE.md and everything in docs/.

I need [the new document]. Ground every claim in the research already in
docs/, or say plainly that you are estimating. Where a number would go on a
public page and you cannot verify it, mark it as needing a supplier quote
rather than inventing a figure.

Write it as a decision-ready document: tables over prose, specific over
general, and flag anything you are uncertain about rather than smoothing it
over.
```

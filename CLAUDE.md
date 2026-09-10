# CLAUDE.md — Hornbill Smart Security Services

Operating contract for Claude Code on this repository. Read this before touching anything.

## 0. Start every session here

Before doing sprint work, open `docs/09-open-items.md` and print any item still marked `OPEN` to the owner, briefly. Do the same at the end of the session. The owner asked to be reminded of these until he confirms each one is done — when he confirms, mark that item `DONE` with the date and stop mentioning it. Do not nag beyond that one line at each end of a session.

## 1. What this is

A lead-generation and quoting website for **Hornbill Smart Security Services**, the smart-security division of **Hornbill Technology Solutions Ltd** (Kenya). Live at **`security.hornbilltech.co.ke`**.

**This is not an e-commerce site.** There is no cart, no checkout, no payment gateway. Clients buy *installed solutions*, not gadgets. Every commercial action ends in a WhatsApp conversation or a phone call.

**The one-line strategy:** be the only company in Kenya that publishes a complete, itemised, priced bill of materials for a security installation — then let the visitor build their own and send it to us as a quote request.

**The geography:** **Mombasa and the coast, exclusively.** This is a deliberate, owner-confirmed decision. Nairobi is contested (AreaSpy holds 28 area pages, Hubtech lists 576 SKUs). The coast is empty — Jiji's whole Mombasa CCTV-installation category returns four listings, and no competitor has a Nyali, Bamburi, Shanzu, Mtwapa, Diani, Ukunda, Likoni, Kilifi, Malindi or Watamu page. Every location page, every case study, every photograph and every piece of local copy is coast. Do not build Nairobi location pages. A single "we also serve Nairobi on request" line on the contact page is the entire Nairobi footprint.

## 2. Non-negotiables

1. **Server-render everything that matters.** ChatGPT does not execute JavaScript. A client-rendered price table is invisible to the audience we depend on. Every price, spec and BOM must be in the initial HTML. Use SSG/ISR. `"use client"` is for interactivity only, never for content.
2. **Real HTML `<table>` elements** for all pricing and BOM data. Not divs, not grids. Tables are what AI answer engines lift.
3. **Never render `cost_price` to the browser.** Not in HTML, not in JSON, not in a props payload, not in an API response reachable without an admin session. Enforce with Postgres RLS *and* an explicit select-list in every public query. A leaked distributor price destroys the business.
4. **Every page under 4MB.** Pages above that are rejected outright by ChatGPT's fetcher, and Kenyan users are on metered mobile data.
5. **Every commercial CTA goes to WhatsApp `+254759293030`** or a tel: link. A floating WhatsApp button is present on every page.
6. **All prices are KES, VAT-exclusive**, labelled as such, with a visible "Prices updated {Month Year}" stamp and a machine-readable `dateModified`.
7. **Every price on the site must be editable from the admin portal.** The owner updates prices himself, monthly. Nothing hardcoded, no exceptions — mock and placeholder prices are seeded as normal editable rows, never as constants in code.
8. **Accessibility AA minimum.** The brand orange fails contrast with white text — see the design system doc. Never put white text on `--brand-orange`.

## 3. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript | SSG/ISR per route; owner already knows it |
| Styling | Tailwind CSS v4 + shadcn/ui | Fast, consistent, no design system to maintain |
| Database | Supabase (Postgres) | Owner already knows it; RLS protects cost prices |
| ORM | Drizzle | Typed queries, real migrations |
| Auth | Supabase Auth, single admin user | Owner is the only admin |
| Images | Supabase Storage + `next/image` | Placeholder-first, owner uploads later |
| Search | Postgres full-text (`tsvector`) | Adequate to a few thousand rows; no extra service |
| Email | Resend | Quote PDFs and lead notifications |
| PDF | `@react-pdf/renderer`, server-side | Branded quotation documents |
| Hosting | Vercel | Owner's choice |
| Repo | `github.com/Kelvin-dev001/hornbillsecurity` | |
| Analytics | GA4 + Search Console + Vercel Analytics | |

Supabase and Vercel accounts are under `kelvinoyugi101@gmail.com`.

**Launch on the Vercel production URL.** The custom domain `security.hornbilltech.co.ke` is attached later — build so that swapping the domain is a config change and nothing else. Read the canonical origin from an env var; never hardcode a hostname in sitemaps, canonicals, JSON-LD or the PDF footer.

Do not add dependencies without a reason recorded in the PR description. No state library — server components plus `useState` and URL params cover this app.

## 4. The domain model in one page

Three layers. Everything else hangs off them.

- **Item** — one SKU. A camera, a DVR, a metre of trunking, a bag of clips. Has `cost_price` (private) and `price` (public, derived). Never sold alone on the site; it is browsable, searchable and quotable.
- **Solution** — a complete installation, expressed as a **bill of materials** over Items plus labour. `4-Camera 1080p Analog CCTV — Residential Starter` is a Solution. Every line is visible with quantity and unit price. This is what the customer actually buys.
- **Service** — the human work: installation, configuration, commissioning, site survey, maintenance, and the recurring contracts.

A **Quote** is a customer-built list of Solutions and Items with a reference code, a public URL, a PDF and a WhatsApp handoff.

Read `docs/02-data-model.md` before writing a migration.

## 5. Pricing rules — read carefully, this is where money is lost

**The markup rule:** public `price = cost_price × 1.40`, rounded to the nearest 100 KES, VAT-exclusive.

**But the base matters more than the multiplier.** `cost_price` must always be a *distributor / trade* price. Applying 40% to a figure that is already retail prices us out of the market. Two categories where this bites:

- **Consumer smart-home and solar** (EZVIZ, Tapo, Imou, smart locks, doorbells). Jumia is the price ceiling every Kenyan buyer checks first, and the dealer-to-Jumia spread on these SKUs is 1–34%. A 40% markup lands *above* Jumia. These rows carry a `market_ceiling_price` and the public price is `min(cost × 1.4, ceiling)`. **Owner-confirmed policy: accept thin hardware margin here and price the installation, configuration and app onboarding as a visible line item instead.**
- **Anything sourced from a Kenyan reseller price list** (Techyshop, Hubtech, CCTV Shop Kenya, Protech Line, Jumia). Those already carry 25–105% over dealer. Treat them as a ceiling to stay under, never a base to mark up.

The admin UI must show cost, computed price, ceiling and effective price side by side, and warn when the computed price exceeds the ceiling.

**Some seeded rows are sell prices, not cost prices.** Where `price_basis = 'owner_sell_price'`, the figure is already the public price — set it as `price_override` and do **not** apply markup. This currently covers **fuel monitoring only** (KES 45,000 installed per vehicle). Surveillance hard disks are distributor cost and take the normal ×1.4.

**Deposit:** 50% before installation begins. M-Pesa Paybill **222111**, Account **3033552**.
**Site survey:** mandatory, **KES 1,000 commitment fee**, deducted from the final invoice. The page must state the deliverable: a written findings report and marked-up camera positions, with the fee credited to the invoice. Never present it as a bare fee — the Kenyan norm is a free survey.

## 6. What good work looks like here

- A change to a price rule ships with a test that proves cost price cannot reach the client.
- A new page ships with its metadata, its JSON-LD, its entry in the sitemap, and a real `dateModified`.
- A BOM change ships with the quantity rule that produced it, editable from admin — never a hardcoded number in a component.
- Copy is written for a Mombasa buyer comparing three quotes on WhatsApp. Plain, specific, priced. No "cutting-edge solutions", no "state-of-the-art".
- Model numbers appear in full (`DS-2CD1043G2-LIUF/SL`), because that exact string is an uncontested search query.
- Every Solution states what it is **not** suitable for. Honesty about limits is the strongest trust signal on the site and the most citable kind of sentence.

## 7. Repository layout

```
app/                    routes (App Router)
  (marketing)/          home, services, locations, about, contact
  solutions/            solution catalogue + detail
  catalog/              item catalogue + detail
  build/                the Solution Builder
  q/[code]/             public saved quote
  blog/                 articles
  projects/             case studies
  admin/                admin portal (auth-gated)
  api/                  quote submission, PDF, revalidation
components/
lib/
  pricing/              markup, BOM expansion, quantity rules
  seo/                  JSON-LD builders, metadata helpers
  supabase/             client + server + admin clients
db/
  schema.ts             Drizzle schema
  migrations/
  seed/                 catalog seed from docs/07-catalog-seed.csv
docs/                   the documents listed below
```

## 8. Documents

| File | What it settles |
|---|---|
| `docs/01-business-and-pricing.md` | Positioning, offerings, packages, pricing rules, quantity rules |
| `docs/02-data-model.md` | Full schema, RLS policies, enums |
| `docs/03-site-architecture-and-seo.md` | Every URL, schema.org plan, keyword map, content plan |
| `docs/04-design-system.md` | Brand palette from the logo, type, components, accessibility |
| `docs/05-sprint-plan.md` | Eight sprints with acceptance criteria |
| `docs/06a`, `docs/06b` | Raw market pricing research; competitor, keyword and AI-visibility research |
| `docs/07-catalog-seed.csv` | Real SKUs with distributor and retail prices |
| `docs/08-claude-code-prompts.md` | The kickoff prompt for each sprint |
| `docs/09-open-items.md` | **Outstanding items from the owner. Check at the start and end of every session.** |
| `docs/10-content-calendar.md` | Every article, its target query, and its publish date |
| `docs/11-launch-checklist.md` | Launch state: what is done in the code, what needs the owner, and the view-source price evidence |

## 9. Facts about the business (use these, do not invent)

- Legal entity: **Hornbill Technology Solutions Ltd**. Trading division: **Hornbill Smart Security Services**.
- Company registration: **PVT-ZE187R28**. KRA PIN: **P052483952K**. VAT registered — 16% applies.
- Address: **Mwembe Tayari, Mombasa**. (Exact street line still to be supplied — see `docs/09-open-items.md`.)
- Email: **security@hornbilltech.co.ke**.
- Operating **5+ years**. **5+ technicians**.
- Service area: **Mombasa, Kilifi and Kwale counties.** Nairobi served on request only, and not marketed.
- Authorised partner: **Hikvision, Dahua, Tiandy**. Also supply EZVIZ and Uniview. Deliberately brand-agnostic on fuel monitoring.
- Named clients (permission held): **Nebsam Digital Solutions**, **Mash East Africa Ltd**.
- WhatsApp / phone: **0759293030**. Facebook: `facebook.com/cctv.people`.
- Response promise: **"We reply within 30 minutes, Mon–Sat 8am–6pm."**
- Quotation validity **30 days**. Workmanship warranty **1 year**. Cancellation: **3 months' notice** (contracts).
- PSRA registration and Communications Authority radio licensing are **both in progress** — do not claim either as held until confirmed.
- Currency KES, prices VAT-exclusive, reviewed monthly by the owner from the admin portal.

## 10. Things that are deliberately out of scope

Customer accounts. Online payment. Multi-currency. Multi-language. Audit logging. Dealer/trade pricing tier. **AI item-drafting assist in the admin portal — the owner declined it, do not build it.** Nairobi location pages. WhatsApp Cloud API automation (phase 2, after launch). A second Google Business Profile (Mombasa only).

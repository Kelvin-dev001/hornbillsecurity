# 05 · Sprint Plan

Target: **live this month.** Sprints 0–4 are the launch. Sprints 5–8 are the expansion that follows, and they matter as much — a launched site with one service line and no blog does not rank.

Each sprint ends with something deployed to a Vercel preview and reviewable in a browser. Nothing is "done" because the code exists; it is done when it renders server-side, passes its acceptance checks, and the owner has looked at it.

---

## Sprint 0 · Foundation — 1 day

Next.js 15 App Router + TypeScript + Tailwind v4 + shadcn/ui. Supabase project (Nairobi region if offered, otherwise Frankfurt). Drizzle wired with migrations. GitHub repo, Vercel project, preview deploys on every branch. Environment variables split public/server. `site_settings` table seeded and read by a `getSiteSettings()` server helper. Design tokens from `docs/04-design-system.md` in `globals.css`. Root layout, header, footer, WhatsApp FAB.

**Done when:** a styled placeholder homepage is live on a Vercel URL, reads the WhatsApp number from the database, and the FAB opens a real chat to 0759293030.

---

## Sprint 1 · Catalogue foundation — 3 days

Full schema from `docs/02-data-model.md`. RLS policies. The `public_items` view without `cost_price`. Seed script importing `docs/07-catalog-seed.csv` — 73 real SKUs. `pricing_rules` seeded with the defaults from `docs/01-business-and-pricing.md` §6. `lib/pricing/effectivePrice.ts` mirroring the generated column. Category tree. Item and category pages, SSG. Faceted catalogue with Postgres full-text search. `SpecTable`, `ItemCard`, `PlaceholderImage`, `PriceStamp`.

**Done when:** every SKU has a server-rendered page at a real URL showing specs and price; `curl` on any public page contains no `cost_price` anywhere; search finds `DS-2CD1043G2-LIUF/SL` by model number; a test asserts cost price never appears in a response body.

**This is the sprint where the business can be destroyed by one careless select.** Write the leak test first.

---

## Sprint 2 · Solutions, BOMs and the Builder — 5 days

The heart of the product.

`solutions` + `solution_lines`. Formula evaluation over `pricing_rules` — a small allow-listed expression parser, never `eval`. The 13 CCTV packages from `docs/01-business-and-pricing.md` §4, each with a complete BOM split into primary / secondary / consumable / labour. `BOMTable` rendering the full itemised table server-side. Solution detail pages.

Then `/build/cctv`: the six-question flow, live BOM generation, line-level swapping (resolution, analog↔IP, camera count, cable, storage), live recalculation, "recommended" vs "budget alternative" side by side.

**Done when:** a visitor answers six questions and sees a complete priced bill of materials — every camera, every metre of cable, every connector, the HDD sized by the published formula, labour, VAT, total — in a real HTML table present in view-source, and can swap any line and watch the total move.

---

## Sprint 3 · Quote flow and lead capture — 3 days

Persistent quote basket (server-backed, cookie-keyed). "Add to quote" on every item and solution. `/quote` review page. Submission: name, phone, county/area, property type. `quotes` row with a frozen line snapshot and a 6-character code. Public `/q/[code]`. Branded PDF via `@react-pdf/renderer` — letterhead, line items, totals, validity, 50% deposit terms, M-Pesa Paybill 222111 / Account 3033552, KES 1,000 survey fee note. Resend emails it to the customer and notifies the owner. WhatsApp deep link pre-filled with the code and total. Rate limiting on submission.

**Done when:** a stranger builds a system, submits it, receives a PDF by email, lands in WhatsApp with the quote code in the message, and the lead appears in the database — and reopening `/q/[code]` a week later shows the prices they were originally shown.

---

## Sprint 4 · Admin portal + launch content → **GO LIVE** — 5 days

Supabase Auth, single admin. CRUD for items, solutions and BOM lines, services, pricing rules, posts, locations, projects, testimonials, FAQs, site settings. **Cost/price panel** showing cost, markup, computed price, market ceiling and effective price together, with a warning when the computed price exceeds the ceiling. CSV import/export. **Bulk % price adjustment** — the monthly price review is one screen, not 300 edits. Image upload to Supabase Storage with **required alt text**. Lead pipeline: New → Contacted → Survey booked → Surveyed → Quoted → Won/Lost, with notes.

Alongside: home, about, contact, the CCTV service page, `/services/cctv-installation/[location]` for the eight coast locations, `/price-list`, and Tier 1 content items 1–5 from `docs/03-site-architecture-and-seo.md` §4.

Launch checklist: DNS, SSL, sitemap, robots, `llms.txt`, canonical tags, `noindex` on admin, Search Console, Bing Webmaster, GA4, both Google Business Profiles created, OG images, Lighthouse ≥95 on throttled mobile, and a manual view-source check that prices are in the HTML.

**Done when:** the owner adds a product and publishes an article without touching code, and the site is live on the domain.

---

## Sprint 5 · Coast SEO land-grab and projects — 4 days

Remaining coast location pages with genuinely local content — no Nairobi pages. A proper **projects section**: each completed job documented as a real case study with the brief, the site conditions, the equipment specified and why, photos, and the outcome. The owner specifically wants projects documented vividly enough that a potential client believes them — treat this as a primary trust asset, not a gallery. Tier 2 content 6–14 — the six neighbourhood pages, the salt-air article, the holiday-home article. Projects and case studies seeded with Nebsam Digital Solutions and Mash East Africa Ltd. Testimonials. Full JSON-LD across every page type. Directory submissions: Jiji (treat as a lead channel — the Mombasa CCTV category has four listings), PigiaMe, BusinessList, Yellow Pages Kenya, LinkedIn, Bing Places, Apple Business Connect. Outreach to get listed on the ranking installer listicles. NAP written into `site_settings` and used everywhere. Review-request flow after job completion.

**Done when:** ten coast location pages are indexed, the projects section carries at least four documented case studies, and the Mombasa Google Business Profile is verified with the correct primary category and service areas.

---

## Sprint 6 · The remaining service lines — 5 days

Electric fencing, razor wire and perimeter, gate automation, video intercom, access control and time attendance, fire and smoke detection, networking and structured cabling, radio communications, fuel monitoring, smart home and nanny cameras, power backup, server and control room, and the entrance-control and screening category (boom barriers, parking ticket dispensers, baggage X-ray scanners, walk-through metal detectors, turnstiles, road blockers). Each gets: a service page, a category in the catalogue, seeded items, at least two packaged Solutions with full BOMs, and a cost article.

Electric fencing gets its own builder (perimeter metres × line count → energizer sizing, wire rolls, insulator counts, posts, earth, signage, labour) because `electric fence quotation pdf in kenya` and `electric fence materials price list` are verified unserved queries.

**Blocked on the owner:** distributor price lists for these categories — `docs/09-open-items.md` item 2. Seed with placeholder rows so the owner can correct them from admin rather than waiting. Fuel monitoring is resolved at KES 45,000 installed per vehicle.

---

## Sprint 7 · Content engine and tools — 4 days

Tier 3–5 content, items 15–30. The three standalone tools: `/tools/cctv-cost-calculator`, `/tools/storage-calculator`, `/tools/electric-fence-calculator`. Downloadable lead magnets (CCTV Buyer's Guide, Electric Fence Sample BOM PDF) gated on a phone number. Glossary. `/cctv-and-the-law-in-kenya` — the ODPC compliance page, which is the strongest link-earning and AI-citation asset on the whole site. Blog categories, RSS, related-content linking.

---

## Sprint 8 · Recurring revenue and hardening — 4 days

AMC and maintenance-contract products, tiered by camera count. Cloud recording and remote monitoring as subscription line items. Fire-compliance and CCTV data-protection compliance service pages. GPS tracking and fleet telematics. The CCTV installer training course as a product page with dates and pricing. Full accessibility audit against AA. Performance pass on throttled mobile. Error monitoring. Automated database backups. A documented monthly price-review runbook.

---

## Sequencing risk

The two things most likely to slip: **Sprint 2**, because the formula engine and the builder are the only genuinely novel engineering here, and **Sprint 6**, because it is blocked on price lists the owner has to gather from suppliers. Start collecting those price lists during Sprint 1 — not when Sprint 6 begins.

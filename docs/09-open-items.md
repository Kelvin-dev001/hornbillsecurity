# 09 · Open Items

**How this file works.** Claude Code checks it at the start and end of every session and reminds the owner, in one line, of anything still `OPEN`. When the owner confirms an item is done, change the status to `DONE`, add the date, and stop mentioning it. Nothing here is nagged more than once per session.

Last reviewed: **2026-09-05**

---

## Blocking — work stops or ships wrong without these

None. All three cleared on 2026-09-04.

## Needed before launch

| # | Item | Status | Blocks | Notes |
|---|---|---|---|---|
| 6 | **Installation photos** — as many as possible, labelled by area and job type | `OPEN` | Location pages, projects section, homepage | Owner has these. They carry the coast location pages, which are the entire launch strategy — thin pages with no local photos will not do the job |
| 7 | **Google Business Profile** — create and verify the Mombasa listing | `OPEN` | Local pack, AI local citations | Primary category **Security System Installer**. Most-cited source in AI local answers (~67% of Google AI Overview local citations). Single profile, Mombasa only, by owner's decision |
| 8 | **Testimonials** — even three, in writing | `OPEN` | Homepage, service pages, trust | Proceeding without for now. `AggregateRating` schema stays off until real reviews exist |
| 9 | **DNS records** — attach `security.hornbilltech.co.ke` to Vercel | `OPEN` | Custom domain | Launching on the Vercel production URL by design. Canonical origin reads from an env var, so this is a one-line switch |

## Nice to have, not blocking

| # | Item | Status | Notes |
|---|---|---|---|
| 10 | Second phone number | `OPEN` | Useful if a Nairobi profile is ever added. Not needed for a coast-only launch |
| 11 | Model numbers for the motorized varifocal 4MP / 6MP cameras | `OPEN` | Box codes were illegible in the screenshots. Seeded as `VARIFOCAL-4MP` / `VARIFOCAL-6MP` and **held back from the site** — the whole pitch is exact model numbers, so a guessed one costs more than a missing page. Prices are already in; publishing is one click in admin once the supplier confirms |
| 12 | Real distributor prices for DS-KIS603-P, DS-KIS608-P, DS-KIS212, DS-KIS213, DS-7732NXI-K4/16P | `OPEN` | All five **held back from the site**. The two with figures carry `price_basis = 'market_research'`, and CLAUDE.md §5 forbids marking up a researched retail figure — 26,500 × 1.4 would price us above the market, not below it. Supply a trade cost and they publish |
| 12b | Reel length on DS-1LN6AUSPE (Cat6A outdoor) | `OPEN` | Priced at 23,000 cost, but the CSV says to confirm the reel length, so we cannot state what the price buys. Held back until you confirm — then set the unit and publish |
| 13 | Compare the 4TB and 8TB disk retail prices against the Kenyan market and set a ceiling if needed | `OPEN` | **Both are live on the site now** at 33,600 and 63,000. Published Kenyan surveillance-drive listings run lower, so these are the two prices most likely to be undercut on a comparison. `market_ceiling_price` is in the schema and takes effect the moment you set it |
| 13b | Validate the seeded labour rates against three real past quotes | `OPEN` | Defaults are industry-typical. Ten minutes with old quotes makes the builder genuinely accurate |
| 14 | Product photography once stock is held | `OPEN` | Owner does not hold stock currently. Placeholders render deliberately until then — never use supplier packshots with someone else's branding |
| 15 | PSRA registration | `IN PROGRESS` | Do not claim it on the site until confirmed. Add to the trust bar when it lands |
| 16 | Communications Authority radio frequency licence | `IN PROGRESS` | KES 19,700, 74–106 days. Do not claim until held. Worth stating the cost and lead time on the radio page regardless — it is exactly the kind of specific fact that wins a job |

## Settled

| # | Item | Status | Date |
|---|---|---|---|
| 17 | Domain: `security.hornbilltech.co.ke` | `DONE` | 2026-09-02 |
| 18 | GitHub repo: `github.com/Kelvin-dev001/hornbillsecurity` | `DONE` | 2026-09-02 |
| 19 | Supabase and Vercel under `kelvinoyugi101@gmail.com` | `DONE` | 2026-09-02 |
| 20 | Company reg PVT-ZE187R28, KRA PIN P052483952K, VAT registered | `DONE` | 2026-09-02 |
| 21 | Quotation terms: 30-day validity, 1-year workmanship warranty, 3 months' notice on cancellation | `DONE` | 2026-09-02 |
| 22 | Written permission to name Nebsam Digital Solutions and Mash East Africa Ltd | `DONE` | 2026-09-02 |
| 23 | Fuel monitoring priced at KES 45,000 installed | `DONE` | 2026-09-02 |
| 24 | Hard disk prices supplied (pending the cost-vs-sell confirmation at item 3) | `DONE` | 2026-09-02 |
| 25 | Coast-only launch confirmed — no Nairobi location pages | `DONE` | 2026-09-02 |
| 26 | AI item-drafting assist declined — not being built | `DONE` | 2026-09-02 |
| 27 | Business email: security@hornbilltech.co.ke | `DONE` | 2026-09-04 |
| 28 | Hard disks confirmed as distributor cost — ×1.4 applied | `DONE` | 2026-09-04 |
| 1 | Logo files — `Hornbill_Logo_Transparent_HighRes.png` and a white/mono version for dark backgrounds supplied in `logo/` | `DONE` | 2026-09-04 |
| 2 | Distributor price lists — owner's decision: seed **mock rows** for the non-CCTV categories and price them from the admin portal. Implemented in Sprint 1 as ordinary editable rows carrying `price_basis = 'placeholder'`, never constants (CLAUDE.md §2.7). They are unpublished until priced, so the catalogue never shows a figure you did not set. Sprint 6 is no longer blocked | `DONE` | 2026-09-04 |
| 3 | Mombasa street line: **Hilltop**. Canonical NAP is `Hilltop, Mwembe Tayari, Mombasa` — stored as components in `site_settings` and used by the footer, JSON-LD and quotation PDF. Must match the Google Business Profile exactly and never vary | `DONE` | 2026-09-04 |

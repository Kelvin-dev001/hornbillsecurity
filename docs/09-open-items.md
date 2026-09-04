# 09 · Open Items

**How this file works.** Claude Code checks it at the start and end of every session and reminds the owner, in one line, of anything still `OPEN`. When the owner confirms an item is done, change the status to `DONE`, add the date, and stop mentioning it. Nothing here is nagged more than once per session.

Last reviewed: **2026-09-04**

---

## Blocking — work stops or ships wrong without these

| # | Item | Status | Blocks | Notes |
|---|---|---|---|---|
| 1 | **Logo files** — SVG or high-res transparent PNG, a white/mono version for dark backgrounds, and a square crop for favicon and social profiles | `OPEN` | Sprint 0 finish, quotation PDF, OG images | Only `logo/Logo.png` exists (1274×1234, raster). Brand colours already sampled from it, so this does not block starting |
| 2 | **Distributor price lists** for electric fencing, razor wire, gate automation, video intercom, access control & time attendance, fire & smoke detection, networking & cabling, cable management, two-way radios, smart home | `OPEN` | Sprint 6 entirely | Screenshots are fine — the CCTV ones worked perfectly. Start gathering during Sprint 1, not when Sprint 6 begins |
| 3 | **Exact street address line** for the Mombasa office | `OPEN` | Schema.org, Google Business Profile, quotation letterhead | "Mwembe Tayari, Mombasa" is enough for copy but not for a verified listing. This becomes the canonical NAP and must never vary afterwards |

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
| 11 | Model numbers for the motorized varifocal 4MP / 6MP cameras | `OPEN` | Box codes were illegible in the screenshots. Seeded as `VARIFOCAL-4MP` / `VARIFOCAL-6MP` placeholders, editable from admin |
| 12 | Real prices for DS-KIS603-P, DS-KIS608-P, DS-KIS212, DS-KIS213, DS-7732NXI-K4/16P | `OPEN` | Seeded with market-research figures, flagged in the CSV, editable from admin |
| 13 | Compare the 4TB and 8TB disk retail prices against the Kenyan market and set a ceiling if needed | `OPEN` | ×1.4 puts them at 33,600 and 63,000. Published Kenyan surveillance-drive listings run lower. Price transparency is the brand, so these two are worth a sanity check |
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

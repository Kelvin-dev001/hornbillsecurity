# 09 · Open Items

**How this file works.** Claude Code checks it at the start and end of every session and reminds the owner, in one line, of anything still `OPEN`. When the owner confirms an item is done, change the status to `DONE`, add the date, and stop mentioning it. Nothing here is nagged more than once per session.

Last reviewed: **2026-09-07**

---

## Blocking — work stops or ships wrong without these

None. All three cleared on 2026-09-04.

## Needed before launch

| # | Item | Status | Blocks | Notes |
|---|---|---|---|---|
| 6 | **Installation photos** — as many as possible, labelled by area and job type | `OPEN` | Location pages, projects section, homepage | Owner has these. They carry the coast location pages, which are the entire launch strategy — thin pages with no local photos will not do the job. `/projects` is live and currently shows an honest empty state saying case studies are being written up; it names only the two clients whose permission is on record (item 22) and invents nothing |
| 7 | **Google Business Profile** — create and verify the Mombasa listing, then paste its review link into **/admin/settings** | `OPEN` | Local pack, AI local citations, the review-request flow | Primary category **Security System Installer**. Most-cited source in AI local answers (~67% of Google AI Overview local citations). Single profile, Mombasa only, by owner's decision. The review request that fires on every won job needs that link — without it the message still sends but asks for a review with nowhere to leave one |
| 8 | **Testimonials** — even three, in writing | `OPEN` | Homepage, service pages, trust | Proceeding without for now. `AggregateRating` stays off until real reviews exist. There is now an editor at **/admin/testimonials** with a required "where it came from" field, so every quote on the site can always be traced to a WhatsApp message, a Google review or an email |
| 9 | **DNS records** — attach `security.hornbilltech.co.ke` to Vercel | `OPEN` | Custom domain | Launching on the Vercel production URL by design. Canonical origin reads from an env var, so this is a one-line switch |
| 29 | **Trade prices for the BOM consumables** — 15 SKUs, listed in `db/seed/consumables.ts` | `OPEN` | The credibility of every package total | Your price list has the cameras, recorders, drives and Cat6. It has no RG59 siamese cable, baluns, BNC or DC connectors, RJ45, 12V power supplies, junction boxes, trunking, clips, memory cards, pole mounts or small PoE switches — and a bill of materials without them is not the product. They are seeded at estimated Mombasa trade rates, marked with a ° on every line, and each BOM states what share of its total is estimated. **On the Home Colour 4 that share is 36%.** Two SKUs carry most of it: the RG59 siamese box and the 2 m trunking length. Real prices for just those two drop it to about 11% |
| 31 | **Resend account and API key** — `RESEND_API_KEY` in `.env.local` and on Vercel | `OPEN` | The quotation email | Free tier is 3,000 emails a month, which is far more than this needs. Without it the quote still saves, `/q/[code]` still works and the PDF still downloads — only the two emails are skipped. Until `security.hornbilltech.co.ke` is verified with Resend, mail goes out from their `onboarding@resend.dev`; verify the domain and set `RESEND_FROM_EMAIL` when DNS lands (item 9) |
| 32 | **Set `QUOTE_HASH_SALT`** to any long random string | `OPEN` | Nothing, but do it before launch | Salts the hashed submitter address behind quote rate limiting. It falls back to `DATABASE_URL`, which works — but then rotating the database password also resets everyone's rate limit. `openssl rand -hex 32` |
| 36 | **Write the first four case studies** at **/admin/projects** | `OPEN` | The strongest trust asset on the site | docs/05 Sprint 5's "done when" asks for at least four, and they are not mine to write — a case study invented by me is a fabricated reference. The form walks through five questions and the one that does the work is **site conditions**: anybody can claim an installation, and only somebody who was there can say what the building made them do differently. Linking a case study to a package puts its full priced bill of materials on the page, which nothing else in this market can do. Nebsam Digital Solutions and Mash East Africa Ltd can be named (item 22); everything else uses the sector instead |
| 33 | **Create the single admin user** in Supabase → Authentication → Users, then sign in at `/admin/login` | `OPEN` | The whole admin portal | Deliberately not created in code — nothing in this repository may handle a password. Add the user in the Supabase dashboard with `kelvinoyugi101@gmail.com`, set a password there, and that account is the only one that can reach `/admin`. There is no sign-up route and there never will be |
| 34 | **Distributor prices for electric fencing** — energizers beyond the DS-PF201-1WE, posts, insulators, wire, gate handles, earth rods, warning signage | `OPEN` | Two Tier 1 articles and the fencing builder | docs/03 §4 asks for *Electric Fence Quotation Kenya: Sample BOM* and *Electric Fence Cost Per Metre* as launch articles — three separately verified autocomplete queries ask for exactly that file and it does not exist anywhere. They are **not written**, because the fencing catalogue holds one published item and writing them would mean inventing prices for everything else. Their launch slots were filled with three other §4 articles that the data does support. Supply the prices and both articles plus the fencing builder become straightforward |
| 35 | **Photographs for the five launch articles** | `OPEN` | Article cover images, social previews | All five publish and read fine without one. A cover image on the flagship cost guide is what makes it survive being shared into a WhatsApp group, which is that article's whole distribution model |
| 30 | **Sanity-check `trunking_m_per_camera` (currently 12 m)** against a real job | `OPEN` | Every package total | At 12 m per camera a 4-camera house takes 24 lengths of trunking — KES 9,600, the single largest consumable line and 13% of the Home Colour 4 total. It is the docs/01 §6 default and may well be right for a surface-run bungalow, but if most of your runs go through the roof it is roughly double what it should be. One number in admin, and all seventeen packages re-price |

## Nice to have, not blocking

| # | Item | Status | Notes |
|---|---|---|---|
| 10 | Second phone number | `OPEN` | Useful if a Nairobi profile is ever added. Not needed for a coast-only launch |
| 11 | Model numbers for the motorized varifocal 4MP / 6MP cameras | `OPEN` | Box codes were illegible in the screenshots. Seeded as `VARIFOCAL-4MP` / `VARIFOCAL-6MP` and **held back from the site** — the whole pitch is exact model numbers, so a guessed one costs more than a missing page. Prices are already in; publishing is one click in admin once the supplier confirms |
| 12 | Real distributor prices for DS-KIS603-P, DS-KIS608-P, DS-KIS212, DS-KIS213, DS-7732NXI-K4/16P | `OPEN` | All five **held back from the site**. The two with figures carry `price_basis = 'market_research'`, and CLAUDE.md §5 forbids marking up a researched retail figure — 26,500 × 1.4 would price us above the market, not below it. Supply a trade cost and they publish |
| 12b | Reel length on DS-1LN6AUSPE (Cat6A outdoor) | `OPEN` | Priced at 23,000 cost, but the CSV says to confirm the reel length, so we cannot state what the price buys. Held back until you confirm — then set the unit and publish |
| 13 | Compare the 4TB and 8TB disk retail prices against the Kenyan market and set a ceiling if needed | `OPEN` | **Both are live on the site now** at 33,600 and 63,000. Published Kenyan surveillance-drive listings run lower, so these are the two prices most likely to be undercut on a comparison. `market_ceiling_price` is in the schema and takes effect the moment you set it |
| 13b | Validate the seeded labour rates against three real past quotes | `OPEN` | Defaults are industry-typical. Ten minutes with old quotes makes the builder genuinely accurate. Worth doing alongside item 30 — labour is 17% of a 4-camera job at the seeded KES 3,000 a point |
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

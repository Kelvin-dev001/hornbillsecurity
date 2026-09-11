# 09 · Open Items

**How this file works.** Claude Code checks it at the start and end of every session and reminds the owner, in one line, of anything still `OPEN`. When the owner confirms an item is done, change the status to `DONE`, add the date, and stop mentioning it. Nothing here is nagged more than once per session.

Last reviewed: **2026-09-07**

---

## Blocking — work stops or ships wrong without these

None of the original three; all cleared on 2026-09-04.

**The largest single blocker now is distributor pricing** — item 29 below, with
every affected row listed by SKU in
[`docs/12-distributor-pricing-worksheet.md`](./12-distributor-pricing-worksheet.md).
It is not "blocking" in the sense that the site cannot launch: it launches, and
every page is honest about what is estimated and what is not published. But 15
published rows are live on estimated costs and are 36% of a four-camera package
total, and 17 more have no price at all, which is what stops the remaining
Sprint 6 work.

## Needed before launch

| # | Item | Status | Blocks | Notes |
|---|---|---|---|---|
| 6 | **Installation photos** — as many as possible, labelled by area and job type | `OPEN` | Location pages, projects section, homepage | Owner has these. They carry the coast location pages, which are the entire launch strategy — thin pages with no local photos will not do the job. `/projects` is live and currently shows an honest empty state saying case studies are being written up; it names only the two clients whose permission is on record (item 22) and invents nothing |
| 7 | **Google Business Profile** — create and verify the Mombasa listing, then paste its review link into **/admin/settings** | `OPEN` | Local pack, AI local citations, the review-request flow | Primary category **Security System Installer**. Most-cited source in AI local answers (~67% of Google AI Overview local citations). Single profile, Mombasa only, by owner's decision. The review request that fires on every won job needs that link — without it the message still sends but asks for a review with nowhere to leave one |
| 8 | **Testimonials** — even three, in writing | `OPEN` | Homepage, service pages, trust | Proceeding without for now. `AggregateRating` stays off until real reviews exist. There is now an editor at **/admin/testimonials** with a required "where it came from" field, so every quote on the site can always be traced to a WhatsApp message, a Google review or an email |
| 9 | **DNS records** — attach `security.hornbilltech.co.ke` to Vercel | `OPEN` | Custom domain | Launching on the Vercel production URL by design. Canonical origin reads from an env var, so this is a one-line switch |
| 29 | **Distributor prices — the whole ask, itemised** | `OPEN` | Package totals, nine service pages, the electric-fence builder, two Tier 1 articles | Every row waiting on a price is now listed by SKU in **[`docs/12-distributor-pricing-worksheet.md`](./12-distributor-pricing-worksheet.md)**, generated from the database by `npm run docs:pricing` so a row vanishes the moment you enter its price. **45 rows in five groups.** The one that matters: **15 are published and live on estimated costs** — the cable, connectors, trunking, clips, power and boxes your own price list does not carry — and they are **36% of a four-camera package total**, so every published package price is that much of an estimate until they are real. Two SKUs carry most of it: the RG59 siamese box and the 2 m trunking length. Enter one at a time in Admin → Items, or in bulk via Export CSV → fill `supplier_price_kes` → Import |
| 31 | **Resend account and API key** — `RESEND_API_KEY` in `.env.local` and on Vercel | `OPEN` | The quotation email | Free tier is 3,000 emails a month, which is far more than this needs. Without it the quote still saves, `/q/[code]` still works and the PDF still downloads — only the two emails are skipped. Until `security.hornbilltech.co.ke` is verified with Resend, mail goes out from their `onboarding@resend.dev`; verify the domain and set `RESEND_FROM_EMAIL` when DNS lands (item 9) |
| 32 | **Set `QUOTE_HASH_SALT`** to any long random string | `OPEN` | Nothing, but do it before launch | Salts the hashed submitter address behind quote rate limiting. It falls back to `DATABASE_URL`, which works — but then rotating the database password also resets everyone's rate limit. `openssl rand -hex 32` |
| 36 | **Write the first four case studies** at **/admin/projects** | `OPEN` | The strongest trust asset on the site | docs/05 Sprint 5's "done when" asks for at least four, and they are not mine to write — a case study invented by me is a fabricated reference. The form walks through five questions and the one that does the work is **site conditions**: anybody can claim an installation, and only somebody who was there can say what the building made them do differently. Linking a case study to a package puts its full priced bill of materials on the page, which nothing else in this market can do. Nebsam Digital Solutions and Mash East Africa Ltd can be named (item 22); everything else uses the sector instead |
| 37 | **The nine remaining service lines** — razor wire, gate automation, video intercom, access control, fire detection, radio, power backup, control room, entrance control, screening | `OPEN` | Packaged solutions and cost articles on nine service pages | Listed by SKU in the worksheet at item 29. All nine already have a **live service page** with real copy, honest limits and an FAQ, each saying plainly that equipment prices are not published yet rather than showing an estimate. What is blocked is the rest of Sprint 6: at least two packaged Solutions per line with full BOMs, and a cost article each. A BOM assembled from guesses would put an invented total on a page whose whole claim is that its totals are real |
| 38 | **Have an advocate read `/cctv-and-the-law-in-kenya`** before it is linked from anywhere prominent | `OPEN` | Nothing technical; it is a liability question | It is the highest-authority page on the site (docs/03 §4 item 29) and the strongest link-earning asset, which is exactly why it should not go out on my reading of the statute alone. It is written carefully: it separates the Data Protection Act 2019 (law) from the ODPC's December 2025 Draft Guidance Note (draft, explicitly labelled), it carries a "this is not legal advice" notice at the top rather than buried at the bottom, and the two figures that move — the KES 5 million / 1% penalty ceiling and the registration threshold — both say to verify with the ODPC. An hour of an advocate's time turns it from careful into authoritative |
| 39 | **Are we registered with the ODPC as a data controller or processor?** | `OPEN` | What the law page and the compliance service may claim | Handling footage on a client's behalf may make us a data processor, and registration depends on thresholds set by regulation. The law page deliberately claims nothing about our own status. If we are registered, saying so is a genuine differentiator that no competitor on this coast can match; if we are not, we should know before we sell a compliance service |
| 40 | **Decide the Supabase backup plan** — and where an off-account copy lives | `OPEN` | Recovery from a bad UPDATE or a lost account | Supabase takes daily backups, but on the free tier the retention window is short and there is no point-in-time recovery. `npm run db:backup` writes a full dump to a gitignored `backups/` directory using `pg_dump`, which is the half a script can do. The half it cannot: deciding where that copy lives. A backup inside the account you lost access to is not a backup, and the dump contains every cost price so it cannot go anywhere casual. Note `pg_dump` is not installed on the dev machine, so the script's error path is verified and the dump itself has not been run end to end |
| 41 | **Your own rates for the recurring services** — AMC tiers by camera count, cloud recording, remote monitoring, GPS tracking, the training course and its dates | `OPEN` | The whole of Sprint 8's revenue model | Eight unpriced services, listed in [`docs/12`](./12-distributor-pricing-worksheet.md) group 5. Unlike the equipment these are not a supplier's numbers — they are yours, and nobody else can produce them. Until they exist the maintenance, monitoring, fleet and training service pages are live with real copy and no prices, which is honest but does not sell a contract. Cancellation is already recorded as three months' notice |
| 42 | **Run Lighthouse on throttled mobile** against the deployed URL | `OPEN` | Nothing, but `docs/05` asks for ≥95 | It cannot be run from this environment, so no number has been invented. `docs/11` records what the build output does support: 103 kB shared JavaScript, no third-party scripts, self-hosted fonts, everything priced prerendered, median page 90 KB and the largest 282 KB. That is the shape a good score comes from and it is not a score |
| 33 | **Create the single admin user** in Supabase → Authentication → Users, then sign in at `/admin/login` | `OPEN` | The whole admin portal | Deliberately not created in code — nothing in this repository may handle a password. Add the user in the Supabase dashboard with `kelvinoyugi101@gmail.com`, set a password there, and that account is the only one that can reach `/admin`. There is no sign-up route and there never will be |
| 34 | **Electric fencing components** — energizers beyond the DS-PF201-1WE, posts, insulators, wire, gate handles, earth rods, warning signage | `OPEN` | The fence builder, and two Tier 1 articles | Folded into the worksheet at item 29, but called out separately because of what it unlocks. docs/03 §4 asks for *Electric Fence Quotation Kenya: Sample BOM* and *Electric Fence Cost Per Metre* — three separately verified autocomplete queries ask for exactly that file and it does not exist anywhere in Kenya. docs/05 also singles out a dedicated fence builder. None of it is written: the fencing catalogue holds one published item, and a builder that cannot total anything is worse than one that does not exist yet |
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

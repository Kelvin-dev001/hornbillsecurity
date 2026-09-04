# 03 · Site Architecture, SEO and AI-Search Visibility

## 0. The finding that outranks every other tactic here

**ChatGPT does not execute JavaScript.** A client-rendered price table does not exist as far as it is concerned. It also rejects any page over 4MB outright with HTTP 400 and reads nothing.

The owner has said the business depends on Google *and* LLMs. So: **server-render or statically generate every price, spec, BOM and article body.** Get this right and the rest of the work compounds. Get it wrong and none of it matters. This is why the stack is Next.js with SSG/ISR and not a client-side SPA.

Second finding, equally load-bearing: **ranking still gates citation.** Roughly 38% of Google AI Overview citations come from the top 10 organic results, and pages outside the top 10 see sharply reduced odds. GEO is a layer on top of SEO, never a substitute. Anyone selling "AI optimisation" that skips ranking is selling nothing.

Third: **AI Overviews now appear on ~68% of local searches** (vs 39% for the traditional local pack), and **cost/pricing guides trigger them ~80% of the time**. The itemised-BOM strategy is not only the commercial differentiator — it is the single best-aligned content format for AI visibility in this vertical.

## 1. The domain question — answer it before launch

`sss.hornbilltech.co.ke` is workable but it is the weak version of the subdomain argument. Google treats subdomains and subfolders comparably for crawling and indexing, and has said so consistently. But three things cut against it here:

1. Signals *can* cross a subdomain boundary but do so less reliably than within one host. Nobody at Google has ever promised full transfer.
2. This is the textbook subfolder case — same company, same country, same buyers. Subdomains earn their keep when function and audience genuinely differ (`shop.`, `docs.`, `en.`).
3. **"sss" communicates nothing.** It appears in search results, AI citations, WhatsApp link previews and on business cards, and it reads like a staging URL.

**In preference order:** a dedicated root domain (best — its own entity, its own GBP, its own Wikidata item, cleanest AI-answer signal) → `hornbilltech.co.ke/security/` → keep the subdomain but rename it `security.hornbilltech.co.ke`, which costs nothing and reads infinitely better.

If the subdomain stays, engineer around it: `Organization` schema with `parentOrganization` → Hornbill Tech and the reverse link back; prominent header *and* footer interlinking, not footer-only; register it as its own property in Search Console **and** Bing Webmaster Tools; its own sitemap in both; its own Google Business Profile pointing at the subdomain; and chase external links to the subdomain directly, not the parent.

**This is a second-order effect. It will not stop the site ranking.** Do not spend two months on it — but do not launch on `sss.` and then wonder why nobody remembers the URL.

## 2. URL architecture

```
/                                     Home
/solutions                            All packages
/solutions/[slug]                     e.g. /solutions/4-camera-colorvu-home-cctv
/build                                Solution Builder
/build/cctv                           CCTV builder (Sprint 2)
/catalog                              All items, faceted
/catalog/[category]                   /catalog/ip-cameras
/catalog/item/[slug]                  /catalog/item/hikvision-ds-2cd1043g2-liuf-sl
/services                             All services
/services/[slug]                      /services/cctv-installation
/services/[slug]/[location]           /services/cctv-installation/nyali   ← the money pages
/locations                            Coverage
/locations/[slug]                     /locations/nyali
/price-list                           Master price list, dated, sortable
/price-list/hikvision                 Brand price list
/tools/cctv-cost-calculator           Standalone calculator (huge query)
/tools/storage-calculator             HDD sizing
/tools/electric-fence-calculator      Per-metre builder
/quote                                Quote basket
/q/[code]                             Saved quote, public, shareable
/blog  /blog/[slug]  /blog/category/[slug]
/projects  /projects/[slug]
/about  /contact  /faq  /glossary
/privacy  /terms  /cctv-and-the-law-in-kenya
/admin/*                              noindex, auth-gated
/sitemap.xml  /robots.txt  /llms.txt  /rss.xml
```

**Service × location is the engine.** `services/cctv-installation/nyali` is where transactional intent lands. Build them only for areas actually served, each with genuine local content (see `docs/02-data-model.md` → `locations`).

### Location set — coast only

**Owner decision: the coast is the whole market.** No Nairobi location pages are built. A single "we also serve Nairobi on request" line on the contact page is the entire Nairobi footprint.

Mombasa Island · Nyali · Bamburi & Shanzu · Mtwapa · Tudor & Kizingo · Likoni & South Coast · **Diani & Ukunda** · Kilifi · Malindi & Watamu · Mariakani & Mazeras.

Diani deserves particular attention — holiday homes and hospitality, high ticket value, and literally nobody targeting it. Mombasa Island and Nyali carry the commercial volume.

Because the geography is narrow, each page can afford to be genuinely deep: real install photos from that area, a named landmark, a local condition (salt air, power stability, estate access rules, port-corridor traffic), and a coast-specific package price. Ten excellent pages beat thirty templated ones, and depth is what separates this from AreaSpy's Nairobi approach.

## 3. Structured data

| Page | JSON-LD |
|---|---|
| Home | `Organization` (+`parentOrganization` → Hornbill Technology Solutions Ltd), `WebSite` with `SearchAction` |
| Location + service×location | `LocalBusiness` / `HomeAndConstructionBusiness` with `areaServed`, `geo`, `openingHoursSpecification`, `telephone`, `priceRange`, and a full `sameAs` array |
| Service pages | `Service` + nested `Offer` with real `price`, `priceCurrency: "KES"`, `priceValidUntil` |
| Item pages | `Product` + `Offer`, with `mpn`/`sku` carrying the true model number |
| Solution pages | `Product` + `Offer` + `ItemList` for the BOM rows |
| Price list | `ItemList` of `Product`/`Offer` |
| Articles | `Article` with honest `datePublished` / `dateModified` |
| Cost pages | `FAQPage` |
| Everywhere | `BreadcrumbList` |
| Reviews | `AggregateRating` / `Review` — **only for genuine reviews.** Fabricating these is a policy violation and is easily caught |

Almost nobody in Kenya emits a valid `Offer` with a real price for an *installation service*, because almost nobody publishes one. That is free distinctiveness.

The `sameAs` array is the practical mechanism for entity consolidation — point it at the GBPs, Facebook, LinkedIn and every directory listing, and keep it identical everywhere.

## 4. Content plan — 30 launch pages

**Tier 1 · the differentiator cluster (build first)**
1. **CCTV Installation Cost in Kenya 2026: The Full Itemised Bill of Materials** — the flagship. Every line: model, qty, unit price, extended, cable metres, accessories, labour, VAT, total. Three worked systems (4/8/16 camera). Real tables, `Product`+`Offer` per row, visible update stamp.
2. **Interactive CCTV Cost Calculator** — `cctv installation cost calculator` is a verified Kenyan query with no Kenyan answer.
3. **Electric Fence Quotation Kenya: Free Downloadable Sample BOM (PDF)** — three separate verified autocomplete strings ask for exactly this file and it does not exist.
4. **Electric Fence Cost Per Metre 2026: Component by Component** — incumbents publish ranges only; one ranking page contains a per-metre/per-system error on solar we can correct.
5. **Hikvision Price List Kenya 2026 — Every Model, Updated Monthly** — `cctv camera price in kenya today` is verified; freshness is the moat.

**Tier 2 · the coast land-grab**
6. CCTV Installation Mombasa: Prices, Coverage, 2026 · 7–12. Six neighbourhood pages (Nyali, Bamburi & Shanzu, Mtwapa, Diani & Ukunda, Likoni & South Coast, Kilifi/Malindi/Watamu) · 13. **CCTV on the Kenyan Coast: Salt Air, Humidity and Which Cameras Survive** — differentiated expertise no Nairobi firm can credibly write · 14. Securing a Holiday Home or Airbnb on the South Coast.

**Tier 3 · cost pages half-answered by the market**
15. CCTV Installation Cost Per Camera · 16. How Much Does CCTV Cost for a 3-Bedroom House? · 17. CCTV for Your Shop or Duka · 18. CCTV for Farms and Rural Property (Solar, 4G, Long Runs) · 19. DVR and NVR Prices 4/8/16/32 Channel · 20. CCTV Cable: RG59 vs Cat6, Prices and How Much You Need · 21. **What CCTV Installation Labour Actually Costs (Day and Per-Point Rates)** — every competitor hides this · 22. Access Control System Prices · 23. Biometric Time & Attendance: Device Prices and TCO · 24. Automatic Gate Cost: Sliding vs Swing, Fully Itemised · 25. Nanny Camera Prices — **and what's legal**, which nobody addresses.

**Tier 4 · comparisons**
26. Hikvision vs Dahua in Kenya, With Real Local Prices · 27. Hikvision vs HiLook: Is Budget Worth It? · 28. Analog vs IP: Cost Difference on a Real 8-Camera Job (two BOMs side by side — exactly the object an answer engine quotes).

**Tier 5 · the unoccupied high ground**
29. **CCTV and the Law in Kenya: Data Protection Act 2019, ODPC Rules, and What You Must Do.** The ODPC Draft Guidance Note for Private Security (Dec 2025) is nine months old and essentially nobody in the industry has written about it. Highest-authority page on the site, most likely to earn editorial links, strongest AI-citation candidate — and it sells a compliance service no competitor offers.
30. **How to Read a CCTV Quotation in Kenya: Nine Ways Installers Overcharge.** Converts the whole strategy into an argument. Every competitor hiding prices becomes evidence. This is the page that gets shared into WhatsApp groups.

Cadence after launch: 2 per week. Every article carries a real `dateModified`, an FAQ block, and a link to the relevant Solution and calculator.

## 5. Off-page — 77% of the work

Only ~23% of branded citations come from owned content. The rest is off-page, and it is the least-done work in this market.

**Google Business Profile is the highest-return single asset.** It is the most-cited source in AI local answers — 28.6% of all citations, ~67% within Google AI Overviews.
- **One profile: Mombasa.** Owner decision, and consistent with the coast-only strategy. Proximity cannot be bought — a Mombasa profile is what ranks in Nyali, Bamburi and Mtwapa, and it will not rank in Nairobi, which is fine because we are not competing there.
- **Primary category: Security System Installer** — not Supplier. Primary category carries disproportionate weight. Secondaries: Security System Supplier, Burglar Alarm Store, Fence Contractor, Gate Contractor, Electrician, Home Automation Company.
- Service areas: Mombasa Island, Nyali, Bamburi, Shanzu, Mtwapa, Likoni, Tudor, Kizingo, Diani, Ukunda, Kilifi, Malindi, Watamu — mapped one-to-one to the location pages.
- **Reviews are where the market is soft** — AreaSpy, the strongest site in the market, has **8 reviews** while claiming 2,400+ clients. A steady 4–8/month per profile, sustained and non-bursty, outpaces everyone. Two Kenya-specific details: get reviewers to **name the neighbourhood** ("six cameras at our place in Nyali") because that text is matched against local queries, and **reply to every review** — almost nobody here does.
- Weekly geotagged install photos and GBP Posts. Free freshness signal, universally ignored by competitors.

**Directories worth the time.** Tier 1: Google Business Profile · **Jiji.co.ke** (385K monthly, 99% Kenyan — and the Mombasa CCTV category has four listings, so this is a *lead channel*, not just a citation) · PigiaMe · BusinessList.co.ke · Bing Places · LinkedIn. Tier 2: Yellow Pages Kenya, Bizna Kenya, Brownbook, Cybo, Express Business Directory, Go Africa Online, Afrikta, Yalwa, Tuugo, Locanto, Apple Business Connect. **Skip** the KES 5,000–30,000 "premium listing" upsells on micro-traffic sites.

**Get onto the listicles that already rank** — `victormatara.com/list-of-best-cctv-installers-in-kenya`, `gmcleaning.co.ke`, Bizna roundups. When someone asks an LLM "best CCTV installer in Mombasa," those lists are what gets cited. Being on them is worth more than three of our own pages.

**Reddit (21% of AI Overview citations) and YouTube (18.8%).** Genuine participation in r/Kenya threads about home security — answering "how much did your CCTV cost" with real numbers — is disproportionately valuable and free. YouTube: film real installs, name the neighbourhood in the title, show the equipment.

**NAP consistency is the boring thing that decides whether four scattered mentions read as one entity.** Fix one canonical business name, one Mombasa address string, one Nairobi address string, one phone format. Write them into `site_settings`, never deviate, audit quarterly.

**Wikidata yes, Wikipedia no.** A Mombasa installer will not pass Wikipedia notability and a deleted article is worse than none. A truthful Wikidata item is reachable and is machine-read by knowledge-graph pipelines.

## 6. llms.txt — publish it, don't believe in it

Honest position: adoption reached ~36,000 sites (about 1.2%), but log analysis across 137,000 domains found **97% of llms.txt files received zero requests**, with AI retrieval bots at 1.1% of the requests that did arrive. Google says it has no effect on Search. OpenAI and Anthropic both point site owners at robots.txt.

So: publish one, keep it under 5KB, lead with a plain-language description of the business and where it operates, link the 10–15 pages we most want quoted (the price tables, the BOM pages, the service-area pages). It takes twenty minutes and cannot hurt. Then **do not let it displace a single hour** of work on ranking, tables, schema, GBP and third-party mentions. If a vendor pitches llms.txt as an AI strategy, that is the whole strategy exposed.

Same category: claim **Bing Webmaster Tools** and submit the sitemap. Ten minutes, free, definitely helps Copilot. The widely repeated "87% of ChatGPT citations match Bing" figure is asserted without methodology and is contradicted by reporting that ChatGPT now runs its own index. Do not build a strategy on it.

## 7. Technical checklist

- SSG/ISR for every public route; `revalidate` on price or content change via webhook
- Real `<table>` for all pricing; wrap in `overflow-x:auto`, never let the page scroll sideways
- `next/image` with explicit dimensions; AVIF/WebP; lazy below the fold
- Lighthouse ≥95 across the board; INP < 200ms; LCP < 2.0s on 4G — **test on throttled mobile, most Kenyan traffic is mid-range Android on metered data**
- `sitemap.xml` generated from the database, `lastmod` from real `updated_at`
- Canonical on every page; `noindex` on `/admin`, `/quote`, `/q/[code]`
- OpenGraph images generated per page (`next/og`)
- Full-page HTML under 4MB, always
- Search Console + Bing Webmaster + GA4 + Vercel Analytics from day one
- Every article and price page renders a visible "Updated {Month Year}" that reads from `prices_updated_at` / `updated_at` — never a hardcoded string

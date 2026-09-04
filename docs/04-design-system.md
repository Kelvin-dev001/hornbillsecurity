# 04 · Design System

Derived from `logo/Logo.png` — a hornbill in near-black with a casque and wing running red-orange → amber → gold.

## Palette

Sampled from the logo (values are the actual dominant clusters, not approximations):

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#0F0F12` | Primary text, dark surfaces. The logo body is a neutral black with a faint blue cast |
| `--ink-soft` | `#1A1A20` | Elevated dark surface, cards on dark |
| `--brand-orange` | `#F85A00` | **The brand colour.** Buttons, active states, accents |
| `--brand-ember` | `#F83000` | Gradient start, hover states |
| `--brand-amber` | `#F89000` | Gradient midpoint |
| `--brand-gold` | `#FFC400` | Highlight, price emphasis on dark, focus rings |
| `--action` | `#C64200` | Orange for text/links **on white** |
| `--whatsapp` | `#25D366` | WhatsApp button only — never repurposed |
| `--paper` | `#FFFFFF` | |
| `--paper-warm` | `#FAF8F6` | Section alternation |
| `--line` | `#E6E2DE` | Borders, table rules |
| `--muted` | `#6B6660` | Secondary text |
| `--success` `--warn` `--danger` | `#0E7A4E` `#B45309` `#B42318` | In-stock, lead-time, out-of-stock |

Brand gradient (hero, section accents, price bars): `linear-gradient(135deg, #F83000 0%, #F85A00 45%, #FFC400 100%)`.

## The contrast rule — this is not optional

Measured against the logo colours:

| Pair | Ratio | Verdict |
|---|---|---|
| White on `--brand-orange` | **3.25:1** | ❌ Fails AA for body text |
| `--ink` on `--brand-orange` | **5.88:1** | ✅ Use this for buttons |
| White on `--action` `#C64200` | **5.02:1** | ✅ Use where white text on orange is unavoidable |
| `--brand-gold` on `--ink` | **11.98:1** | ✅ Excellent — price emphasis on dark |
| `--brand-orange` on `--ink` | 5.88:1 | ✅ |

**Never put white text on `#F85A00`.** The primary button is orange with near-black text — which also happens to be exactly what the logo does, so it reads as brand rather than compromise. Add a lint rule or a Storybook check if it keeps slipping.

## Typography

- **Display / headings:** Space Grotesk — geometric, slightly technical, distinct from the Poppins/Montserrat every Kenyan competitor uses.
- **Body:** Inter.
- **Numeric:** Inter with `font-variant-numeric: tabular-nums`. **Mandatory in every price table** — column alignment is the whole point of publishing prices.

Scale: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60. Body 16px minimum, 1.6 line height. Headings 1.15, tight tracking on display sizes.

## Voice

Plain, specific, priced. The reader is comparing three quotes on WhatsApp and does not trust any of them.

- ✅ "A 4-camera ColorVu system for a 3-bedroom house in Nyali: KES 68,400 excluding VAT. Here is every line."
- ❌ "Cutting-edge, state-of-the-art security solutions tailored to your needs."

Name the model number. Give the number. Say what it does not do. Say when it is the wrong choice — `not_suitable_for` exists on every Solution for exactly this reason, and honesty about limits is both the strongest trust signal and the most citable kind of sentence.

## Key components

**PriceTable** — real `<table>`, `tabular-nums`, right-aligned money, sticky header on long lists, `overflow-x:auto` wrapper. Server-rendered. The single most important component on the site.

**BOMTable** — grouped by `line_type` with visual separation: Primary equipment / Secondary components / Consumables / Installation & labour. Columns: Item (linked) · Spec · Qty · Unit price · Total. Footer: subtotal, VAT line, total. Every row links to its item page.

**SolutionCard** — name, hero, "from KES X", camera/point count, best-for tags, two CTAs: *View full bill of materials* and *Add to quote*.

**ItemCard** — placeholder-aware. Most items have no photo at launch: render a branded placeholder with the category icon and the model number set in mono, not a broken image and not a stock photo. It should look deliberate.

**WhatsAppFAB** — fixed bottom-right, `--whatsapp`, above the fold on mobile, on every page. Pre-fills a contextual message: on an item page the model number; on a solution page the package name; on `/q/[code]` the quote code.

**QuoteBar** — sticky bottom bar once the quote basket is non-empty: item count, running total, "View quote".

**PriceStamp** — "Prices updated {Month Year} · KES, excluding VAT" beside every price block, reading from `site_settings.prices_updated_at`. This is a trust device and a freshness signal; competitors almost universally omit it.

**SpecTable** — `<table>` from `items.specs` jsonb, grouped.

**TrustBar** — Hikvision / Dahua / Tiandy authorised partner · 5+ years · Mombasa & Nairobi · reply within 30 minutes.

## Layout

Max width 1200px, 1024px for article bodies. Spacing scale 4/8/12/16/24/32/48/64/96. Radius: 8px controls, 12px cards, 999px pills. Shadows sparingly — dark surfaces and the gradient carry the visual weight.

**Mobile is the primary target.** Most traffic is mid-range Android on metered data. Tables scroll inside their own container; the page body never scrolls horizontally. Tap targets 44px minimum.

## Dark mode

Not at launch. The palette is dark-capable (`--ink` surfaces with `--brand-gold` accents at 11.98:1) — define tokens so it can be added without a repaint, but ship light only.

## Placeholder image strategy

The owner uploads photos later through the admin portal. Until then every image slot renders a `<PlaceholderImage>`: brand gradient at low opacity, category icon, model number in mono, correct aspect ratio. Never a broken image, never a stock photo of somebody else's install, never a supplier's watermarked packshot. When a real image arrives it swaps in with no layout shift because dimensions are fixed.

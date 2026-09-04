# 02 · Data Model

Postgres on Supabase. Drizzle for schema and migrations. All money in **integer KES cents**? No — **integer KES**, VAT-exclusive. Kenya has no sub-shilling pricing; using integers avoids float error entirely.

## Core principle

`cost_price` exists in exactly one place, is readable by exactly one role, and is never in a select list that a public query can reach. Everything else is derived.

---

## Tables

### `categories`
Hierarchical, one tree covering both services and item groups.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| slug | text unique | URL segment |
| name | text | |
| parent_id | uuid null → categories.id | |
| kind | enum `service` \| `item_group` | Services get service pages; item groups are catalogue filters |
| icon | text null | lucide icon name |
| summary | text | 1–2 lines, used in cards and meta description |
| body | text null | MDX-ish long copy for service pages |
| sort_order | int | |
| seo_title, seo_description | text null | |
| published | bool | |

Seed tree: `cctv` (→ `analog-cameras`, `ip-cameras`, `ptz`, `solar-4g`, `recorders`, `storage`, `cctv-accessories`), `electric-fencing`, `razor-wire-perimeter`, `gate-automation`, `video-intercom`, `access-control-time-attendance`, `fire-smoke-detection`, `networking-structured-cabling`, `cable-management`, `radio-communications`, `fuel-monitoring`, `server-control-room`, `smart-home-nanny-cameras`, `power-backup`.

### `brands`
| column | type | notes |
|---|---|---|
| id, slug, name | | |
| is_authorised_partner | bool | true for Hikvision, Dahua, Tiandy |
| logo_url | text null | |

### `items` — the SKU table
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| sku | text unique | Real model number, e.g. `DS-2CD1043G2-LIUF/SL` |
| slug | text unique | |
| name | text | Commercial name |
| brand_id | uuid null | |
| category_id | uuid | |
| short_description | text | One sentence |
| description | text | Long copy |
| use_cases | text[] | "Shop till area", "Gate approach", "Boundary wall" |
| specs | jsonb | `[{label, value, group}]` — rendered as a real `<table>` |
| **cost_price** | int null | **PRIVATE. Distributor price, VAT-excl.** |
| **price** | int null | Public. Generated: `round(cost_price × markup, -2)` unless overridden |
| price_override | int null | Manual public price; wins over the formula |
| market_ceiling_price | int null | Effective price never exceeds this |
| markup_multiplier | numeric | Default 1.40; per-item override |
| price_basis | enum | `distributor` \| `market_research` \| `quote_required` |
| unit | enum | `each` \| `metre` \| `roll_305m` \| `box` \| `length_2m` \| `coil` \| `pair` |
| in_stock | bool | Flag only, no counts |
| lead_time_note | text null | |
| primary_image_url | text null | null → placeholder component |
| gallery | text[] | |
| datasheet_url | text null | |
| is_consumable | bool | Cable, connectors, clips — hidden from headline lists |
| compatible_with | uuid[] | Item ids; powers "works with" |
| alternatives | uuid[] | Cheaper/better swaps in the builder |
| search_vector | tsvector generated | sku + name + description + specs |
| seo_title, seo_description | text null | |
| published | bool | |
| created_at, updated_at | timestamptz | |

**Effective price is computed in one place only** — `lib/pricing/effectivePrice.ts` — and mirrored as a Postgres generated column so SQL and TypeScript cannot disagree:

```
effective_price = LEAST(
  COALESCE(price_override, ROUND(cost_price * markup_multiplier / 100.0) * 100),
  COALESCE(market_ceiling_price, 2147483647)
)
```

### `services`
| column | type | notes |
|---|---|---|
| id, slug, name, category_id | | |
| pricing_unit | enum | `per_point` \| `per_camera` \| `per_door` \| `per_metre` \| `per_day` \| `fixed` |
| price | int | Public, VAT-excl. |
| description, inclusions | text / text[] | |
| published | bool | |

Seed: camera installation point (3,000), data point (4,500), access door (8,000), electric fence per metre (300), site survey (1,000, refundable), commissioning and handover training (fixed), AMC tiers.

### `solutions` — the packages
| column | type | notes |
|---|---|---|
| id, slug, name | | |
| category_id | uuid | |
| tier | enum `essential` \| `standard` \| `pro` | |
| property_types | text[] | `home`, `apartment`, `shop`, `office`, `warehouse`, `school`, `estate`, `farm` |
| summary, description | text | |
| hero_image_url | text null | |
| is_builder_template | bool | Seeds the Solution Builder |
| best_for, not_suitable_for | text[] | Honest framing; strong AI-citation material |
| seo_title, seo_description | text null | |
| published | bool | |

Derived and cached on write: `subtotal_items`, `subtotal_labour`, `total_excl_vat`. Never trust a stale cache — recompute on any item price change via a Postgres trigger plus an ISR revalidation webhook.

### `solution_lines` — the bill of materials
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| solution_id | uuid | |
| line_type | enum | `primary` \| `secondary` \| `consumable` \| `labour` |
| item_id | uuid null | one of item_id / service_id set |
| service_id | uuid null | |
| quantity | numeric | |
| quantity_formula | text null | e.g. `cameras * cable_m_per_camera_residential * cable_wastage_factor / 305` |
| unit_price_snapshot | int null | Optional freeze for a published package |
| note | text null | "Includes 15% slack for drops and re-runs" |
| sort_order | int | |

`quantity_formula` is the mechanism that makes "it depends" honest: quantities are expressions over `pricing_rules`, evaluated server-side, never hardcoded in a component.

### `pricing_rules`
| column | type |
|---|---|
| key | text pk (e.g. `cable_m_per_camera_residential`) |
| value | numeric |
| unit | text |
| label | text |
| description | text |
| group | text |

Editable from admin. Defaults are in `docs/01-business-and-pricing.md` §6. Use a safe expression evaluator (no `eval`) — a small allow-listed parser over rule keys and arithmetic operators.

### `quotes`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| code | text unique | 6-char, unambiguous alphabet (no O/0/I/1) → `/q/AB12CD` |
| customer_name, customer_phone | text | |
| customer_email | text null | |
| county, area | text | |
| property_type | text | |
| builder_inputs | jsonb | The six answers, so a quote is reproducible |
| lines | jsonb | Frozen snapshot: sku, name, qty, unit price, extended |
| subtotal, vat_amount, total | int | |
| status | enum | `new` \| `contacted` \| `survey_booked` \| `surveyed` \| `quoted` \| `won` \| `lost` |
| source | enum | `builder` \| `solution_page` \| `item_page` \| `manual_admin` |
| notes | text null | Internal |
| pdf_url | text null | |
| created_at, updated_at | timestamptz | |

A quote **freezes its line prices**. A customer must be able to reopen `/q/AB12CD` next week and see what they were shown.

### `posts` — blog
`id, slug, title, excerpt, body (MDX), cover_image_url, author, category, tags[], related_service_ids[], related_item_ids[], faq jsonb, published_at, updated_at, seo_title, seo_description, published`

`faq` renders as real Q/A markup and as `FAQPage` JSON-LD.

### `locations` — the local-SEO engine
| column | type | notes |
|---|---|---|
| id, slug, name | | `nyali`, `bamburi-shanzu`, `mtwapa`, `diani-ukunda`, `likoni-south-coast`, `kilifi-malindi-watamu`, `mombasa-island`, `nairobi`, `westlands`, `karen`, `kilimani`, `lavington`, `runda`, `syokimau-kitengela` |
| county | text | |
| parent_id | uuid null | Nyali → Mombasa |
| lat, lng | numeric | |
| intro, local_notes | text | Genuinely local content — not a template with the name swapped |
| featured_project_ids | uuid[] | |
| featured_solution_ids | uuid[] | |
| published | bool | |

**A location page with nothing but a find-and-replaced town name is thin content and will be treated as such.** Each needs a real local fact: a landmark, a completed job, a condition specific to the area (salt air in Nyali, power stability upcountry, estate rules in Runda).

### `projects` — case studies and gallery
`id, slug, title, client_name, client_named_ok (bool), location_id, category_id, summary, challenge, solution, outcome, images[], solution_id (nullable), completed_at, published`

Seed with Nebsam Digital Solutions and Mash East Africa Ltd.

### `testimonials`
`id, author, role, company, location_id, quote, rating, source, published`

### `site_settings` — single row
`whatsapp_number, phone, email, address_mombasa, address_nairobi, business_hours, response_promise, prices_updated_at, mpesa_paybill, mpesa_account, site_survey_fee, deposit_percent, vat_rate, facebook_url, tiktok_url, instagram_url, youtube_url`

Nothing in this list may be hardcoded in a component.

### `leads`
Non-quote enquiries: contact form, callback request, survey booking. `id, name, phone, email, message, source_page, status, created_at`.

### `media`
`id, storage_path, public_url, alt_text, width, height, bytes, uploaded_at`. Alt text is **required** on upload — the admin form does not submit without it.

---

## Row Level Security

```
items          public SELECT → published = true, and only via a view
               that omits cost_price entirely
items          admin ALL     → authenticated AND role = 'admin'
solutions      same pattern
quotes         public INSERT → allowed (rate-limited at the edge)
quotes         public SELECT → by code only, via an RPC, never a table scan
quotes         admin ALL
pricing_rules  public SELECT → allowed (they are not secret; the costs are)
everything else: public read on published rows, admin write
```

Create `public_items` as a **view** with an explicit column list that does not include `cost_price` or `markup_multiplier`, and point every public query at the view. Belt and braces: RLS on the base table, plus a view that cannot leak, plus a test asserting `cost_price` never appears in any server response body.

## Indexes
`items(slug)`, `items(category_id, published)`, `items USING gin(search_vector)`, `items USING gin(compatible_with)`, `solution_lines(solution_id, sort_order)`, `quotes(code)`, `quotes(status, created_at desc)`, `posts(slug)`, `posts(published_at desc)`, `locations(slug)`.

## Seed order
`site_settings` → `pricing_rules` → `brands` → `categories` → `items` (from `docs/07-catalog-seed.csv`) → `services` → `solutions` + `solution_lines` → `locations` → `projects` → `testimonials` → `posts`.

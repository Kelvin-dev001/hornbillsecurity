/**
 * Generates docs/12-distributor-pricing-worksheet.md — every row that is
 * waiting on a price from the owner, named, grouped and ready to fill in.
 *
 * `npm run docs:pricing`
 *
 * ## Why this exists
 *
 * "Supply the distributor price lists" had been sitting in
 * docs/09-open-items.md as four separate prose rows (items 2, 29, 34 and 37)
 * that between them blocked nine service pages, the electric-fence builder,
 * two Tier 1 articles, and the credibility of every package total. None of
 * them named a single SKU, which makes the ask impossible to act on: you
 * cannot go to a supplier with "the fencing category".
 *
 * So this reads the database and writes the list out. It is generated rather
 * than hand-kept for the obvious reason — the moment a price is entered in
 * admin the row disappears from the worksheet, and a hand-written list would
 * still be asking for it in six months.
 *
 * ## What it distinguishes
 *
 * Grouped by what the owner has to *do*, because that is not the same as the
 * `price_basis` enum:
 *
 *   1. **Live on an estimated cost.** Published, marked as estimates on every
 *      line, and load-bearing: these are the BOM consumables, and they are what
 *      makes 36% of a four-camera package total an estimate rather than a real
 *      figure (docs/09 item 29). Listed first because it matters most and looks
 *      least urgent.
 *   2. **Priced from market research.** A figure read off a Kenyan reseller or
 *      Jumia listing. CLAUDE.md §5 forbids marking these up — "those already
 *      carry 25–105% over dealer. Treat them as a ceiling to stay under, never
 *      a base to mark up" — so they are held back until a trade cost arrives.
 *   3. **No cost at all.** Invisible on the site. This is what blocks the rest
 *      of Sprint 6: no packaged solutions and no cost articles without them.
 *   4. **Costed but held back for another reason.** NOT a pricing ask — an
 *      illegible model number, an unconfirmed reel length (docs/09 items 11 and
 *      12b). Separated so they are not sent to a supplier by mistake.
 *   5. **Services with no rate.** The owner's own labour and contract rates.
 *      Nobody else can supply these.
 *
 * The groups are exhaustive by construction and the script throws if they stop
 * accounting for every row — the first version grouped on `basis` and silently
 * dropped fourteen items, which is most of the entrance-control, screening and
 * intercom catalogue. A worksheet with holes in it is worse than none.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const sql = postgres(connectionString, { prepare: false, max: 1, onnotice: () => {} });

const kes = (value) => (value === null ? "—" : `KES ${Number(value).toLocaleString("en-KE")}`);

/** Markdown table cell: pipes and newlines would break the row. */
const cell = (value) =>
  String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\s*\n\s*/g, " ")
    .trim();

try {
  const items = await sql`
    select i.sku, i.name, i.unit::text as unit, i.published,
           i.cost_price, i.price_override, i.market_ceiling_price,
           i.effective_price, i.price_basis::text as basis, i.internal_note,
           c.slug as category_slug, c.name as category_name, c.kind::text as category_kind,
           b.name as brand
    from items i
    join categories c on c.id = i.category_id
    left join brands b on b.id = i.brand_id
    order by c.sort_order, i.sku
  `;

  const services = await sql`
    select s.slug, s.name, s.pricing_unit::text as unit, s.published,
           s.price, s.price_basis::text as basis, s.internal_note,
           c.slug as category_slug, c.name as category_name
    from services s
    join categories c on c.id = s.category_id
    order by c.sort_order, s.sort_order
  `;

  const settings = (await sql`select prices_updated_at, vat_rate from site_settings limit 1`)[0];

  // ── the three groups ─────────────────────────────────────────────────────
  // Grouped by what the owner has to DO, not by the enum. The first version of
  // this grouped on `basis` and silently dropped fourteen rows — every
  // unpublished placeholder, which is most of the entrance-control, screening
  // and intercom catalogue — through the gaps between three filters. A
  // worksheet that omits the largest group is worse than no worksheet, so the
  // groups below are exhaustive by construction and the count is asserted
  // against the table at the end.
  const estimated = items.filter((r) => r.published && r.basis === "placeholder");
  const research = items.filter((r) => r.basis === "market_research");
  const unpriced = items.filter((r) => !r.published && r.cost_price === null);
  // Has a cost, still held back — not a pricing ask. docs/09 items 11 and 12b:
  // an illegible model number and an unconfirmed reel length. Listed so they
  // are not mistaken for rows waiting on a price.
  const heldForOtherReasons = items.filter(
    (r) => !r.published && r.cost_price !== null && r.basis !== "market_research",
  );

  const accounted =
    items.filter((r) => r.published && r.basis !== "placeholder").length +
    estimated.length +
    research.length +
    unpriced.length +
    heldForOtherReasons.length;
  if (accounted !== items.length) {
    throw new Error(
      `worksheet groups do not account for every item: ${accounted} of ${items.length}. ` +
        "Fix the grouping rather than shipping a list with holes in it.",
    );
  }
  const unpricedServices = services.filter((s) => s.price === null);

  const byCategory = (rows) => {
    const groups = new Map();
    for (const row of rows) {
      const key = row.category_name;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()];
  };

  const stamp = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(settings.prices_updated_at);

  const out = [];
  const w = (line = "") => out.push(line);

  w("# 12 · Distributor Pricing Worksheet");
  w();
  w("**Generated — do not edit by hand.** `npm run docs:pricing` rewrites it from the");
  w("database, so a row disappears the moment its price is entered. Last generated");
  w(`against a catalogue whose last price review was ${stamp}.`);
  w();
  w("This is the single ask that blocks the most work on this project. It replaces the");
  w("prose in `docs/09` items 2, 29, 34 and 37 with the actual list, because you cannot");
  w('take "the fencing category" to a supplier.');
  w();
  w("## How to enter them");
  w();
  w("Either way, **enter the trade / distributor cost, not the retail price.** The public");
  w("price is computed as `cost × 1.40`, rounded to the nearest 100, and applying that to");
  w("a figure that is already retail prices us out of the market (`CLAUDE.md` §5).");
  w();
  w("1. **One at a time** — Admin → Items → the item → cost price. The panel shows cost,");
  w("   markup, computed price, ceiling and effective price together, and warns if the");
  w("   computed price would clear a ceiling you have set.");
  w("2. **In bulk** — Admin → Items → Export CSV, fill in the `supplier_price_kes`");
  w("   column, then Import. The importer reports what it will change before it writes.");
  w();
  w("Anything you have no cost for, leave blank. A blank stays invisible on the site,");
  w("which is the correct behaviour — a guess is not.");
  w();

  // ── group 1: live on estimates ───────────────────────────────────────────
  w("## 1. Live on an estimated cost — the commercially urgent group");
  w();
  w(`${estimated.length} rows. These are **published and in use**, priced at estimated`);
  w("Mombasa trade rates, and marked as estimates on every line of every bill of");
  w("materials they appear in. They are the parts your own price list does not carry —");
  w("cable, connectors, trunking, clips, power supplies, boxes.");
  w();
  w("They matter more than anything else on this page: they are consumables, so they");
  w("appear in every package, and on the four-camera package they are **36% of the");
  w("total** (`docs/09` item 29). Every published package price on the site is that");
  w("much of an estimate until these are real.");
  w();
  if (estimated.length > 0) {
    for (const [category, rows] of byCategory(estimated)) {
      w(`### ${category}`);
      w();
      w("| SKU | Item | Unit | Estimated cost | Public price now | Your trade cost |");
      w("|---|---|---|---:|---:|---|");
      for (const r of rows) {
        w(
          `| \`${cell(r.sku)}\` | ${cell(r.name)} | ${cell(r.unit)} | ${kes(r.cost_price)} | ${kes(r.effective_price)} | |`,
        );
      }
      w();
    }
  } else {
    w("None — every published row now carries a real cost. ");
    w();
  }

  // ── group 2: market research ─────────────────────────────────────────────
  w("## 2. Priced from market research — held back from the site");
  w();
  w(`${research.length} rows. Each carries a figure read off a Kenyan reseller or Jumia`);
  w("listing, which is a **ceiling to stay under, never a base to mark up** — those");
  w("listings already run 25–105% over dealer (`CLAUDE.md` §5). Marking one up by 40%");
  w("would put us above a price the customer can check in thirty seconds.");
  w();
  w("So they are unpublished. A trade cost publishes them.");
  w();
  if (research.length > 0) {
    for (const [category, rows] of byCategory(research)) {
      w(`### ${category}`);
      w();
      w("| SKU | Item | Unit | Researched retail | Your trade cost |");
      w("|---|---|---|---:|---|");
      for (const r of rows) {
        w(
          `| \`${cell(r.sku)}\` | ${cell(r.name)} | ${cell(r.unit)} | ${kes(r.cost_price ?? r.price_override)} | |`,
        );
      }
      w();
    }
  } else {
    w("None.");
    w();
  }

  // ── group 3: no price at all ─────────────────────────────────────────────
  w("## 3. No price at all");
  w();
  w(`${unpriced.length} rows across ${byCategory(unpriced).length} categories. These are`);
  w("invisible on the site today. Their service pages are live and say plainly that");
  w("equipment prices are not published yet, rather than showing an estimate.");
  w();
  w("This group is what blocks the rest of Sprint 6: `docs/05` wants at least two");
  w("packaged solutions with full bills of materials per service line, and a bill of");
  w("materials assembled from guesses would put an invented total on a page whose whole");
  w("claim is that its totals are real.");
  w();
  if (unpriced.length > 0) {
    for (const [category, rows] of byCategory(unpriced)) {
      w(`### ${category}`);
      w();
      w("| SKU | Brand | Item | Unit | Your trade cost | Note |");
      w("|---|---|---|---|---|---|");
      for (const r of rows) {
        w(
          `| \`${cell(r.sku)}\` | ${cell(r.brand ?? "—")} | ${cell(r.name)} | ${cell(r.unit)} | | ${cell(r.internal_note ?? "")} |`,
        );
      }
      w();
    }
  } else {
    w("None.");
    w();
  }

  // ── held back for reasons that are not price ─────────────────────────────
  if (heldForOtherReasons.length > 0) {
    w("## 4. Held back for a reason other than price");
    w();
    w(`${heldForOtherReasons.length} rows. **These already have a cost** — do not send`);
    w("them to a supplier. Each is waiting on one specific fact, and each publishes with");
    w("one click once you confirm it.");
    w();
    w("| SKU | Item | Cost held | What is needed |");
    w("|---|---|---:|---|");
    for (const r of heldForOtherReasons) {
      w(
        `| \`${cell(r.sku)}\` | ${cell(r.name)} | ${kes(r.cost_price)} | ${cell(r.internal_note ?? "Confirm and publish")} |`,
      );
    }
    w();
  }

  // ── services ─────────────────────────────────────────────────────────────
  w(`## ${heldForOtherReasons.length > 0 ? 5 : 4}. Services with no rate`);
  w();
  w(`${unpricedServices.length} rows. These are your own labour and contract rates`);
  w("rather than anything a supplier quotes, so nobody else can fill them in. They are");
  w("unpublished until you set them, and the recurring ones are the whole of Sprint 8's");
  w("revenue model.");
  w();
  if (unpricedServices.length > 0) {
    w("| Service | Category | Charged | Your rate |");
    w("|---|---|---|---|");
    for (const s of unpricedServices) {
      w(
        `| ${cell(s.name)} | ${cell(s.category_name)} | ${cell(s.unit.replace(/_/g, " "))} | |`,
      );
    }
    w();
  }

  // ── the two judgement calls ──────────────────────────────────────────────
  w(`## ${heldForOtherReasons.length > 0 ? 6 : 5}. Two numbers to sanity-check rather than supply`);
  w();
  w("Neither is a supplier price. Both are assumptions of mine that move every package");
  w("total, and ten minutes with a past job settles them.");
  w();
  w("| Rule | Current | Why it matters |");
  w("|---|---|---|");
  w(
    "| `trunking_m_per_camera` | 12 m | The single largest consumable line. At 12 m a four-camera house takes 24 lengths. Right for a surface-run bungalow; roughly double if most runs go through the roof (`docs/09` item 30) |",
  );
  w(
    "| `labour_per_camera_point` | Admin → Quantity rules | Industry-typical, not yours. It is about 17% of a four-camera job (`docs/09` item 13b) |",
  );
  w();
  w("Both live in Admin → Quantity rules. Changing either re-prices every package on");
  w("the site immediately.");
  w();

  const total =
    estimated.length +
    research.length +
    unpriced.length +
    heldForOtherReasons.length +
    unpricedServices.length;
  w("## Summary");
  w();
  w("| Group | Rows | Effect today |");
  w("|---|---:|---|");
  w(
    `| Live on an estimated cost | ${estimated.length} | Published; 36% of a four-camera package total is an estimate |`,
  );
  w(`| Priced from market research | ${research.length} | Held back; cannot be marked up |`);
  w(`| No price at all | ${unpriced.length} | Invisible; blocks solutions and cost articles |`);
  if (heldForOtherReasons.length > 0) {
    w(
      `| Held back, not on price | ${heldForOtherReasons.length} | Costed already; waiting on one fact each |`,
    );
  }
  w(`| Services with no rate | ${unpricedServices.length} | Held back; yours to set, not a supplier's |`);
  w(`| **Total** | **${total}** | |`);
  w();
  w("All prices are KES and VAT-exclusive throughout");
  w(`(VAT ${Number(settings.vat_rate)}% is added at invoice).`);

  const path = join(process.cwd(), "docs", "12-distributor-pricing-worksheet.md");
  writeFileSync(path, out.join("\n") + "\n", "utf8");

  console.log(`✓ docs/12-distributor-pricing-worksheet.md`);
  console.log(
    `  ${estimated.length} on estimates · ${research.length} market research · ` +
      `${unpriced.length} unpriced · ${heldForOtherReasons.length} held for other reasons · ` +
      `${unpricedServices.length} services · ${total} total`,
  );
} finally {
  await sql.end();
}

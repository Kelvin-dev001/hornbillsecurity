/**
 * The pricing rule, tested twice: once as arithmetic, and once against the
 * database's own generated column so the two cannot drift apart.
 */
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import {
  DEFAULT_MARKUP_MULTIPLIER,
  effectivePrice,
  exceedsMarketCeiling,
  markedUpPrice,
} from "../lib/pricing/effectivePrice";
import { connect, readPrivatePriceRows } from "./helpers/db";

const markup = DEFAULT_MARKUP_MULTIPLIER;

describe("effectivePrice", () => {
  it("marks distributor cost up by 40% and rounds to the nearest 100", () => {
    // DS-2CD1043G2-LIUF/SL, the workhorse 4MP bullet: 8,500 → 11,900.
    assert.equal(
      effectivePrice({
        costPrice: 8500,
        priceOverride: null,
        marketCeilingPrice: null,
        markupMultiplier: markup,
      }),
      11900,
    );

    // DS-2CE16D0T-EXIPF, the cheapest analog camera: 1,150 × 1.4 = 1,610 → 1,600.
    assert.equal(
      effectivePrice({
        costPrice: 1150,
        priceOverride: null,
        marketCeilingPrice: null,
        markupMultiplier: markup,
      }),
      1600,
    );
  });

  it("rounds a half up, in exact arithmetic", () => {
    // 4,750 × 1.4 = 6,650 exactly, which rounds to 6,700.
    //
    // In floating point 4750 * 1.4 is 6649.999999999999, so a naive
    // Math.round(cost * markup / 100) * 100 returns 6,600 while Postgres, which
    // computes in numeric, returns 6,700. The site would then show a price
    // 100 KES below the one stored in the database, on some values and not
    // others. markedUpPrice() works in integers to prevent it.
    assert.equal(markedUpPrice(4750, markup), 6700);
    assert.equal(markedUpPrice(6250, markup), 8800);
  });

  it("takes a price_override as the public price, with no markup", () => {
    // FUEL-VEH-STD: owner-set at 45,000 installed per vehicle (docs/01 §7).
    assert.equal(
      effectivePrice({
        costPrice: null,
        priceOverride: 45000,
        marketCeilingPrice: null,
        markupMultiplier: markup,
      }),
      45000,
    );
  });

  it("never exceeds the market ceiling", () => {
    // EZVIZ CS-HB8c/SP computes to 18,200, but Jumia sells it at 17,499, so the
    // seed caps it at 16,500 (docs/01 §7). This is the case the sprint brief
    // names by number.
    const ezviz = {
      costPrice: 13000,
      priceOverride: null,
      marketCeilingPrice: 16500,
      markupMultiplier: markup,
    };

    assert.equal(markedUpPrice(13000, markup), 18200);
    assert.equal(effectivePrice(ezviz), 16500);
    assert.equal(exceedsMarketCeiling(ezviz), true);
  });

  it("leaves a price alone when the ceiling is above it", () => {
    const under = {
      costPrice: 8500,
      priceOverride: null,
      marketCeilingPrice: 20000,
      markupMultiplier: markup,
    };
    assert.equal(effectivePrice(under), 11900);
    assert.equal(exceedsMarketCeiling(under), false);
  });

  it("is null when there is no price at all", () => {
    // The quote-required and placeholder rows. docs/02 prints
    // LEAST(COALESCE(...), COALESCE(ceiling, 2147483647)) for this, which
    // returns 2,147,483,647 rather than nothing, because SQL LEAST() ignores
    // NULLs. Both this function and the generated column guard it explicitly.
    assert.equal(
      effectivePrice({
        costPrice: null,
        priceOverride: null,
        marketCeilingPrice: null,
        markupMultiplier: markup,
      }),
      null,
    );
    assert.equal(
      effectivePrice({
        costPrice: null,
        priceOverride: null,
        marketCeilingPrice: 16500,
        markupMultiplier: markup,
      }),
      null,
    );
  });

  it("honours a per-item markup override", () => {
    assert.equal(
      effectivePrice({
        costPrice: 10000,
        priceOverride: null,
        marketCeilingPrice: null,
        markupMultiplier: "1.25",
      }),
      12500,
    );
  });
});

describe("effectivePrice agrees with the database", () => {
  const sql = connect();
  after(async () => {
    await sql.end({ timeout: 5 });
  });

  it("matches the generated column for every seeded item", async () => {
    const rows = await readPrivatePriceRows(sql);
    assert.ok(rows.length > 50, `only ${rows.length} items seeded; run npm run db:seed`);

    const mismatches = rows
      .map((row) => ({
        sku: row.sku,
        db: row.effective_price,
        ts: effectivePrice({
          costPrice: row.cost_price,
          priceOverride: row.price_override,
          marketCeilingPrice: row.market_ceiling_price,
          markupMultiplier: row.markup_multiplier,
        }),
      }))
      .filter((row) => row.db !== row.ts);

    assert.deepEqual(
      mismatches,
      [],
      "the SQL generated column and lib/pricing/effectivePrice.ts disagree",
    );
  });

  it("caps the EZVIZ solar kit at its market ceiling in the database too", async () => {
    const [row] = await sql<{ effective_price: number }[]>`
      select effective_price from items where sku = 'CS-HB8c/SP'
    `;
    assert.equal(row?.effective_price, 16500);
  });
});

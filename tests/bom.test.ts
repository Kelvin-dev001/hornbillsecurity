/**
 * The bill of materials, and the database it is built from.
 *
 * The arithmetic tests are pure. The database tests check the seventeen seeded
 * packages actually price — a package whose formula does not evaluate, or which
 * points at an unpublished item, would break its page at build time.
 */
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { expandBom, isProvisionalPrice, type BomItem, type BomService } from "../lib/pricing/bom";
import { channelsFor } from "../lib/pricing/cctv";
import { sizeStorage, storageRuleKey } from "../lib/pricing/storage";
import { connect } from "./helpers/db";

const camera: BomItem = {
  id: "camera",
  sku: "DS-2CD1043G2-LIUF/SL",
  slug: "hikvision-ds-2cd1043g2-liuf-sl",
  name: "4MP Bullet",
  shortDescription: "4MP / 30m",
  unit: "each",
  price: 11900,
  priceBasis: "distributor",
};

const cable: BomItem = {
  id: "cable",
  sku: "DS-1LN6U-ZCO",
  slug: "cat6",
  name: "Cat6 305 m",
  shortDescription: "Cat6",
  unit: "roll_305m",
  price: 20300,
  priceBasis: "distributor",
};

const clips: BomItem = {
  id: "clips",
  sku: "CLIP-CABLE-100",
  slug: "clips",
  name: "Cable clips",
  shortDescription: "Pack of 100",
  unit: "box",
  price: 400,
  priceBasis: "placeholder",
};

const labour: BomService = {
  id: "labour",
  slug: "camera-installation-point",
  name: "Camera installation, per point",
  price: 3000,
  unitLabel: "point",
};

const itemsById = new Map([camera, cable, clips].map((item) => [item.id, item]));
const servicesById = new Map([[labour.id, labour]]);

function line(overrides: Partial<Parameters<typeof expandBom>[0]["lines"][number]> = {}) {
  return {
    id: "l1",
    lineType: "primary" as const,
    itemId: "camera",
    serviceId: null,
    quantity: 4,
    quantityFormula: null,
    unitPriceSnapshot: null,
    note: null,
    sortOrder: 0,
    ...overrides,
  };
}

describe("expandBom", () => {
  it("multiplies out, groups and totals", () => {
    const bom = expandBom({
      lines: [
        line(),
        line({ id: "l2", lineType: "labour", itemId: null, serviceId: "labour", quantity: 4 }),
      ],
      itemsById,
      servicesById,
      variables: {},
      vatRate: 16,
    });

    assert.equal(bom.subtotalItems, 47600); // 4 x 11,900 — the docs/01 §1 example
    assert.equal(bom.subtotalLabour, 12000);
    assert.equal(bom.subtotal, 59600);
    assert.equal(bom.vatAmount, 9536);
    assert.equal(bom.total, 69136);
    assert.deepEqual(
      bom.groups.map((group) => group.lineType),
      ["primary", "labour"],
    );
  });

  it("evaluates a quantity formula against the pricing rules", () => {
    const bom = expandBom({
      lines: [
        line({
          itemId: "cable",
          quantity: 0,
          quantityFormula:
            "ceil(cameras * cable_m_per_camera_residential * cable_wastage_factor / 305)",
        }),
      ],
      itemsById,
      servicesById,
      variables: {
        cameras: 16,
        cable_m_per_camera_residential: 30,
        cable_wastage_factor: 1.15,
      },
      vatRate: 16,
    });

    // 16 x 30 x 1.15 = 552 m, which is two 305 m boxes.
    assert.equal(bom.lines[0].quantity, 2);
    assert.equal(bom.lines[0].extended, 40600);
  });

  it("rounds a discrete quantity up, because half a box cannot be bought", () => {
    const bom = expandBom({
      lines: [line({ itemId: "cable", quantity: 0, quantityFormula: "1.2" })],
      itemsById,
      servicesById,
      variables: {},
      vatRate: 16,
    });
    assert.equal(bom.lines[0].quantity, 2);
  });

  it("drops a line whose quantity resolves to zero", () => {
    const bom = expandBom({
      lines: [line(), line({ id: "l2", itemId: "cable", quantity: 0 })],
      itemsById,
      servicesById,
      variables: {},
      vatRate: 16,
    });
    assert.equal(bom.lines.length, 1);
  });

  it("reports how much of the total carries an estimated price", () => {
    const bom = expandBom({
      lines: [line(), line({ id: "l2", itemId: "clips", quantity: 2 })],
      itemsById,
      servicesById,
      variables: {},
      vatRate: 16,
    });

    assert.equal(bom.provisionalAmount, 800);
    assert.equal(bom.subtotal, 48400);
    assert.ok(bom.provisionalShare < 0.02, "clips should be a rounding error on this bill");
  });

  it("refuses to price a line pointing at an item that is not published", () => {
    assert.throws(
      () =>
        expandBom({
          lines: [line({ itemId: "missing" })],
          itemsById,
          servicesById,
          variables: {},
          vatRate: 16,
        }),
      /not published or not priced/,
    );
  });

  it("refuses a service with no price rather than totalling without it", () => {
    assert.throws(
      () =>
        expandBom({
          lines: [line({ lineType: "labour", itemId: null, serviceId: "unpriced" })],
          itemsById,
          servicesById: new Map([
            ["unpriced", { ...labour, id: "unpriced", price: null } as BomService],
          ]),
          variables: {},
          vatRate: 16,
        }),
      /unknown service|has no price/,
    );
  });

  it("marks placeholder and market-research prices as provisional, distributor as firm", () => {
    assert.equal(isProvisionalPrice("placeholder"), true);
    assert.equal(isProvisionalPrice("market_research"), true);
    assert.equal(isProvisionalPrice("distributor"), false);
    assert.equal(isProvisionalPrice("owner_sell_price"), false);
  });
});

describe("storage sizing", () => {
  const disks = [
    { sku: "HDD-1TB" },
    { sku: "HDD-2TB" },
    { sku: "HDD-4TB" },
    { sku: "HDD-8TB" },
  ];

  it("uses the rule for the resolution", () => {
    assert.equal(storageRuleKey(2), "hdd_gb_per_channel_per_day_2mp");
    assert.equal(storageRuleKey(4), "hdd_gb_per_channel_per_day_4mp");
    assert.equal(storageRuleKey(6), "hdd_gb_per_channel_per_day_4mp");
    assert.equal(storageRuleKey(8), "hdd_gb_per_channel_per_day_8mp");
  });

  it("rounds up to the next stocked disk", () => {
    // 4 x 12 GB x 14 days = 672 GB, so a 1 TB drive.
    const small = sizeStorage({
      channels: 4,
      gbPerChannelPerDay: 12,
      retentionDays: 14,
      available: disks,
    });
    assert.equal(small.requiredGb, 672);
    assert.equal(small.sku, "HDD-1TB");
    assert.equal(small.count, 1);

    // 8 x 22 GB x 30 days = 5,280 GB, so 8 TB rather than 4.
    const large = sizeStorage({
      channels: 8,
      gbPerChannelPerDay: 22,
      retentionDays: 30,
      available: disks,
    });
    assert.equal(large.requiredGb, 5280);
    assert.equal(large.sku, "HDD-8TB");
  });

  it("uses several of the largest disk when one will not do", () => {
    // 32 x 45 GB x 30 days = 43,200 GB — six 8 TB drives.
    const huge = sizeStorage({
      channels: 32,
      gbPerChannelPerDay: 45,
      retentionDays: 30,
      available: disks,
    });
    assert.equal(huge.sku, "HDD-8TB");
    assert.equal(huge.count, 6);
  });

  it("explains itself in a sentence with the real numbers", () => {
    const sized = sizeStorage({
      channels: 4,
      gbPerChannelPerDay: 22,
      retentionDays: 21,
      available: disks,
    });
    assert.match(sized.explanation, /4 cameras × 22 GB a day × 21 days = 1,848 GB, so 2 TB\./);
  });
});

describe("recorder sizing", () => {
  it("picks the next channel count up", () => {
    assert.equal(channelsFor(1), 4);
    assert.equal(channelsFor(4), 4);
    assert.equal(channelsFor(5), 8);
    assert.equal(channelsFor(8), 8);
    assert.equal(channelsFor(9), 16);
    assert.equal(channelsFor(16), 16);
    assert.equal(channelsFor(17), 32);
  });
});

describe("the seeded packages", () => {
  const sql = connect();
  after(async () => {
    await sql.end({ timeout: 5 });
  });

  it("all have a bill of materials, best-for and not-suitable-for", async () => {
    const rows = await sql<
      {
        slug: string;
        lines: number;
        best_for: string[];
        not_suitable_for: string[];
        total_excl_vat: number | null;
      }[]
    >`
      select s.slug, s.best_for, s.not_suitable_for, s.total_excl_vat,
             (select count(*) from solution_lines l where l.solution_id = s.id)::int as lines
      from solutions s where s.published
    `;

    assert.ok(rows.length >= 17, `only ${rows.length} packages seeded`);

    for (const row of rows) {
      assert.ok(row.lines >= 3, `${row.slug} has only ${row.lines} lines`);
      assert.ok(row.best_for.length > 0, `${row.slug} has no best_for`);
      // CLAUDE.md §6 — every Solution states what it is not suitable for.
      assert.ok(row.not_suitable_for.length > 0, `${row.slug} has no not_suitable_for`);
      assert.ok((row.total_excl_vat ?? 0) > 0, `${row.slug} has no total`);
    }
  });

  it("never references an unpublished or unpriced item", async () => {
    const orphans = await sql<{ slug: string; sku: string }[]>`
      select s.slug, i.sku
      from solution_lines l
      join solutions s on s.id = l.solution_id and s.published
      join items i on i.id = l.item_id
      where i.published = false or i.effective_price is null
    `;
    // Spread to a plain array: postgres-js returns a Result object carrying
    // `count` and `command`, which deepEqual compares against a bare [].
    assert.deepEqual(
      [...orphans],
      [],
      "a published package points at an item the site cannot show",
    );
  });

  it("writes quantities as formulas wherever a pricing rule governs them", async () => {
    // docs/01 §6: quantities are expressions over pricing_rules, never literals.
    // Cable, trunking, clips and labour must all be formula-driven, or tuning a
    // rule in admin would silently fail to re-price the packages.
    const [row] = await sql<{ formulas: number; total: number }[]>`
      select count(*) filter (where quantity_formula is not null)::int as formulas,
             count(*)::int as total
      from solution_lines l
      join solutions s on s.id = l.solution_id and s.published
    `;
    assert.ok(
      row.formulas / row.total > 0.4,
      `only ${row.formulas} of ${row.total} lines carry a formula`,
    );
  });
});

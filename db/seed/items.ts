/**
 * Builds the items table from docs/07-catalog-seed.csv.
 *
 * The rules that decide whether a row is published are the whole point of this
 * file, so they are stated in one place:
 *
 *   distributor      → published. This is our own trade cost and the ×1.40 rule
 *                      applies (CLAUDE.md §5).
 *   market_ceiling   → published, with the researched market price stored as
 *                      market_ceiling_price so the effective price is capped.
 *   market_research  → NOT published. docs/01 §8 lists the four intercom kits
 *                      as needing prices confirmed, and CLAUDE.md §5 forbids
 *                      marking up a figure that is already retail.
 *   owner_sell_price → published; handled as a service, not an item.
 *   quote_required   → NOT published. There is no price.
 *   placeholder      → NOT published. Mock rows exist so the owner can price
 *                      them from admin (docs/09 item 2), not so the site can
 *                      publish a number he never agreed to.
 *
 * Three priced rows are also held back because something about them is
 * unverified — see UNPUBLISHED_PENDING_OWNER. Each is one question to a
 * supplier and one click in admin.
 */
import { markedUpPrice } from "../../lib/pricing/effectivePrice";
import { itemSlug } from "../../lib/slug";
import type { ItemUnit, NewItem, PriceBasis } from "../schema";
import { parseKes, type CatalogRow } from "./csv";
import { shortDescriptionFrom, parseSpecs } from "./specs";
import { csvBrandToSlug, csvCategoryToSlug } from "./taxonomy";

/**
 * Rows that describe recurring or installed work rather than a SKU on a shelf.
 * They are seeded into `services`, where a per-year or per-vehicle price is
 * expressible — see db/seed/services.ts.
 */
export const SERVICE_SKUS = new Set([
  "AMC-RESI",
  "AMC-COMMERCIAL",
  "CLOUD-REC",
  "REMOTE-MON",
  "GPS-TRACK",
  "TRAINING-CCTV",
  "FUEL-VEH-STD",
  "FUEL-TANK-STATIC",
]);

/**
 * Priced rows kept unpublished until the owner confirms one detail.
 *
 * The site's entire claim is that its numbers and model numbers are real. A
 * price whose model number is a guess, or whose unit we cannot state, breaks
 * that more expensively than a missing page does.
 */
export const UNPUBLISHED_PENDING_OWNER: Record<string, string> = {
  "VARIFOCAL-4MP":
    "HELD BACK: model number unconfirmed - the box code was illegible in the supplier screenshot (docs/01 8). Publish once the supplier confirms the real model number.",
  "VARIFOCAL-6MP":
    "HELD BACK: model number unconfirmed - the box code was illegible in the supplier screenshot (docs/01 8). Publish once the supplier confirms the real model number.",
  "DS-1LN6AUSPE":
    "HELD BACK: reel length unconfirmed, so we cannot say what the price buys. Confirm the reel length with the supplier, set the unit, then publish.",
};

/** docs/07 price_basis → our enum, plus whether the retail column is a ceiling. */
function mapPriceBasis(raw: string, context: string): { basis: PriceBasis; retailIsCeiling: boolean } {
  switch (raw) {
    case "distributor+40%":
      return { basis: "distributor", retailIsCeiling: false };
    case "MARKET CEILING":
      return { basis: "distributor", retailIsCeiling: true };
    case "market research":
      return { basis: "market_research", retailIsCeiling: false };
    case "owner_sell_price":
      return { basis: "owner_sell_price", retailIsCeiling: false };
    case "QUOTE REQUIRED":
      return { basis: "quote_required", retailIsCeiling: false };
    case "PLACEHOLDER":
      return { basis: "placeholder", retailIsCeiling: false };
    default:
      throw new Error(`${context}: unknown price_basis "${raw}"`);
  }
}

function unitFor(row: CatalogRow): ItemUnit {
  if (row.category === "Cable" && /305\s*m/i.test(row.name)) return "roll_305m";
  if (/\(2\s*pack\)/i.test(row.name)) return "pair";
  return "each";
}

/**
 * What a camera of this shape is actually for. Driven by form factor because
 * that is what changes the answer — a turret by the front door and an 80 m
 * bullet on a boundary wall are not interchangeable. Non-camera categories get
 * nothing rather than something generic.
 */
const USE_CASES_BY_FORM_FACTOR: Record<string, string[]> = {
  Bullet: ["Gate approach", "Boundary wall", "Driveway and parking"],
  Turret: ["Front door", "Shop floor", "Reception"],
  Dome: ["Indoor corridors", "Shop till area", "Office floor"],
  "PT Dome": ["Shop till area", "Wide indoor spaces", "Following movement"],
  "Mini PT": ["Yard and forecourt", "Following movement"],
  Varifocal: ["Long driveways", "Fixed viewpoint over a distance"],
  "Solar PT": ["Farms and boreholes", "Construction sites", "No power, no cabling"],
  "Solar PT Dual": ["Construction sites", "Wide open ground", "No power, no cabling"],
  Battery: ["Nanny and childcare", "Rooms with no cabling", "Short-let and rental"],
  "Indoor Fixed": ["Nanny and childcare", "Indoor rooms", "Shop counter"],
};

const CAMERA_CATEGORIES = new Set([
  "IP Camera",
  "Analog Camera",
  "PTZ Camera",
  "Solar 4G Camera",
  "Smart Home Camera",
]);

export type BuildItemsResult = {
  items: NewItem[];
  /** Rows whose CSV retail column disagrees with our own markup rule. */
  priceWarnings: string[];
};

export function buildItems(
  rows: CatalogRow[],
  context: {
    categoryIdBySlug: Map<string, string>;
    brandIdBySlug: Map<string, string>;
    brandNameBySlug: Map<string, string>;
  },
): BuildItemsResult {
  const items: NewItem[] = [];
  const priceWarnings: string[] = [];
  const seenSlugs = new Map<string, string>();

  for (const row of rows) {
    if (SERVICE_SKUS.has(row.sku)) continue;

    const where = `${row.sku} (line ${row.line})`;

    const categorySlug = csvCategoryToSlug[row.category];
    if (!categorySlug) {
      throw new Error(`${where}: CSV category "${row.category}" is not mapped in taxonomy.ts`);
    }
    const categoryId = context.categoryIdBySlug.get(categorySlug);
    if (!categoryId) throw new Error(`${where}: category ${categorySlug} was not seeded`);

    if (!(row.brand in csvBrandToSlug)) {
      throw new Error(`${where}: CSV brand "${row.brand}" is not mapped in taxonomy.ts`);
    }
    const brandSlug = csvBrandToSlug[row.brand];
    const brandId = brandSlug ? (context.brandIdBySlug.get(brandSlug) ?? null) : null;
    const brandName = brandSlug ? (context.brandNameBySlug.get(brandSlug) ?? null) : null;

    const { basis, retailIsCeiling } = mapPriceBasis(row.price_basis, where);
    const supplierPrice = parseKes(row.supplier_price_kes, `${where} supplier_price_kes`);
    const retailPrice = parseKes(row.retail_price_kes, `${where} retail_price_kes`);

    const costPrice = basis === "owner_sell_price" ? null : supplierPrice;
    const priceOverride = basis === "owner_sell_price" ? retailPrice : null;
    const marketCeilingPrice = retailIsCeiling ? retailPrice : null;

    // The CSV carries the owner's own retail column. Where it is meant to be
    // cost x 1.40 it should equal what we compute; if it does not, one of the
    // two is wrong and the seed says so rather than picking a winner.
    if (basis === "distributor" && !retailIsCeiling && costPrice !== null && retailPrice !== null) {
      const computed = markedUpPrice(costPrice, "1.40");
      if (computed !== retailPrice) {
        priceWarnings.push(
          `${where}: CSV retail is ${retailPrice} but cost ${costPrice} x 1.40 rounds to ${computed}`,
        );
      }
    }

    const heldBack = UNPUBLISHED_PENDING_OWNER[row.sku];
    const published = basis === "distributor" && heldBack === undefined;

    const slug = itemSlug(brandName, row.sku);
    const clash = seenSlugs.get(slug);
    if (clash) throw new Error(`slug collision: ${row.sku} and ${clash} both give "${slug}"`);
    seenSlugs.set(slug, row.sku);

    const internalNote = [heldBack, row.notes].filter(Boolean).join(" | ") || null;

    items.push({
      sku: row.sku,
      slug,
      name: row.name,
      brandId,
      categoryId,
      shortDescription: shortDescriptionFrom(row.key_specs, row.name),
      description: null,
      useCases: CAMERA_CATEGORIES.has(row.category)
        ? (USE_CASES_BY_FORM_FACTOR[row.form_factor] ?? [])
        : [],
      specs: parseSpecs({
        sku: row.sku,
        brandName,
        formFactor: row.form_factor,
        keySpecs: row.key_specs,
      }),
      costPrice,
      priceOverride,
      marketCeilingPrice,
      markupMultiplier: "1.40",
      priceBasis: basis,
      unit: unitFor(row),
      inStock: true,
      isConsumable: row.category === "Cable",
      internalNote,
      published,
    });
  }

  return { items, priceWarnings };
}

/**
 * "Works with" edges, by category rather than by hand.
 *
 * A camera page should answer "what do I record this on", and a recorder page
 * "what do I put in it". Two rules cover the whole seed:
 *   analog cameras  → every DVR
 *   IP cameras      → every NVR, the PoE switch, the Cat6 cable
 *   recorders       → the surveillance drives
 * The UI caps how many it shows and links to the category for the rest.
 */
export function buildCompatibility(
  seeded: { id: string; sku: string; categorySlug: string; published: boolean }[],
): Map<string, string[]> {
  const published = seeded.filter((item) => item.published);
  const idsIn = (slug: string) => published.filter((i) => i.categorySlug === slug).map((i) => i.id);

  const recorders = idsIn("recorders");
  const storage = idsIn("storage");
  const network = published.filter(
    (i) => i.categorySlug === "networking-structured-cabling" && /LN6|3E1526P/.test(i.sku),
  );

  const dvrIds = published.filter((i) => /^DVR-/.test(i.sku)).map((i) => i.id);
  const nvrIds = published
    .filter((i) => /^DS-7\d|^NK\d/.test(i.sku) && recorders.includes(i.id))
    .map((i) => i.id);

  const edges = new Map<string, string[]>();
  for (const item of published) {
    switch (item.categorySlug) {
      case "analog-cameras":
        edges.set(item.id, [...dvrIds, ...storage]);
        break;
      case "ip-cameras":
      case "ptz":
        edges.set(item.id, [...nvrIds, ...network.map((n) => n.id), ...storage]);
        break;
      case "recorders":
        edges.set(item.id, storage);
        break;
      default:
        break;
    }
  }
  return edges;
}

/**
 * Cheaper and dearer swaps, for the item page and for the builder's "budget
 * alternative" (Sprint 2): the nearest three published items by price within
 * the same category.
 */
export function buildAlternatives(
  seeded: { id: string; categorySlug: string; price: number | null; published: boolean }[],
): Map<string, string[]> {
  const byCategory = new Map<string, typeof seeded>();
  for (const item of seeded) {
    if (!item.published || item.price === null) continue;
    const bucket = byCategory.get(item.categorySlug) ?? [];
    bucket.push(item);
    byCategory.set(item.categorySlug, bucket);
  }

  const edges = new Map<string, string[]>();
  for (const bucket of byCategory.values()) {
    for (const item of bucket) {
      const nearest = bucket
        .filter((other) => other.id !== item.id)
        .sort(
          (a, b) =>
            Math.abs((a.price as number) - (item.price as number)) -
            Math.abs((b.price as number) - (item.price as number)),
        )
        .slice(0, 3)
        .map((other) => other.id);
      if (nearest.length > 0) edges.set(item.id, nearest);
    }
  }
  return edges;
}

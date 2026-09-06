/**
 * The parts a bill of materials needs that the owner's price list does not
 * carry yet.
 *
 * docs/01 §3 is explicit about what a Solution must include: "cable, HDD, PSU,
 * adapter boxes, baluns, connectors, junction boxes, trunking, clips, brackets".
 * docs/07-catalog-seed.csv has the cameras, the recorders, the drives, Cat6 and
 * a 24-port switch. It has none of the rest, and a bill of materials with holes
 * in it is not the product — the whole differentiator is that the arithmetic is
 * complete and totals to one number (docs/01 §1).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *  READ THIS BEFORE TRUSTING THESE NUMBERS
 *
 *  Every cost_price below is an ESTIMATE at prevailing Mombasa trade rates, not
 *  a figure from the owner's distributor. They carry price_basis = 'placeholder'
 *  and are marked as provisional everywhere they are shown: on the item page, in
 *  the catalogue table, and against their line in every BOM, which also states
 *  what share of the total they account for.
 *
 *  They are ordinary editable rows, exactly as CLAUDE.md §2.7 requires — the
 *  owner replaces them from admin, or by editing this file and re-seeding, and
 *  every package re-prices. docs/09 item 29 tracks it.
 *
 *  They are published rather than held back because a bill of materials that
 *  omits its consumables understates the job and teaches the buyer to distrust
 *  the total, which is worse than a marked estimate. The equipment and labour
 *  figures — the ones that decide a sale — are the owner's own throughout.
 *
 *  The share is not small: on the Home Colour 4 it is 36% of the total, because
 *  cable and trunking are large lines. Two SKUs carry most of it — the RG59
 *  siamese box and the 2 m trunking length. Real prices for those two alone drop
 *  the estimated share to about 11%.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Pack sizes are how these are actually bought, and that matters here: the
 * ×1.40 markup rounds to the nearest 100 KES (CLAUDE.md §5), so a KES 40
 * connector would land at KES 100 and a 16-camera job would carry KES 6,400 of
 * connectors instead of KES 3,600. Priced per pack, the rounding lands where it
 * should.
 */
import type { ItemUnit, NewItem } from "../schema";

export type ConsumableSeed = {
  sku: string;
  name: string;
  categorySlug: string;
  /** Estimated distributor cost, KES, VAT-exclusive. */
  costPrice: number;
  unit: ItemUnit;
  shortDescription: string;
  specs: { label: string; value: string; group: string }[];
  isConsumable: boolean;
  /** Why this estimate, and what the owner should check. */
  internalNote: string;
};

export const consumableSeed: ConsumableSeed[] = [
  {
    sku: "CAB-RG59-SIAM-305",
    name: "RG59 Siamese Coaxial + Power Cable, 305 m Box",
    categorySlug: "cctv-accessories",
    costPrice: 6000,
    unit: "roll_305m",
    shortDescription: "RG59 coax + 2-core power / 305 m box / copper-clad steel core",
    specs: [
      { label: "Type", value: "RG59 siamese (video + power in one run)", group: "Overview" },
      { label: "Length", value: "305 m box", group: "Overview" },
      { label: "Use", value: "Analog Turbo HD camera runs", group: "Overview" },
    ],
    isConsumable: true,
    internalNote:
      "ESTIMATE at Mombasa trade rates. Confirm against your own supplier. Kenyan retail runs 8,000-11,000 a box.",
  },
  {
    sku: "BAL-VID-PR",
    name: "Passive Video Balun, Pair",
    categorySlug: "cctv-accessories",
    costPrice: 250,
    unit: "pair",
    shortDescription: "Passive / HD-TVI, AHD, CVI / up to 300 m / screw terminal",
    specs: [
      { label: "Type", value: "Passive video balun", group: "Overview" },
      { label: "Supports", value: "HD-TVI, AHD, CVI, CVBS", group: "Overview" },
      { label: "Sold as", value: "Transmitter and receiver pair", group: "Overview" },
    ],
    isConsumable: true,
    internalNote: "ESTIMATE. One pair per analog camera where the run is UTP rather than coax.",
  },
  {
    sku: "CON-BNC-10",
    name: "BNC Connectors, Pack of 10",
    categorySlug: "cctv-accessories",
    costPrice: 400,
    unit: "box",
    shortDescription: "BNC male / twist-on / for RG59",
    specs: [
      { label: "Type", value: "BNC male, twist-on", group: "Overview" },
      { label: "Pack", value: "10 connectors", group: "Overview" },
    ],
    isConsumable: true,
    internalNote: "ESTIMATE. Priced per pack of 10 - the 100 KES rounding makes single-unit pricing meaningless on parts this cheap.",
  },
  {
    sku: "CON-DC-10",
    name: "DC Power Connectors, Pack of 10 Pairs",
    categorySlug: "cctv-accessories",
    costPrice: 350,
    unit: "box",
    shortDescription: "2.1 x 5.5 mm / male and female / screw terminal",
    specs: [
      { label: "Type", value: "DC pigtail, 2.1 x 5.5 mm", group: "Overview" },
      { label: "Pack", value: "10 male + 10 female", group: "Overview" },
    ],
    isConsumable: true,
    internalNote: "ESTIMATE. Priced per pack.",
  },
  {
    sku: "CON-RJ45-100",
    name: "Cat6 RJ45 Connectors, Pack of 100",
    categorySlug: "networking-structured-cabling",
    costPrice: 1200,
    unit: "box",
    shortDescription: "Cat6 / gold-plated / pass-through",
    specs: [
      { label: "Type", value: "RJ45 Cat6, gold-plated", group: "Overview" },
      { label: "Pack", value: "100 connectors", group: "Overview" },
    ],
    isConsumable: true,
    internalNote: "ESTIMATE. Priced per pack of 100.",
  },
  {
    sku: "PSU-12V10A",
    name: "12V 10A Boxed CCTV Power Supply, 8-Way",
    categorySlug: "cctv-accessories",
    costPrice: 2200,
    unit: "each",
    shortDescription: "12V DC / 10A / 8 fused outputs / lockable metal box",
    specs: [
      { label: "Output", value: "12V DC, 10A", group: "Power" },
      { label: "Channels", value: "8 individually fused outputs", group: "Power" },
      { label: "Enclosure", value: "Lockable metal box", group: "Build" },
    ],
    isConsumable: false,
    internalNote: "ESTIMATE. Sized by cameras_per_psu_12v_10a (8 cameras per unit).",
  },
  {
    sku: "PSU-12V2A",
    name: "12V 2A Camera Power Adapter",
    categorySlug: "cctv-accessories",
    costPrice: 450,
    unit: "each",
    shortDescription: "12V DC / 2A / single camera / centre-positive",
    specs: [
      { label: "Output", value: "12V DC, 2A", group: "Power" },
      { label: "Use", value: "Single camera, short run", group: "Power" },
    ],
    isConsumable: false,
    internalNote: "ESTIMATE. For one-camera and nanny-cam installs.",
  },
  {
    sku: "JB-CAM",
    name: "Camera Junction / Adapter Box",
    categorySlug: "cctv-accessories",
    costPrice: 180,
    unit: "each",
    shortDescription: "Plastic / wall or soffit mount / hides the cable tails",
    specs: [
      { label: "Use", value: "One per camera position", group: "Overview" },
      { label: "Mount", value: "Wall or soffit", group: "Build" },
    ],
    isConsumable: false,
    internalNote: "ESTIMATE. One per camera, per junction_box_per_camera.",
  },
  {
    sku: "JB-CAM-IP66",
    name: "Sealed Outdoor Junction Box, IP66",
    categorySlug: "cctv-accessories",
    costPrice: 450,
    unit: "each",
    shortDescription: "IP66 / gasket-sealed / UV-stable / coastal installs",
    specs: [
      { label: "Ingress protection", value: "IP66, gasket-sealed", group: "Build" },
      { label: "Use", value: "Salt air and driven rain", group: "Build" },
    ],
    isConsumable: false,
    internalNote:
      "ESTIMATE. The coast-spec package uses these instead of the plain box - salt air gets into an unsealed joint within a season.",
  },
  {
    sku: "TRUNK-25X16-2M",
    name: "PVC Trunking 25 x 16 mm, 2 m Length",
    categorySlug: "cable-management",
    costPrice: 250,
    unit: "length_2m",
    shortDescription: "25 x 16 mm / self-adhesive back / white PVC",
    specs: [
      { label: "Size", value: "25 x 16 mm", group: "Overview" },
      { label: "Length", value: "2 m per length", group: "Overview" },
    ],
    isConsumable: true,
    internalNote: "ESTIMATE. Quantity from trunking_m_per_camera, sold in 2 m lengths.",
  },
  {
    sku: "CLIP-CABLE-100",
    name: "Cable Clips, Pack of 100",
    categorySlug: "cable-management",
    costPrice: 250,
    unit: "box",
    shortDescription: "Nail-in / sized for RG59 and Cat6 / pack of 100",
    specs: [
      { label: "Type", value: "Nail-in cable clip", group: "Overview" },
      { label: "Pack", value: "100 clips", group: "Overview" },
    ],
    isConsumable: true,
    internalNote: "ESTIMATE. Priced per pack.",
  },
  {
    sku: "SW-POE-8",
    name: "8-Port PoE Switch, 120W",
    categorySlug: "networking-structured-cabling",
    costPrice: 6500,
    unit: "each",
    shortDescription: "8 PoE ports / 120W budget / 2 uplinks / unmanaged",
    specs: [
      { label: "Ports", value: "8 PoE + 2 uplink", group: "Capacity" },
      { label: "Power budget", value: "120W", group: "Power" },
      { label: "Standard", value: "802.3af / at", group: "Network" },
    ],
    isConsumable: false,
    internalNote:
      "ESTIMATE. The catalogue only carries the 24-port DS-3E1526P, which is far too much switch for a 4-camera house.",
  },
  {
    sku: "SW-POE-16",
    name: "16-Port PoE Switch, 250W",
    categorySlug: "networking-structured-cabling",
    costPrice: 14000,
    unit: "each",
    shortDescription: "16 PoE ports / 250W budget / 2 uplinks + SFP",
    specs: [
      { label: "Ports", value: "16 PoE + 2 uplink + SFP", group: "Capacity" },
      { label: "Power budget", value: "250W", group: "Power" },
      { label: "Standard", value: "802.3af / at", group: "Network" },
    ],
    isConsumable: false,
    internalNote: "ESTIMATE. Confirm against the Hikvision equivalent before publishing a quote on it.",
  },
  {
    sku: "SD-64GB",
    name: "64 GB Surveillance microSD Card",
    categorySlug: "cctv-accessories",
    costPrice: 900,
    unit: "each",
    shortDescription: "64 GB / high-endurance / continuous write",
    specs: [
      { label: "Capacity", value: "64 GB", group: "Storage" },
      { label: "Type", value: "High-endurance microSD, continuous write", group: "Storage" },
    ],
    isConsumable: false,
    internalNote: "ESTIMATE. Used by the nanny-cam and solar packages, which record on-camera.",
  },
  {
    sku: "MNT-POLE-SOLAR",
    name: "Solar Camera Pole Mount Bracket",
    categorySlug: "cctv-accessories",
    costPrice: 1500,
    unit: "each",
    shortDescription: "Galvanised / pole or wall / adjustable arm",
    specs: [
      { label: "Mount", value: "Pole or wall, adjustable arm", group: "Build" },
      { label: "Finish", value: "Galvanised", group: "Build" },
    ],
    isConsumable: false,
    internalNote: "ESTIMATE. For the wire-free solar packages, which mount away from a building.",
  },
];

/** Turns the seed list into item rows. */
export function buildConsumables(
  categoryIdBySlug: Map<string, string>,
  genericBrandId: string | null,
): NewItem[] {
  return consumableSeed.map((consumable) => {
    const categoryId = categoryIdBySlug.get(consumable.categorySlug);
    if (!categoryId) {
      throw new Error(`${consumable.sku}: category ${consumable.categorySlug} was not seeded`);
    }

    return {
      sku: consumable.sku,
      slug: consumable.sku.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: consumable.name,
      brandId: genericBrandId,
      categoryId,
      shortDescription: consumable.shortDescription,
      description: null,
      useCases: [],
      specs: consumable.specs,
      costPrice: consumable.costPrice,
      priceOverride: null,
      marketCeilingPrice: null,
      markupMultiplier: "1.40",
      // Marked provisional everywhere it is shown. See the header above.
      priceBasis: "placeholder" as const,
      unit: consumable.unit,
      inStock: true,
      isConsumable: consumable.isConsumable,
      internalNote: consumable.internalNote,
      published: true,
    };
  });
}

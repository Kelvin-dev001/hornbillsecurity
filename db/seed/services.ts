/**
 * The services table: the human work, and the recurring contracts.
 *
 * Two sources feed it. The labour and survey lines come from docs/02 §services,
 * and their prices are read out of pricing_rules and site_settings rather than
 * typed here — the BOM engine charges labour at labour_per_camera_point, so if
 * the published per-point price were a separate literal the two would drift and
 * a customer would find the difference.
 *
 * The rest come from docs/07-catalog-seed.csv: the rows that describe recurring
 * or installed work rather than a SKU. They are unpriced placeholders except
 * fuel monitoring, which the owner has set at 45,000 installed per vehicle
 * (docs/01 §7 and §8).
 */
import { slugify } from "../../lib/slug";
import type { NewService, ServicePricingUnit } from "../schema";
import type { CatalogRow } from "./csv";
import { parseKes } from "./csv";

type Context = {
  categoryIdBySlug: Map<string, string>;
  /** pricing_rules key → value, so labour prices have one source. */
  ruleValue: (key: string) => number;
  siteSurveyFee: number;
  siteSurveyDeliverable: string;
};

/** docs/07 form_factor → pricing unit, for the CSV-sourced service rows. */
const CSV_UNIT_TO_PRICING_UNIT: Record<string, ServicePricingUnit> = {
  "Per Year": "per_year",
  "Per Camera Per Month": "per_camera_per_month",
  "Per Month": "per_month",
  "Per Vehicle": "per_vehicle",
  "Per Tank": "per_tank",
  "Per Delegate": "per_delegate",
};

/** docs/07 category → our category slug, for the CSV-sourced service rows. */
const CSV_CATEGORY_TO_SLUG: Record<string, string> = {
  "Recurring Service": "maintenance-and-monitoring",
  Fleet: "gps-tracking-fleet",
  Training: "training",
  "Fuel Monitoring": "fuel-monitoring",
};

export function buildServices(serviceRows: CatalogRow[], context: Context): NewService[] {
  const categoryId = (slug: string) => {
    const id = context.categoryIdBySlug.get(slug);
    if (!id) throw new Error(`service seed: category ${slug} was not seeded`);
    return id;
  };

  const labourServices: NewService[] = [
    {
      slug: "site-survey",
      name: "Site survey",
      categoryId: categoryId("installation-and-commissioning"),
      pricingUnit: "fixed",
      price: context.siteSurveyFee,
      priceBasis: "owner_sell_price",
      // The framing matters commercially: nine Kenyan competitors offer a free
      // survey, so a bare fee reads as a worse deal. site_settings holds the
      // deliverable sentence, and it is quoted rather than restated here.
      description: context.siteSurveyDeliverable,
      inclusions: [
        "A written findings report",
        "Camera positions marked up",
        "The fee credited to your invoice",
      ],
      sortOrder: 10,
      published: true,
    },
    {
      slug: "camera-installation-point",
      name: "Camera installation, per point",
      categoryId: categoryId("cctv"),
      pricingUnit: "per_point",
      price: context.ruleValue("labour_per_camera_point"),
      priceBasis: "owner_sell_price",
      description:
        "One camera mounted, cabled, terminated, aimed and configured. Charged per camera position.",
      inclusions: [
        "Mounting and weather sealing",
        "Cable run and termination",
        "Aiming and focus",
        "Recorder configuration for the channel",
      ],
      sortOrder: 20,
      published: true,
    },
    {
      slug: "data-point-installation",
      name: "Data point installation",
      categoryId: categoryId("networking-structured-cabling"),
      pricingUnit: "per_point",
      price: context.ruleValue("labour_per_data_point"),
      priceBasis: "owner_sell_price",
      description: "One structured cabling outlet, run, terminated and tested.",
      inclusions: ["Cable run", "Faceplate and module", "Patch panel termination", "Link test"],
      sortOrder: 30,
      published: true,
    },
    {
      slug: "access-control-door",
      name: "Access control, per door",
      categoryId: categoryId("access-control-time-attendance"),
      pricingUnit: "per_door",
      price: context.ruleValue("labour_per_access_door"),
      priceBasis: "owner_sell_price",
      description: "Reader, lock, power and controller wiring for one door, configured and tested.",
      inclusions: ["Reader and lock fitting", "Power and controller wiring", "Enrolment and testing"],
      sortOrder: 40,
      published: true,
    },
    {
      slug: "electric-fence-installation",
      name: "Electric fence installation, per metre",
      categoryId: categoryId("electric-fencing"),
      pricingUnit: "per_metre",
      price: context.ruleValue("labour_per_fence_metre"),
      priceBasis: "owner_sell_price",
      description:
        "Installation labour per metre of perimeter: posts, insulators, wire tensioning, earth and commissioning.",
      inclusions: ["Post and insulator fitting", "Wire run and tensioning", "Earth", "Commissioning"],
      sortOrder: 50,
      published: true,
    },
    {
      slug: "commissioning-and-handover",
      name: "Commissioning and handover training",
      categoryId: categoryId("installation-and-commissioning"),
      pricingUnit: "fixed",
      price: null,
      priceBasis: "placeholder",
      description:
        "System walkthrough, phone app setup for everyone who needs it, and a handover of how to pull footage.",
      inclusions: [
        "Remote viewing set up on your phone",
        "How to export footage",
        "Retention and overwrite explained",
      ],
      sortOrder: 60,
      published: false,
      internalNote: "docs/02 lists this as fixed-price but gives no figure. Owner to price from admin.",
    },
  ];

  const csvServices: NewService[] = serviceRows.map((row) => {
    const where = `${row.sku} (line ${row.line})`;

    const pricingUnit = CSV_UNIT_TO_PRICING_UNIT[row.form_factor];
    if (!pricingUnit) throw new Error(`${where}: no pricing unit for "${row.form_factor}"`);

    const categorySlug = CSV_CATEGORY_TO_SLUG[row.category];
    if (!categorySlug) throw new Error(`${where}: no service category for "${row.category}"`);

    const isOwnerPrice = row.price_basis === "owner_sell_price";
    const price = isOwnerPrice
      ? parseKes(row.retail_price_kes, `${where} retail_price_kes`)
      : null;

    return {
      slug: slugify(row.name),
      name: row.name,
      categoryId: categoryId(categorySlug),
      pricingUnit,
      price,
      priceBasis: isOwnerPrice
        ? "owner_sell_price"
        : row.price_basis === "QUOTE REQUIRED"
          ? "quote_required"
          : "placeholder",
      description: row.key_specs.split(";").map((part) => part.trim()).filter(Boolean).join(". "),
      inclusions: row.key_specs.split(";").map((part) => part.trim()).filter(Boolean),
      sortOrder: 100 + row.line,
      published: isOwnerPrice,
      internalNote: row.notes || null,
    } satisfies NewService;
  });

  return [...labourServices, ...csvServices];
}

/**
 * The category tree and the brand list.
 *
 * Tree from docs/02 §categories, plus the entrance-control and screening
 * category added in docs/01 §2, and three categories the seed CSV needs a home
 * for (GPS and fleet, maintenance and monitoring, training) — all three are
 * confirmed service lines in docs/01 §2.
 *
 * Categories are seeded unpublished and published afterwards by the seed runner,
 * which publishes exactly those with published content and their ancestors. A
 * category page with nothing on it is worse than no page at all.
 */
import type { CategoryKind } from "../schema";

export type CategorySeed = {
  slug: string;
  name: string;
  parent: string | null;
  kind: CategoryKind;
  /** lucide-react icon name — resolved through lib/category-icons.ts. */
  icon: string;
  summary: string;
};

export const categorySeed: CategorySeed[] = [
  {
    slug: "cctv",
    name: "CCTV",
    parent: null,
    kind: "service",
    icon: "cctv",
    summary:
      "Analog and IP camera systems for homes, shops, offices and warehouses, quoted line by line.",
  },
  {
    slug: "analog-cameras",
    name: "Analog cameras",
    parent: "cctv",
    kind: "item_group",
    icon: "camera",
    summary:
      "Turbo HD cameras on coaxial cable. The cheapest credible way to cover a small property.",
  },
  {
    slug: "ip-cameras",
    name: "IP cameras",
    parent: "cctv",
    kind: "item_group",
    icon: "camera",
    summary:
      "Network cameras on Cat6, from 2MP to 8MP. Higher detail, longer cable runs, one wire per camera.",
  },
  {
    slug: "ptz",
    name: "PTZ and pan-tilt cameras",
    parent: "cctv",
    kind: "item_group",
    icon: "move",
    summary: "Cameras that pan, tilt and follow. For yards, forecourts and wide open ground.",
  },
  {
    slug: "solar-4g",
    name: "Solar and 4G cameras",
    parent: "cctv",
    kind: "item_group",
    icon: "sun",
    summary:
      "Battery and solar cameras on a SIM card. No mains, no trenching, no network at the site.",
  },
  {
    slug: "recorders",
    name: "DVRs and NVRs",
    parent: "cctv",
    kind: "item_group",
    icon: "monitor-play",
    summary:
      "The recorder decides how many cameras you can add and how long footage lasts. Match the channels to the plan, not to today.",
  },
  {
    slug: "storage",
    name: "Surveillance storage",
    parent: "cctv",
    kind: "item_group",
    icon: "hard-drive",
    summary:
      "Surveillance-grade drives built for continuous write. Sized by channels, resolution and retention days.",
  },
  {
    slug: "cctv-accessories",
    name: "CCTV accessories",
    parent: "cctv",
    kind: "item_group",
    icon: "plug",
    summary: "Sirens, power supplies and the parts every install needs and every quote forgets.",
  },
  {
    slug: "installation-and-commissioning",
    name: "Installation and commissioning",
    parent: null,
    kind: "service",
    icon: "clipboard-check",
    summary:
      "The work that is not a box: the site survey, the labour rates we charge per point, and handover.",
  },
  {
    slug: "electric-fencing",
    name: "Electric fencing",
    parent: null,
    kind: "service",
    icon: "zap",
    summary: "Energizers, wire, insulators and posts, priced per metre of perimeter.",
  },
  {
    slug: "razor-wire-perimeter",
    name: "Razor wire and perimeter",
    parent: null,
    kind: "service",
    icon: "fence",
    summary: "Razor wire, wall spikes and perimeter hardening.",
  },
  {
    slug: "gate-automation",
    name: "Gate automation",
    parent: null,
    kind: "service",
    icon: "door-open",
    summary: "Sliding and swing gate motors, remotes, loop detectors and access integration.",
  },
  {
    slug: "video-intercom",
    name: "Video intercom",
    parent: null,
    kind: "service",
    icon: "monitor-speaker",
    summary: "See and speak to whoever is at the gate, and open it from your phone.",
  },
  {
    slug: "access-control-time-attendance",
    name: "Access control and time attendance",
    parent: null,
    kind: "service",
    icon: "fingerprint",
    summary: "Doors, readers, biometrics and staff clocking.",
  },
  {
    slug: "fire-smoke-detection",
    name: "Fire and smoke detection",
    parent: null,
    kind: "service",
    icon: "flame",
    summary: "Detection, panels and sounders, with the compliance paperwork that goes with them.",
  },
  {
    slug: "networking-structured-cabling",
    name: "Networking and structured cabling",
    parent: null,
    kind: "service",
    icon: "network",
    summary:
      "Cat6, switches, access points and wireless links. The layer every IP camera depends on.",
  },
  {
    slug: "cable-management",
    name: "Cable management and containment",
    parent: null,
    kind: "service",
    icon: "cable",
    summary: "Trunking, conduit and clips. What separates a tidy install from a visible one.",
  },
  {
    slug: "radio-communications",
    name: "Two-way radio",
    parent: null,
    kind: "service",
    icon: "radio",
    summary: "Handsets, repeaters and POC network radios for sites, estates and security teams.",
  },
  {
    slug: "fuel-monitoring",
    name: "Fuel monitoring",
    parent: null,
    kind: "service",
    icon: "fuel",
    summary: "Tank-level sensing and telematics for vehicles, generators and static tanks.",
  },
  {
    slug: "gps-tracking-fleet",
    name: "GPS tracking and fleet",
    parent: null,
    kind: "service",
    icon: "map-pin",
    summary: "Vehicle tracking, geofencing and trip reporting. Pairs with fuel monitoring.",
  },
  {
    slug: "server-control-room",
    name: "Server and control room",
    parent: null,
    kind: "service",
    icon: "server",
    summary: "Racks, monitors, video walls and the room the whole system is watched from.",
  },
  {
    slug: "smart-home-nanny-cameras",
    name: "Smart home and nanny cameras",
    parent: null,
    kind: "service",
    icon: "house",
    summary:
      "Indoor Wi-Fi and battery cameras, set up and explained. Including what the law allows.",
  },
  {
    slug: "power-backup",
    name: "Power backup",
    parent: null,
    kind: "service",
    icon: "battery-charging",
    summary:
      "UPS, batteries and inverters. A coastal outage takes the cameras down with everything else.",
  },
  {
    slug: "entrance-control",
    name: "Entrance control and parking",
    parent: null,
    kind: "service",
    icon: "parking-meter",
    summary:
      "Boom barriers, turnstiles, rising bollards, ANPR and parking ticketing for estates, malls and the port corridor.",
  },
  {
    slug: "screening",
    name: "Screening and detection",
    parent: null,
    kind: "service",
    icon: "scan-search",
    summary:
      "Baggage X-ray scanners, walk-through and handheld metal detection for hotels, schools, banks and logistics.",
  },
  {
    slug: "maintenance-and-monitoring",
    name: "Maintenance and monitoring",
    parent: null,
    kind: "service",
    icon: "wrench",
    summary:
      "Annual maintenance contracts, cloud recording and remote monitoring. What keeps a system working after year one.",
  },
  {
    slug: "training",
    name: "Training",
    parent: null,
    kind: "service",
    icon: "graduation-cap",
    summary: "Practical CCTV installation and commissioning courses.",
  },
];

/**
 * docs/07-catalog-seed.csv `category` → our category slug.
 *
 * The CSV groups by product type; the site groups by what a buyer is shopping
 * for. Every distinct value in the CSV must appear here — the seed throws on an
 * unmapped one rather than quietly filing it somewhere plausible.
 */
export const csvCategoryToSlug: Record<string, string> = {
  "IP Camera": "ip-cameras",
  "Analog Camera": "analog-cameras",
  "PTZ Camera": "ptz",
  "Solar 4G Camera": "solar-4g",
  DVR: "recorders",
  NVR: "recorders",
  "NVR Kit": "recorders",
  Storage: "storage",
  Alarm: "cctv-accessories",
  Cable: "networking-structured-cabling",
  "Network Switch": "networking-structured-cabling",
  Router: "networking-structured-cabling",
  "Access Point": "networking-structured-cabling",
  "Range Extender": "networking-structured-cabling",
  "Wireless Bridge": "networking-structured-cabling",
  "Video Intercom": "video-intercom",
  "Gate Automation": "gate-automation",
  "Electric Fence": "electric-fencing",
  "Smart Home Camera": "smart-home-nanny-cameras",
  "Fuel Monitoring": "fuel-monitoring",
  Fleet: "gps-tracking-fleet",
  "Recurring Service": "maintenance-and-monitoring",
  Training: "training",
  "Entrance Control": "entrance-control",
  Screening: "screening",
};

export type BrandSeed = {
  slug: string;
  name: string;
  sortOrder: number;
};

/**
 * `is_authorised_partner` is not set here. The seed runner derives it from
 * site_settings.authorised_partner_brands, so the brand badge on an item page
 * and the claim in the footer cannot disagree (CLAUDE.md §9).
 *
 * Dahua, Tiandy and Uniview have no items in the seed CSV yet; they are listed
 * because the owner supplies them and the brand facet only shows brands that
 * have published items.
 */
export const brandSeed: BrandSeed[] = [
  { slug: "hikvision", name: "Hikvision", sortOrder: 10 },
  { slug: "dahua", name: "Dahua", sortOrder: 20 },
  { slug: "tiandy", name: "Tiandy", sortOrder: 30 },
  { slug: "ezviz", name: "EZVIZ", sortOrder: 40 },
  { slug: "uniview", name: "Uniview", sortOrder: 50 },
  { slug: "tenda", name: "Tenda", sortOrder: 60 },
  { slug: "generic", name: "Unbranded / OEM", sortOrder: 90 },
];

/** docs/07 `brand` → brand slug. "Service" rows carry no brand at all. */
export const csvBrandToSlug: Record<string, string | null> = {
  Hikvision: "hikvision",
  EZVIZ: "ezviz",
  Tenda: "tenda",
  Generic: "generic",
  Service: null,
};

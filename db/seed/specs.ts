/**
 * Turns the `key_specs` column of docs/07-catalog-seed.csv into the grouped
 * rows SpecTable renders as a real <table>.
 *
 * The CSV holds a semicolon-separated list of claims — "4MP; 30m; Smart Hybrid
 * Light; two-way audio; IP67" — which is how the supplier writes them and is
 * fine for a human but useless as a table. Each fragment is matched against the
 * rules below to get a label and a group; anything unmatched is collected into
 * one "Other features" row rather than a column of rows all labelled the same.
 *
 * The result is stored in items.specs as jsonb, so from Sprint 4 the owner edits
 * it in admin and this parser never touches it again.
 */
import type { ItemSpec } from "../schema";

type Rule = {
  test: RegExp;
  label: string;
  group: string;
};

/** Separator for the group+label map key. Neither part contains it. */
const KEY_SEPARATOR = "~~";

/** First match wins, so the order here is the priority order. */
const RULES: Rule[] = [
  {
    test: /^\d+(\.\d+)?\s*MP\b|^\d\+\d\s*MP|^1080p|^AC\d+|^N300\b/i,
    label: "Resolution",
    group: "Imaging",
  },
  {
    test: /\bmotorized varifocal\b|^\d+(\.\d+)?(-\d+(\.\d+)?)?\s*mm\b/i,
    label: "Lens",
    group: "Imaging",
  },
  { test: /\bWDR\b|\b3D DNR\b|\bH\.26\d\+?/i, label: "Image processing", group: "Imaging" },
  {
    test: /ColorVu|24\/7 colour|colour night vision/i,
    label: "Colour at night",
    group: "Night vision",
  },
  { test: /Smart Hybrid Light|white light/i, label: "Illumination", group: "Night vision" },
  { test: /^\d+\s*m\b|\bEXIR\b|\bIR\b/i, label: "Night range", group: "Night vision" },
  {
    test: /two-way audio|built-in mic|mic \+ speaker|SoundMax|audio over coax|audio enabled/i,
    label: "Audio",
    group: "Audio and alarm",
  },
  {
    test: /siren|strobe|audio alarm|deterrence/i,
    label: "Deterrence",
    group: "Audio and alarm",
  },
  {
    test: /human (&|and) vehicle detection|person (&|and) vehicle|AcuSense|AcuSeek|AcuSearch|Motion Detection|human shape|smart tracking|auto-tracking|auto-zoom|face capture|perimeter protection|threat detection|dual energy|detection zones|number plate|ANPR|whitelist/i,
    label: "Detection",
    group: "Detection and analytics",
  },
  {
    test: /\bpan\b|\btilt\b|\d+\s*deg\b|bidirectional|people per minute/i,
    label: "Movement",
    group: "Detection and analytics",
  },
  {
    test: /SD to \d+\s*GB|microSD|SATA|onboard storage|surveillance-grade|continuous write/i,
    label: "Storage",
    group: "Storage",
  },
  {
    test: /\d+\s*-?\s*ch\b|\bchannel\b|\bCH\b|\bports?\b|max \d+ (door|indoor)|concurrent users/i,
    label: "Capacity",
    group: "Capacity",
  },
  {
    test: /PoE|802\.3af|power budget|\d+\s*W\b|12V|\d+V-\d+V|mAh|battery|solar|low-power|Ah\b/i,
    label: "Power",
    group: "Power",
  },
  {
    test: /4G|Wi-?Fi|WIFI|802\.11|dual[- ]band|\bLAN\b|\bSIM\b|Mbps|Gbps|MIMO|antenna|\bkm\b|VLAN|SNMP|QoS|DHCP|ARP|loop prevention|surge|IPv6|WISP|SFP|uplink/i,
    label: "Network",
    group: "Network",
  },
  {
    test: /Hik-Connect|P2P|app control|app management|mobile web|remote access|remote playback|cloud dashboard|web and app|visualised topology|one-press|plug and play|self-diagnostics|operator console|easy setup|alarm push|receipt printing|ticket|barcode|barrier release|integrat/i,
    label: "Remote access and integration",
    group: "Software",
  },
  {
    test: /IP6\d|IPX?\d|IK\d\d|weather|vandal|flame retardant|RoHS|tensile|pure copper|aluminium|heavy duty|industrial|conveyor|pedestal|magnetic base|joint bracket|fail-safe|metal chassis|plastic|hydraulic|anti-ram|boom|tunnel|penetration/i,
    label: "Build",
    group: "Build",
  },
  { test: /Fluke test/i, label: "Testing", group: "Build" },
  { test: /warranty/i, label: "Warranty", group: "Commercial" },
  {
    test: /installation|calibration|certificate|training|visits|report|priority response|parts excluded|retention|escalation|geofencing|idling|cleaning|realignment|firmware|health check|diagnostics|verification|encrypted/i,
    label: "Included",
    group: "What is included",
  },
];

/** Groups appear in this order; anything unlisted falls to the end. */
const GROUP_ORDER = [
  "Overview",
  "Imaging",
  "Night vision",
  "Detection and analytics",
  "Audio and alarm",
  "Capacity",
  "Storage",
  "Power",
  "Network",
  "Software",
  "Build",
  "What is included",
  "Commercial",
  "Other",
];

function classify(fragment: string): Rule | null {
  return RULES.find((rule) => rule.test.test(fragment)) ?? null;
}

function tidy(fragment: string): string {
  return fragment.trim().replace(/\s+/g, " ");
}

function groupRank(group: string): number {
  const index = GROUP_ORDER.indexOf(group);
  return index === -1 ? GROUP_ORDER.length : index;
}

export function parseSpecs(options: {
  sku: string;
  brandName: string | null;
  formFactor: string;
  keySpecs: string;
}): ItemSpec[] {
  const { sku, brandName, formFactor, keySpecs } = options;

  const overview: ItemSpec[] = [{ label: "Model", value: sku, group: "Overview" }];
  if (brandName) overview.push({ label: "Brand", value: brandName, group: "Overview" });
  if (formFactor) overview.push({ label: "Type", value: formFactor, group: "Overview" });

  const grouped = new Map<string, { label: string; group: string; values: string[] }>();
  const unmatched: string[] = [];

  for (const raw of keySpecs.split(";")) {
    const fragment = tidy(raw);
    if (!fragment) continue;

    const rule = classify(fragment);
    if (!rule) {
      unmatched.push(fragment);
      continue;
    }

    const key = [rule.group, rule.label].join(KEY_SEPARATOR);
    const entry = grouped.get(key) ?? { label: rule.label, group: rule.group, values: [] };
    entry.values.push(fragment);
    grouped.set(key, entry);
  }

  const classified: ItemSpec[] = [...grouped.values()].map((entry) => ({
    label: entry.label,
    value: entry.values.join(" / "),
    group: entry.group,
  }));

  if (unmatched.length > 0) {
    classified.push({
      label: "Other features",
      value: unmatched.join(" / "),
      group: "Other",
    });
  }

  return [...overview, ...classified].sort((a, b) => groupRank(a.group) - groupRank(b.group));
}

/**
 * The one-line summary under an item's name, on cards and in listings.
 *
 * The first three claims from the supplier's own list, verbatim. Deliberately
 * not generated prose: "4MP / 30m / Smart Hybrid Light" is scannable, is true,
 * and cannot drift from the spec table the way a written sentence would.
 */
export function shortDescriptionFrom(keySpecs: string, fallback: string): string {
  const fragments = keySpecs.split(";").map(tidy).filter(Boolean).slice(0, 3);
  return fragments.length > 0 ? fragments.join(" / ") : fallback;
}

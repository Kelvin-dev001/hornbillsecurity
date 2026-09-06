/**
 * Turning six answers into a CCTV system.
 *
 * This is the only place that decides which camera, which recorder, how much
 * cable and how big a disk. Both paths through the product call it, so a
 * packaged Solution and a system built in /build/cctv cannot disagree:
 *
 *   - db/seed/solutions.ts calls it with fixed answers and persists the result
 *     as solution_lines;
 *   - app/build/cctv calls it per request with the visitor's answers.
 *
 * Every quantity leaves here as a FORMULA over pricing_rules, never a number
 * (docs/01 §6). Tune cable_m_per_camera_residential in admin and all seventeen
 * packages and every builder result re-price together.
 */
import type { BomLineInput } from "./bom";
import { sizeStorage, storageRuleKey, type StorageSizing } from "./storage";

export type CctvTechnology = "analog" | "ip";

export const PROPERTY_TYPES = [
  "home",
  "apartment",
  "shop",
  "office",
  "warehouse",
  "school",
  "estate",
  "farm",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/**
 * docs/01 §5 lists Mombasa / Nairobi / coast / upcountry. Nairobi is not offered
 * here: CLAUDE.md §1 makes a single line on the contact page the entire Nairobi
 * footprint, and travel_fee_nairobi is 0 anyway, so nothing is lost but a
 * contradiction.
 */
export const SITE_LOCATIONS = ["mombasa", "coast", "upcountry"] as const;
export type SiteLocation = (typeof SITE_LOCATIONS)[number];

/** Commercial properties get the longer cable-run assumption. */
const COMMERCIAL_PROPERTIES: PropertyType[] = [
  "shop",
  "office",
  "warehouse",
  "school",
  "estate",
  "farm",
];

export type CctvAnswers = {
  propertyType: PropertyType;
  cameras: number;
  outdoorCameras: number;
  technology: CctvTechnology;
  /** Colour at night drives ColorVu over EXIR. */
  colourAtNight: boolean;
  retentionDays: number;
  location: SiteLocation;
  /**
   * Salt air. Swaps the plain junction box for a sealed IP66 one — the coast
   * expertise no Nairobi firm can claim (docs/01 §4).
   */
  coastSpec?: boolean;
  /** Cheapest credible system rather than the technically correct one. */
  budget?: boolean;
  /**
   * No recorder and no cabling: a Wi-Fi or solar camera that records to a card
   * on board. The nanny-cam and wire-free packages in docs/01 §4.
   */
  standalone?: boolean;
};

export type CameraChoice = { sku: string; quantity: number; role: string };

export type CctvSelection = {
  cameras: CameraChoice[];
  /** null for a standalone camera that records to a card on board. */
  recorderSku: string | null;
  /** IP systems on an NVR without PoE ports need a switch. */
  poeSwitchSku: string | null;
  storage: StorageSizing | null;
  resolutionMp: number;
  channels: number;
  /** Plain-language reasons, shown beside the result. */
  rationale: string[];
};

export type SelectionOverrides = {
  /** A package whose camera mix is not one model repeated (docs/01 §4). */
  cameraMix?: CameraChoice[];
  recorderSku?: string;
};

// ── equipment selection ────────────────────────────────────────────────────

/** Analog cameras, cheapest credible first. */
const ANALOG_CAMERAS = {
  exirBullet: "DS-2CE16D0T-EXIPF",
  exirTurret: "DS-2CE76D0T-EXIPF",
  colourBullet: "DS-2CE10DF0T-LPFS",
  colourTurret: "DS-2CE70DF0T-LPFS",
  colourLongRange: "DS-2CE12DF0T-LFS",
  colourLongRange80: "DS-2CE19DF0T-LXTS",
  audioSirenBullet: "DS-2CE16D0T-LPXTS",
  ptDome: "DS-2CE70D0T-PTLTS",
} as const;

const IP_CAMERAS = {
  workhorse4mp: "DS-2CD1043G2-LIUF/SL",
  colour4mpBullet: "DS-2CD1047G3-LIU",
  colour4mpDome: "DS-2CD1147G3-LIU",
  deterrence4mp: "DS-2CD1047G2H-LIUF/SRB",
  colour8mpBullet: "DS-2CD2087G3-LI2UY",
  perimeter8mp: "DS-2CD2T86G2H-4I",
} as const;

/** Recorders by channel count. Metal chassis runs cooler — the seed's default. */
const ANALOG_RECORDERS: Record<number, { standard: string; budget: string; audio: string }> = {
  4: { standard: "DVR-7200-4", budget: "DVR-7100-4", audio: "DVR-TWA-M-4" },
  8: { standard: "DVR-7200-8", budget: "DVR-7100-8", audio: "DVR-TWA-M-8" },
  16: { standard: "DVR-7200-16", budget: "DVR-7100-16", audio: "DVR-TWA-M-16" },
  32: { standard: "DVR-7200-32", budget: "DVR-7200-32", audio: "DVR-7200-32" },
};

const NVR_8CH_NO_POE = "DS-7608NXI-K2/VPro";
const NVR_32CH_16POE = "DS-7632NXI-K2/16P/VPro";

/** The recorder must have at least as many channels as there are cameras. */
export function channelsFor(cameras: number): number {
  for (const size of [4, 8, 16, 32]) {
    if (cameras <= size) return size;
  }
  return 32;
}

function poeSwitchFor(cameras: number, headroom: number): string | null {
  const ports = Math.ceil(cameras * headroom);
  if (ports <= 8) return "SW-POE-8";
  if (ports <= 16) return "SW-POE-16";
  return "DS-3E1526P-SI-24P2F";
}

export function selectEquipment(
  answers: CctvAnswers,
  options: {
    /** Published, priced items. Only sku is read, so the seed can pass rows. */
    available: { sku: string }[];
    rules: Record<string, number>;
  } & SelectionOverrides,
): CctvSelection {
  const { available, rules, cameraMix, recorderSku: recorderOverride } = options;
  const { cameras, technology, colourAtNight, budget } = answers;
  const commercial = COMMERCIAL_PROPERTIES.includes(answers.propertyType);
  const channels = channelsFor(cameras);
  const rationale: string[] = [];

  // A camera that records to its own card needs no recorder, no storage sizing
  // and no cabling — the whole point of the wire-free packages.
  if (answers.standalone) {
    if (!cameraMix || cameraMix.length === 0) {
      throw new Error("a standalone package must name its cameras explicitly");
    }
    rationale.push(
      "Records to a card in the camera, so there is no recorder, no cabling and nothing to trench.",
    );
    return {
      cameras: cameraMix,
      recorderSku: null,
      poeSwitchSku: null,
      storage: null,
      resolutionMp: 4,
      channels: cameras,
      rationale,
    };
  }

  let cameraChoices: CameraChoice[];
  let recorderSku: string;
  let poeSwitchSku: string | null = null;
  let resolutionMp: number;

  if (technology === "analog") {
    resolutionMp = 2;
    const sku = colourAtNight
      ? commercial
        ? ANALOG_CAMERAS.colourLongRange
        : ANALOG_CAMERAS.colourBullet
      : ANALOG_CAMERAS.exirBullet;

    cameraChoices = [{ sku, quantity: cameras, role: "Camera" }];
    recorderSku = budget
      ? ANALOG_RECORDERS[channels].budget
      : ANALOG_RECORDERS[channels].standard;

    rationale.push(
      colourAtNight
        ? "ColorVu cameras, so the footage is in colour after dark rather than grey infrared. On a 2MP analog system that is the difference between seeing a jacket and seeing a shape."
        : "EXIR infrared cameras. Cheapest credible system, but night footage is black and white — you will not get a clothing colour off it.",
    );
    rationale.push(
      budget
        ? "Plastic-chassis 7100 recorder to save money."
        : "Metal-chassis 7200 recorder. It runs cooler, which matters in Mombasa.",
    );
  } else {
    resolutionMp = 4;
    const sku = colourAtNight ? IP_CAMERAS.colour4mpBullet : IP_CAMERAS.workhorse4mp;
    cameraChoices = [{ sku, quantity: cameras, role: "Camera" }];

    // Only the 32-channel NVR in the catalogue carries PoE ports, so an 8-channel
    // system needs a separate switch to power the cameras.
    if (channels <= 8) {
      recorderSku = NVR_8CH_NO_POE;
      poeSwitchSku = poeSwitchFor(cameras, rules.poe_ports_headroom ?? 1.25);
      rationale.push(
        "The 8-channel NVR has no PoE ports, so a PoE switch powers the cameras over the same Cat6 that carries the video.",
      );
    } else {
      recorderSku = NVR_32CH_16POE;
      rationale.push("32-channel NVR with 16 PoE ports built in, so no separate switch is needed.");
    }

    rationale.push(
      colourAtNight
        ? "4MP ColorVu 3.0 — 24/7 colour and enough detail to read a plate at the gate."
        : "4MP Smart Hybrid Light. Infrared by default, white light when it detects a person or vehicle.",
    );
  }

  const gbPerChannelPerDay = rules[storageRuleKey(resolutionMp)];
  if (gbPerChannelPerDay === undefined) {
    throw new Error(`pricing rule ${storageRuleKey(resolutionMp)} is missing`);
  }

  const storage = sizeStorage({
    channels: cameras,
    gbPerChannelPerDay,
    retentionDays: answers.retentionDays,
    available,
  });
  rationale.push(storage.explanation);

  if (answers.coastSpec) {
    rationale.push(
      "Sealed IP66 junction boxes rather than the plain ones. Salt air gets into an unsealed joint within a season.",
    );
  }

  return {
    cameras: cameraMix ?? cameraChoices,
    recorderSku: recorderOverride ?? recorderSku,
    poeSwitchSku,
    storage,
    resolutionMp,
    channels,
    rationale,
  };
}

// ── the bill of materials ──────────────────────────────────────────────────

/**
 * `cameras` is the one variable a formula here needs that is not a pricing rule.
 * The seed and the builder both supply it, so the same formula string works for
 * a saved package and for a live answer.
 */
export const CAMERAS_VARIABLE = "cameras";

type LineSpec = {
  lineType: BomLineInput["lineType"];
  sku?: string;
  serviceSlug?: string;
  quantity?: number;
  formula?: string;
  note?: string;
};

/**
 * The complete line list, in the order it should read.
 *
 * The secondary and consumable lines are the ones that make this different from
 * every competitor's quote: docs/01 §3 calls them "what the job actually needs
 * and clients forget", and they are the reason a KES 72,000 package elsewhere
 * turns into KES 90,000 on the invoice.
 */
export function cctvLineSpecs(
  answers: CctvAnswers,
  selection: CctvSelection,
): LineSpec[] {
  if (answers.standalone) return standaloneLineSpecs(answers, selection);

  const commercial = COMMERCIAL_PROPERTIES.includes(answers.propertyType);
  const cableRule = commercial
    ? "cable_m_per_camera_commercial"
    : "cable_m_per_camera_residential";
  const cableMetres = `${CAMERAS_VARIABLE} * ${cableRule} * cable_wastage_factor`;
  const analog = answers.technology === "analog";
  const junctionBoxSku = answers.coastSpec ? "JB-CAM-IP66" : "JB-CAM";

  const specs: LineSpec[] = [];

  // Guaranteed by the early return above: only a standalone package has neither.
  const { recorderSku, storage } = selection;
  if (!recorderSku || !storage) {
    throw new Error("a wired package must have a recorder and sized storage");
  }

  // ── primary ──────────────────────────────────────────────────────────────
  for (const camera of selection.cameras) {
    specs.push({ lineType: "primary", sku: camera.sku, quantity: camera.quantity });
  }
  specs.push({ lineType: "primary", sku: recorderSku, quantity: 1 });
  specs.push({
    lineType: "primary",
    sku: storage.sku,
    quantity: storage.count,
    note: storage.explanation,
  });
  if (selection.poeSwitchSku) {
    specs.push({
      lineType: "primary",
      sku: selection.poeSwitchSku,
      quantity: 1,
      note: `Sized at ${CAMERAS_VARIABLE} × poe_ports_headroom, so the switch is not full the day it is installed.`,
    });
  }

  // ── secondary ────────────────────────────────────────────────────────────
  if (analog) {
    specs.push({
      lineType: "secondary",
      sku: "CAB-RG59-SIAM-305",
      formula: `ceil(${cableMetres} / 305)`,
      note: `${commercial ? "45" : "30"} m per camera plus a 15% wastage factor for drops and re-runs.`,
    });
    specs.push({
      lineType: "secondary",
      sku: "PSU-12V10A",
      formula: `ceil(${CAMERAS_VARIABLE} / cameras_per_psu_12v_10a)`,
      note: "One boxed supply per eight cameras.",
    });
  } else {
    specs.push({
      lineType: "secondary",
      sku: "DS-1LN6U-ZCO",
      formula: `ceil(${cableMetres} / 305)`,
      note: `${commercial ? "45" : "30"} m per camera plus a 15% wastage factor for drops and re-runs.`,
    });
  }

  specs.push({
    lineType: "secondary",
    sku: junctionBoxSku,
    formula: `ceil(${CAMERAS_VARIABLE} * junction_box_per_camera)`,
  });

  // ── consumables ──────────────────────────────────────────────────────────
  if (analog) {
    specs.push({
      lineType: "consumable",
      sku: "BAL-VID-PR",
      formula: `ceil(${CAMERAS_VARIABLE} * balun_pairs_per_analog_camera)`,
      note: "One pair per camera where the run is UTP rather than coax.",
    });
    specs.push({
      lineType: "consumable",
      sku: "CON-BNC-10",
      formula: `ceil(${CAMERAS_VARIABLE} * connectors_per_camera / 2 / 10)`,
      note: "BNC at both ends of every run, bought in tens.",
    });
    specs.push({
      lineType: "consumable",
      sku: "CON-DC-10",
      formula: `ceil(${CAMERAS_VARIABLE} * connectors_per_camera / 2 / 10)`,
      note: "DC pigtails at both ends of every run, bought in tens.",
    });
  } else {
    specs.push({
      lineType: "consumable",
      sku: "CON-RJ45-100",
      formula: `ceil(${CAMERAS_VARIABLE} * connectors_per_camera / 100)`,
      note: "Two terminations per run, plus spares for the ones that fail a test.",
    });
  }

  specs.push({
    lineType: "consumable",
    sku: "TRUNK-25X16-2M",
    formula: `ceil(${CAMERAS_VARIABLE} * trunking_m_per_camera / 2)`,
    note: "Containment on exposed runs, sold in 2 m lengths.",
  });
  specs.push({
    lineType: "consumable",
    sku: "CLIP-CABLE-100",
    formula: `ceil(${cableMetres} / 100)`,
    note: "Roughly one clip a metre on clipped runs, bought in hundreds.",
  });

  // ── labour ───────────────────────────────────────────────────────────────
  specs.push({
    lineType: "labour",
    serviceSlug: "camera-installation-point",
    formula: CAMERAS_VARIABLE,
    note: "Mounted, cabled, terminated, aimed and configured, per camera position.",
  });

  return specs;
}

/**
 * The bill for a camera that records to a card on board.
 *
 * No recorder, no drive, no cable, no trunking — the wire-free packages exist
 * precisely because a site has nothing to plug into. What remains is the
 * camera, the card it records to, a mount where there is no wall, and the
 * labour.
 *
 * The labour line is deliberately visible and at the full per-point rate.
 * CLAUDE.md §5: on consumer smart-home SKUs "accept thin hardware margin here
 * and price the installation, configuration and app onboarding as a visible
 * line item instead". A KES 3,500 camera that costs KES 3,000 to fit and set up
 * is what this business actually is, and hiding it inside the hardware price is
 * how competitors end up looking cheaper than they are.
 */
function standaloneLineSpecs(answers: CctvAnswers, selection: CctvSelection): LineSpec[] {
  const specs: LineSpec[] = [];
  const solar = selection.cameras.some((camera) => camera.sku.startsWith("DS-2CFSP"));

  for (const camera of selection.cameras) {
    specs.push({ lineType: "primary", sku: camera.sku, quantity: camera.quantity });
  }

  specs.push({
    lineType: "secondary",
    sku: "SD-64GB",
    formula: CAMERAS_VARIABLE,
    note: "One card per camera. Footage lives in the camera, so losing the camera loses the footage — cloud recording is the answer to that, and it is a monthly line.",
  });

  if (solar) {
    specs.push({
      lineType: "secondary",
      sku: "MNT-POLE-SOLAR",
      formula: CAMERAS_VARIABLE,
      note: "Pole mount, because these go where there is no building to fix to.",
    });
  }

  specs.push({
    lineType: "labour",
    serviceSlug: "camera-installation-point",
    formula: CAMERAS_VARIABLE,
    note: solar
      ? "Sited for sun and signal, mounted, commissioned, app set up on your phones."
      : "Mounted, connected to your Wi-Fi, app set up on the phones that need it.",
  });

  return specs;
}

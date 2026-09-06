/**
 * The launch package matrix from docs/01 §4.
 *
 * Each package is a saved Solution Builder configuration: the six answers, plus
 * the copy that makes it a page rather than a row. db/seed/index.ts runs the
 * answers through lib/pricing/cctv.ts — the same code /build/cctv uses — and
 * persists the resulting lines, so a package page and the builder cannot
 * disagree about what a system costs.
 *
 * docs/01 §4 lists 17 packages under three headings; the sprint plan calls it
 * "the 13 CCTV packages". All 17 in §4 are built, since §4 is the list.
 *
 * `notSuitableFor` is filled in for every one of them. CLAUDE.md §6: "Every
 * Solution states what it is not suitable for. Honesty about limits is the
 * strongest trust signal on the site and the most citable kind of sentence."
 */
import type { CctvAnswers } from "../../lib/pricing/cctv";
import type { SolutionTier } from "../schema";

export type SolutionSeed = {
  slug: string;
  name: string;
  tier: SolutionTier;
  answers: CctvAnswers;
  propertyTypes: string[];
  summary: string;
  description: string;
  bestFor: string[];
  notSuitableFor: string[];
  isBuilderTemplate: boolean;
  /** Overrides for the packages whose camera mix is not one model repeated. */
  cameraMix?: { sku: string; quantity: number; role: string }[];
  /** Overrides the recorder the generator would pick. */
  recorderSku?: string;
};

const HOME = ["home", "apartment"];
const RETAIL = ["shop"];
const COMMERCIAL = ["office", "warehouse", "school", "estate"];

export const solutionSeed: SolutionSeed[] = [
  // ── CCTV, analog (Turbo HD) ──────────────────────────────────────────────
  {
    slug: "home-essential-4-camera-analog-cctv",
    name: "Home Essential 4",
    tier: "essential",
    answers: {
      propertyType: "home",
      cameras: 4,
      outdoorCameras: 4,
      technology: "analog",
      colourAtNight: false,
      retentionDays: 14,
      location: "mombasa",
    },
    propertyTypes: HOME,
    summary:
      "The cheapest system we will actually install and stand behind. Four 2MP infrared cameras, a metal-chassis recorder, two weeks of footage.",
    description:
      "This is the entry point. It covers a gate, a driveway and two approaches on a small plot, records for a fortnight, and you can watch it on your phone. Night footage is infrared, so it is black and white — you will see that someone was there and what they did, but not the colour of their shirt. If that matters, the Home Colour 4 is the one to buy instead.",
    bestFor: [
      "A first system on a two- or three-bedroom house",
      "Landlords fitting several units to the same spec",
      "Replacing a dead system on existing cabling",
    ],
    notSuitableFor: [
      "Identifying a face or a number plate at more than about 10 m — 2MP does not carry that detail",
      "Anywhere you need colour at night; infrared footage is monochrome",
      "Sites with no mains power at the camera positions",
    ],
    isBuilderTemplate: true,
  },
  {
    slug: "home-colour-4-camera-colorvu-cctv",
    name: "Home Colour 4",
    tier: "standard",
    answers: {
      propertyType: "home",
      cameras: 4,
      outdoorCameras: 4,
      technology: "analog",
      colourAtNight: true,
      retentionDays: 14,
      location: "mombasa",
    },
    propertyTypes: HOME,
    summary:
      "The one most homes should buy. Four ColorVu cameras that stay in full colour after dark, on a metal recorder, with two weeks of footage.",
    description:
      "ColorVu keeps the picture in colour all night using a low-power white light rather than infrared. In practice that is the difference between a grey shape at the gate and a man in a red jacket — which is what makes footage useful to a police report or an insurer. Everything else matches the Home Essential.",
    bestFor: [
      "Most three- and four-bedroom homes",
      "Anyone who wants footage that identifies people, not just movement",
      "Gates and driveways where you need to see a vehicle colour",
    ],
    notSuitableFor: [
      "Reading a number plate on a moving car — that needs a dedicated ANPR camera",
      "Total darkness with no tolerance for a visible white light",
      "Coverage beyond about 20 m per camera; use the long-range ColorVu instead",
    ],
    isBuilderTemplate: true,
  },
  {
    slug: "home-deterrence-4-camera-siren-cctv",
    name: "Home Deterrence 4",
    tier: "standard",
    answers: {
      propertyType: "home",
      cameras: 4,
      outdoorCameras: 4,
      technology: "analog",
      colourAtNight: true,
      retentionDays: 14,
      location: "mombasa",
    },
    cameraMix: [{ sku: "DS-2CE16D0T-LPXTS", quantity: 4, role: "Camera" }],
    recorderSku: "DVR-TWA-M-4",
    propertyTypes: HOME,
    summary:
      "Four cameras with a built-in siren, strobe and speaker, on a two-way audio recorder. You talk to whoever is at the gate from your phone.",
    description:
      "Recording an intruder is worth less than stopping one. These cameras carry a strobe and a siren that trigger on a person, and a speaker you can talk through from the app. Most opportunists leave the moment a light comes on and a voice says something. The recorder is the two-way audio model, which is what makes talk-down work.",
    bestFor: [
      "Plots that have already been tested by someone",
      "Talking to a delivery or a visitor without opening the gate",
      "Households away for long stretches",
    ],
    notSuitableFor: [
      "Terraced or semi-detached properties where a siren will reach a neighbour's bedroom",
      "Sites needing silent monitoring",
      "Long-range identification — these are 25 m cameras",
    ],
    isBuilderTemplate: true,
  },
  {
    slug: "shop-duka-4-camera-cctv",
    name: "Shop / Duka 4",
    tier: "standard",
    answers: {
      propertyType: "shop",
      cameras: 4,
      outdoorCameras: 2,
      technology: "analog",
      colourAtNight: true,
      retentionDays: 30,
      location: "mombasa",
    },
    cameraMix: [
      { sku: "DS-2CE10DF0T-LPFS", quantity: 3, role: "Fixed ColorVu bullet" },
      { sku: "DS-2CE70D0T-PTLTS", quantity: 1, role: "Pan-tilt dome over the till" },
    ],
    recorderSku: "DVR-TWA-M-4",
    propertyTypes: RETAIL,
    summary:
      "Three fixed ColorVu cameras and one pan-tilt dome over the till, with a month of footage because shrinkage is found late.",
    description:
      "Shop losses are usually discovered days or weeks after they happen, which is why this package records for 30 days rather than 14. The pan-tilt dome sits over the till and can be driven from the app to follow a dispute; the three fixed cameras cover the door, the aisle and the store room. Two-way audio lets you speak into the shop from outside it.",
    bestFor: [
      "Dukas, pharmacies, hardware shops and small supermarkets",
      "Till disputes and stock shrinkage",
      "Owners who are not on site every day",
    ],
    notSuitableFor: [
      "Counting stock or reading barcodes on the shelf",
      "Shops over about 100 m²; four cameras will leave blind aisles",
      "Anywhere requiring PCI-compliant handling of card data on screen",
    ],
    isBuilderTemplate: false,
  },
  {
    slug: "business-8-camera-colorvu-cctv",
    name: "Business 8",
    tier: "standard",
    answers: {
      propertyType: "office",
      cameras: 8,
      outdoorCameras: 5,
      technology: "analog",
      colourAtNight: true,
      retentionDays: 30,
      location: "mombasa",
    },
    propertyTypes: COMMERCIAL,
    summary:
      "Eight long-range ColorVu cameras covering a compound and its approaches, a month of footage, on a two-way audio recorder.",
    description:
      "The standard SME system: perimeter, gate, parking, entrance, and the two or three internal points that matter. Long-range ColorVu means 40 m of usable colour coverage per camera rather than 20, which is what a compound needs. Thirty days of retention covers a monthly review cycle.",
    bestFor: [
      "Offices, workshops and yards on a single compound",
      "Businesses with staff, vehicles and stock to account for",
      "Anywhere an incident might not surface for weeks",
    ],
    notSuitableFor: [
      "Multi-building sites — those want IP and a switch per building",
      "Facial identification at the perimeter; use 4MP IP for that",
      "Sites needing more than 8 channels later; this recorder does not expand",
    ],
    isBuilderTemplate: true,
  },
  {
    slug: "commercial-16-camera-cctv",
    name: "Commercial 16",
    tier: "pro",
    answers: {
      propertyType: "warehouse",
      cameras: 16,
      outdoorCameras: 10,
      technology: "analog",
      colourAtNight: true,
      retentionDays: 30,
      location: "mombasa",
    },
    cameraMix: [
      { sku: "DS-2CE12DF0T-LFS", quantity: 12, role: "40 m ColorVu bullet" },
      { sku: "DS-2CE19DF0T-LXTS", quantity: 4, role: "80 m ColorVu, boundary" },
    ],
    propertyTypes: ["warehouse", "school", "estate"],
    summary:
      "Sixteen mixed ColorVu cameras — twelve at 40 m and four at 80 m for the boundary — with a month of footage.",
    description:
      "A warehouse, school or estate does not have one kind of view. Twelve 40 m cameras cover doors, aisles, parking and internal points; four 80 m cameras run the boundary, where the distances are long and the light is poor. All sixteen record for a month on one recorder.",
    bestFor: [
      "Warehouses, schools, gated estates and larger compounds",
      "Long boundary walls that shorter cameras cannot reach",
      "Sites where an incident is investigated weeks later",
    ],
    notSuitableFor: [
      "Number plate capture at the gate — that is a dedicated camera and a separate job",
      "Analytics like people counting or line crossing; those need AcuSense IP cameras",
      "Sites already cabled with Cat6 — go IP instead and reuse it",
    ],
    isBuilderTemplate: false,
  },

  // ── CCTV, IP ─────────────────────────────────────────────────────────────
  {
    slug: "home-ip-4-camera-4mp-cctv",
    name: "Home IP 4",
    tier: "standard",
    answers: {
      propertyType: "home",
      cameras: 4,
      outdoorCameras: 4,
      technology: "ip",
      colourAtNight: false,
      retentionDays: 14,
      location: "mombasa",
    },
    propertyTypes: HOME,
    summary:
      "Best value in IP. Four 4MP cameras on Cat6, an 8-channel NVR and a PoE switch, so one cable does video and power.",
    description:
      "4MP carries twice the detail of the analog systems, and one Cat6 run per camera carries both the video and the power. The Smart Hybrid Light cameras sit in infrared until they detect a person or vehicle, then switch to white light and colour — so you get colour when it counts without a light burning all night. The NVR has two drive bays, so retention can be extended later without replacing it.",
    bestFor: [
      "New builds and rewires where cable is going in anyway",
      "Anyone who wants to add cameras later — the NVR takes eight",
      "Recognising faces at a gate or door",
    ],
    notSuitableFor: [
      "Reusing existing coaxial cable; this needs Cat6 to each camera",
      "Sites with no route for a switch and its mains supply",
      "Budgets where the analog Home Colour 4 would do the job",
    ],
    isBuilderTemplate: true,
  },
  {
    slug: "home-ip-pro-4-camera-colorvu-cctv",
    name: "Home IP Pro 4",
    tier: "pro",
    answers: {
      propertyType: "home",
      cameras: 4,
      outdoorCameras: 4,
      technology: "ip",
      colourAtNight: true,
      retentionDays: 21,
      location: "mombasa",
    },
    propertyTypes: HOME,
    summary:
      "Four 4MP ColorVu 3.0 cameras on an AcuSeek NVR — you search the footage by describing what you are looking for.",
    description:
      "ColorVu 3.0 holds full colour all night. The AcuSeek recorder is the real difference: instead of scrubbing through hours of video you type what you are after — a man in a white shirt, a red car — and it finds the clips. Three weeks of retention on 4MP.",
    bestFor: [
      "Households that have actually had to find something in old footage",
      "Larger homes where three weeks of history is worth having",
      "Anyone who wants colour night footage at 4MP",
    ],
    notSuitableFor: [
      "Tight budgets — this is roughly double the analog equivalent",
      "Sites with no Cat6 route to each camera",
      "Number plate capture, which remains a specialist camera",
    ],
    isBuilderTemplate: true,
  },
  {
    slug: "villa-deterrence-6-camera-cctv",
    name: "Villa Deterrence 6",
    tier: "pro",
    answers: {
      propertyType: "home",
      cameras: 6,
      outdoorCameras: 6,
      technology: "ip",
      colourAtNight: true,
      retentionDays: 21,
      location: "mombasa",
    },
    cameraMix: [{ sku: "DS-2CD1047G2H-LIUF/SRB", quantity: 6, role: "Strobe and audio alarm" }],
    propertyTypes: ["home", "estate"],
    summary:
      "Six 4MP cameras with strobe and audio alarm covering a villa's full perimeter, on an AcuSeek NVR.",
    description:
      "Six cameras is what a villa with grounds actually needs: four elevations, the gate and the parking. Every one carries a strobe and a speaker that fire on a person, so the system intervenes rather than just recording. Three weeks of searchable footage.",
    bestFor: [
      "Villas and larger plots with grounds to cover",
      "Properties left empty for weeks at a time",
      "Owners who want an intruder challenged, not just filmed",
    ],
    notSuitableFor: [
      "Homes close enough to neighbours that a siren is a nuisance",
      "Indoor use — these are outdoor bullets",
      "Sites without a cable route to six positions",
    ],
    isBuilderTemplate: false,
  },
  {
    slug: "business-ip-8-camera-colorvu-cctv",
    name: "Business IP 8",
    tier: "pro",
    answers: {
      propertyType: "office",
      cameras: 8,
      outdoorCameras: 5,
      technology: "ip",
      colourAtNight: true,
      retentionDays: 30,
      location: "mombasa",
    },
    propertyTypes: COMMERCIAL,
    summary:
      "Eight 4MP ColorVu 3.0 cameras, an AcuSeek NVR and a 16-port PoE switch with room to grow.",
    description:
      "The commercial IP standard: 4MP colour on every camera, a month of retention, and a switch sized with headroom so the next four cameras do not mean a second switch. The AcuSeek search turns a two-hour footage review into a two-minute one.",
    bestFor: [
      "Offices, clinics and showrooms",
      "Sites that will add cameras within a year or two",
      "Anywhere staff need to find an incident quickly",
    ],
    notSuitableFor: [
      "Sites with no server cupboard or comms position for the switch and NVR",
      "Budgets better served by the analog Business 8",
      "Outdoor runs beyond 100 m without a mid-span switch",
    ],
    isBuilderTemplate: true,
  },
  {
    slug: "commercial-ip-16-camera-acusense-cctv",
    name: "Commercial IP 16",
    tier: "pro",
    answers: {
      propertyType: "warehouse",
      cameras: 16,
      outdoorCameras: 10,
      technology: "ip",
      colourAtNight: true,
      retentionDays: 30,
      location: "mombasa",
    },
    cameraMix: [
      { sku: "DS-2CD1047G3-LIU", quantity: 12, role: "4MP ColorVu 3.0" },
      { sku: "DS-2CD2087G3-LI2UY", quantity: 4, role: "8MP ColorVu, wide areas" },
    ],
    propertyTypes: ["warehouse", "school", "estate"],
    summary:
      "Sixteen mixed 4MP and 8MP AcuSense cameras on a 32-channel NVR with 16 PoE ports built in.",
    description:
      "Twelve 4MP cameras for doors, aisles and approaches, and four 8MP for the wide areas where one camera has to cover a yard. The 32-channel NVR has its PoE built in, so there is no separate switch, and it leaves sixteen channels free for the next phase.",
    bestFor: [
      "Warehouses, campuses and multi-building sites",
      "Phased installations that will double in size",
      "Sites needing analytics — line crossing, intrusion, people counting",
    ],
    notSuitableFor: [
      "Small sites; a 32-channel recorder is wasted below about twelve cameras",
      "Sites without a rack or ventilated cupboard for the NVR",
      "Reusing coaxial cable",
    ],
    isBuilderTemplate: false,
  },
  {
    slug: "perimeter-8mp-darkfighter-cctv",
    name: "Perimeter 8MP",
    tier: "pro",
    answers: {
      propertyType: "estate",
      cameras: 8,
      outdoorCameras: 8,
      technology: "ip",
      colourAtNight: false,
      retentionDays: 30,
      location: "mombasa",
    },
    cameraMix: [{ sku: "DS-2CD2T86G2H-4I", quantity: 8, role: "8MP 80 m DarkFighter" }],
    propertyTypes: ["estate", "warehouse", "farm"],
    summary:
      "Eight 8MP DarkFighter cameras with 80 m infrared, for boundaries where the distances beat ordinary cameras.",
    description:
      "A long boundary is a different problem from a house. These are 4K cameras with 80 m of infrared and face capture, built for perimeter runs where the nearest light is a hundred metres away. On a 32-channel NVR with the channels to extend the run later.",
    bestFor: [
      "Estate and farm boundaries",
      "Long yard and compound walls",
      "Detecting an approach before it reaches the building",
    ],
    notSuitableFor: [
      "Colour at night — DarkFighter is a low-light infrared camera, not ColorVu",
      "Short-range indoor use, where 8MP is wasted",
      "Sites without a cable route along the boundary",
    ],
    isBuilderTemplate: false,
  },

  // ── Specials ─────────────────────────────────────────────────────────────
  {
    slug: "nanny-cam-starter",
    name: "Nanny Cam Starter",
    tier: "essential",
    answers: {
      propertyType: "home",
      cameras: 1,
      outdoorCameras: 0,
      technology: "ip",
      colourAtNight: false,
      retentionDays: 7,
      location: "mombasa",
      standalone: true,
    },
    cameraMix: [{ sku: "C1C-B", quantity: 1, role: "Indoor Wi-Fi camera" }],
    propertyTypes: HOME,
    summary:
      "One indoor Wi-Fi camera, a memory card and the setup, so you can see the sitting room from your phone.",
    description:
      "The smallest thing we install. A 1080p indoor camera on your Wi-Fi, recording to a memory card in the camera rather than a recorder, with the app set up on the phones that need it. On the law: in Kenya you may film in your own home, but recording someone in a private space such as a bathroom or a live-in worker's own room is not lawful, and the ODPC's 2025 guidance expects anyone recorded to be told. Tell your staff. It is also the thing that keeps the footage usable if you ever need it.",
    bestFor: [
      "Watching a sitting room, nursery or kitchen while you are out",
      "Rented homes where you cannot run cable",
      "A first camera before committing to a full system",
    ],
    notSuitableFor: [
      "Outdoor use — this is an indoor camera with no weather rating",
      "Anywhere your Wi-Fi does not reach reliably",
      "Covert recording of staff, which is not lawful and not something we will help with",
    ],
    isBuilderTemplate: false,
  },
  {
    slug: "nanny-cam-plus",
    name: "Nanny Cam Plus",
    tier: "standard",
    answers: {
      propertyType: "home",
      cameras: 3,
      outdoorCameras: 0,
      technology: "ip",
      colourAtNight: false,
      retentionDays: 7,
      location: "mombasa",
      standalone: true,
    },
    cameraMix: [
      { sku: "C1C-B", quantity: 2, role: "Indoor Wi-Fi camera" },
      { sku: "CB1", quantity: 1, role: "Battery camera, no cable" },
    ],
    propertyTypes: HOME,
    summary:
      "Two indoor cameras and one battery camera you can put anywhere, with memory cards and the app set up.",
    description:
      "Two fixed indoor cameras cover the rooms that matter, and the battery camera goes wherever there is no socket — a store, a back door, a corridor — and moves when you need it to. Same legal position as the Starter: tell anyone who works in the house that the cameras are there.",
    bestFor: [
      "Covering two or three rooms without cabling",
      "A spot with no power, using the battery camera",
      "Households with staff, where being open about it is the point",
    ],
    notSuitableFor: [
      "Outdoor or covered-veranda positions",
      "Continuous 24/7 recording on the battery camera, which records on motion",
      "Homes with weak or intermittent Wi-Fi",
    ],
    isBuilderTemplate: false,
  },
  {
    slug: "wire-free-solar-4g-camera",
    name: "Wire-Free Solar 4G",
    tier: "standard",
    answers: {
      propertyType: "farm",
      cameras: 1,
      outdoorCameras: 1,
      technology: "ip",
      colourAtNight: true,
      retentionDays: 7,
      location: "coast",
      standalone: true,
    },
    cameraMix: [{ sku: "DS-2CFSP4/4G", quantity: 1, role: "Solar 4G pan-tilt camera" }],
    propertyTypes: ["farm", "estate"],
    summary:
      "A 4MP pan-tilt camera on a solar panel and a SIM card. No mains, no network, no trenching.",
    description:
      "For places with nothing to plug into: a borehole, a farm gate, a plot under construction. The camera runs off an 8W panel and a 9000mAh battery, connects over 4G, records to a card on board and pans to follow movement. You supply a data SIM or we set one up; expect a few hundred shillings a month of data on normal use.",
    bestFor: [
      "Farms, boreholes and construction sites",
      "Watching a plot with no power and no fibre",
      "Temporary coverage that moves when the job does",
    ],
    notSuitableFor: [
      "Continuous 24/7 recording — solar and battery mean event-triggered clips",
      "Deep shade, where the panel will not keep up",
      "Areas with no 4G coverage; check before ordering",
    ],
    isBuilderTemplate: false,
  },
  {
    slug: "holiday-home-airbnb-cctv",
    name: "Holiday Home / Airbnb",
    tier: "standard",
    answers: {
      propertyType: "home",
      cameras: 2,
      outdoorCameras: 2,
      technology: "ip",
      colourAtNight: true,
      retentionDays: 7,
      location: "coast",
      standalone: true,
    },
    cameraMix: [{ sku: "DS-2CFSP4/4G", quantity: 2, role: "Solar 4G pan-tilt camera" }],
    propertyTypes: ["home", "estate"],
    summary:
      "Two solar 4G cameras on the approaches to a coastal holiday home, viewable from anywhere, with caretaker access set up.",
    description:
      "Built for Diani and the south coast: a house that is empty most of the year, watched by an owner who is not in the country and a caretaker who is. Two solar cameras cover the gate and the approach, run without mains, and survive a power cut. We set up viewing for you and separate, limited access for the caretaker. Cameras cover outside approaches only — guests are not filmed.",
    bestFor: [
      "Holiday homes on the south and north coast",
      "Owners abroad who need a caretaker to have limited access",
      "Properties where power cuts take a wired system offline",
    ],
    notSuitableFor: [
      "Interiors of a let property — filming guests indoors is not lawful and not something we will fit",
      "Continuous recording; these are event-triggered",
      "Sites without 4G coverage",
    ],
    isBuilderTemplate: false,
  },
  {
    slug: "coast-spec-4-camera-cctv",
    name: "Coast-Spec CCTV",
    tier: "standard",
    answers: {
      propertyType: "home",
      cameras: 4,
      outdoorCameras: 4,
      technology: "analog",
      colourAtNight: true,
      retentionDays: 14,
      location: "coast",
      coastSpec: true,
    },
    propertyTypes: HOME,
    summary:
      "The Home Colour 4, built for salt air: sealed IP66 junction boxes at every camera instead of the plain ones.",
    description:
      "Within about a kilometre of the water, an ordinary install ages differently. The failure is almost never the camera — it is the joint. Water and salt get into an unsealed junction box, the connection corrodes, and a camera drops off months later. This is the same four-camera ColorVu system with sealed IP66 boxes at every position. It costs a little more and it is the difference between a system that lasts and one that needs a visit every rainy season.",
    bestFor: [
      "Nyali, Bamburi, Shanzu, Mtwapa, Diani and anywhere near the water",
      "Replacing a system that has already corroded",
      "Exposed elevations that take driven rain",
    ],
    notSuitableFor: [
      "Inland sites, where the extra cost buys nothing",
      "Colour identification beyond about 20 m",
      "Sites needing 4MP detail; this is the 2MP analog platform",
    ],
    isBuilderTemplate: false,
  },
];

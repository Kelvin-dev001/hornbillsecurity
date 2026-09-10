/**
 * The glossary — docs/03 §2 and docs/05 Sprint 7.
 *
 * A TS module rather than a database table, and that is a considered exception
 * to the "the owner edits the content" principle that governs prices, articles,
 * service pages and locations. These are definitions of industry terms, not
 * business facts: they do not change monthly, none of them is a price, and
 * getting one wrong is a correction in a pull request rather than something the
 * owner needs to fix at 9pm. If that ever stops being true it moves to a table.
 *
 * Two rules held throughout.
 *
 * **Every definition says what it means for the buyer**, not just what the
 * acronym expands to. "NVR: network video recorder" is a dictionary entry and
 * helps nobody; "an NVR records IP cameras over the network and usually powers
 * them down the same cable" is the sentence somebody actually needed.
 *
 * **The ones used to inflate a quotation are marked as such.** Half the value
 * of a glossary on this site is telling a reader which terms a salesperson is
 * using to make an ordinary thing sound expensive.
 */
export type GlossaryTerm = {
  term: string;
  /** Expansion, where the term is an acronym. */
  expansion?: string;
  definition: string;
  /** Shown as a highlighted aside — the buyer's angle on the term. */
  watchFor?: string;
  group: string;
  /** Related terms, by `term`. */
  see?: string[];
};

export const GLOSSARY_GROUPS = [
  "Cameras",
  "Recording and storage",
  "Cabling and power",
  "Access and perimeter",
  "Commercial",
] as const;

export const glossary: GlossaryTerm[] = [
  // ── Cameras ──────────────────────────────────────────────────────────────
  {
    term: "Bullet camera",
    group: "Cameras",
    definition:
      "The long cylindrical shape. Obvious from a distance, which makes it a deterrent, and easy to aim precisely along a boundary or a driveway.",
    watchFor:
      "Being sold as more capable than a dome of the same model. The shape is a housing; the sensor and lens decide what it sees.",
    see: ["Dome camera", "Turret camera"],
  },
  {
    term: "Dome camera",
    group: "Cameras",
    definition:
      "A hemisphere, usually ceiling or soffit mounted. Discreet, harder to tell where it is pointing, and harder to knock out of aim.",
    see: ["Bullet camera", "Turret camera"],
  },
  {
    term: "Turret camera",
    group: "Cameras",
    definition:
      "A ball on a short stalk — sometimes called an eyeball. Easier to aim than a dome and less obtrusive than a bullet, which is why it is what we fit most often on houses.",
  },
  {
    term: "ColorVu",
    group: "Cameras",
    definition:
      "Hikvision's name for a camera that keeps full colour at night using a large sensor and a warm white light instead of infrared. The practical difference is enormous: colour tells you a red shirt and a blue car, and infrared tells you a grey person.",
    watchFor:
      "It needs its light to be unobstructed and it draws more power. Also, every brand has its own name for this — Dahua calls it Full-colour — so compare the specification, not the marketing word.",
    see: ["EXIR", "Lux"],
  },
  {
    term: "EXIR",
    group: "Cameras",
    definition:
      "Infrared illumination that gives black-and-white footage in darkness. Cheaper than colour-at-night and perfectly adequate when you need to know that somebody was there rather than who they were.",
    see: ["ColorVu"],
  },
  {
    term: "AcuSense",
    group: "Cameras",
    definition:
      "On-camera analytics that distinguish a person or a vehicle from a moving branch. What it actually buys you is fewer useless notifications, which is what decides whether anybody still has the app switched on after a month.",
  },
  {
    term: "PTZ",
    expansion: "pan, tilt, zoom",
    group: "Cameras",
    definition:
      "A camera that moves and zooms under control. Genuinely useful where somebody is watching live, or on a preset patrol across a large yard.",
    watchFor:
      "A PTZ is looking in exactly one direction at a time, so it is not covering the other three. On an unmanned site two fixed cameras usually beat one PTZ at the same price.",
  },
  {
    term: "Varifocal",
    group: "Cameras",
    definition:
      "A lens whose zoom can be adjusted at the camera, so the field of view is set on site rather than fixed at manufacture. Worth it where the exact framing matters — a gate, a till, a number plate.",
  },
  {
    term: "IP66 / IP67",
    expansion: "ingress protection rating",
    group: "Cameras",
    definition:
      "How well a housing keeps out dust and water. IP66 withstands heavy jets; IP67 survives brief immersion. Every serious outdoor camera is at least IP66.",
    watchFor:
      "On this coast the camera's rating is rarely what fails — the junction box, the fixings and the cable entry are. A high-rated camera on an unsealed box still fails.",
  },
  {
    term: "Lux",
    group: "Cameras",
    definition:
      "A measure of light. A camera's minimum lux figure tells you how dark it can get before the picture degrades; 0 lux means it can see with no ambient light at all, using its own illumination.",
  },

  // ── Recording and storage ────────────────────────────────────────────────
  {
    term: "DVR",
    expansion: "digital video recorder",
    group: "Recording and storage",
    definition:
      "Records analog cameras over coaxial cable. Cheaper per channel, and modern ones handle 5MP and 8MP perfectly well, so an analog system in 2026 is not the compromise it was ten years ago.",
    see: ["NVR", "Coaxial"],
  },
  {
    term: "NVR",
    expansion: "network video recorder",
    group: "Recording and storage",
    definition:
      "Records IP cameras over network cable, and usually powers them down the same cable. One run per camera instead of two, and adding a camera later is a cable and a port.",
    see: ["DVR", "PoE"],
  },
  {
    term: "Channel",
    group: "Recording and storage",
    definition:
      "One camera's worth of capacity on a recorder. A 4-channel recorder takes four cameras, and that is a hard limit.",
    watchFor:
      "Buy for where you expect to end up, not where you start. Going from four cameras to five means a new recorder, and the difference between a 4- and an 8-channel unit is small.",
  },
  {
    term: "Retention",
    group: "Recording and storage",
    definition:
      "How many days of footage the system holds before overwriting the oldest. Decided by camera count, resolution and disk size — not by a setting you can simply turn up.",
    watchFor:
      "The single most common thing we find wrong on other people's systems. Ask for the number in writing, and check the arithmetic: cameras × GB per camera per day × days.",
    see: ["Surveillance drive"],
  },
  {
    term: "Surveillance drive",
    group: "Recording and storage",
    definition:
      "A hard disk built for continuous writing, which is what a recorder does every second of every day. Purple, SkyHawk, WD Purple — the colour is the brand's shorthand.",
    watchFor:
      "A desktop drive in a recorder works for a while and then fails, usually inside two years and usually silently. If a quotation does not say surveillance-rated, ask.",
  },
  {
    term: "H.265 / H.265+",
    group: "Recording and storage",
    definition:
      "Video compression. H.265 roughly halves the storage a stream needs against the older H.264, and the + variants squeeze further on static scenes.",
    watchFor:
      "Storage claims that assume H.265+ on a busy scene. Compression works by not re-recording what has not changed, so a windy compound with traffic compresses far worse than a quiet corridor.",
  },

  // ── Cabling and power ────────────────────────────────────────────────────
  {
    term: "PoE",
    expansion: "power over Ethernet",
    group: "Cabling and power",
    definition:
      "Power and data down one network cable, so an IP camera needs no separate power run. The reason IP installs have fewer cables than analog ones.",
    watchFor:
      "The switch has a total power budget, not just a port count. Eight ports does not mean eight cameras if the cameras have heaters or illuminators.",
    see: ["NVR"],
  },
  {
    term: "Coaxial",
    group: "Cabling and power",
    definition:
      "The cable analog cameras run on. RG59 siamese is coax with a power pair bonded alongside it, so one run carries video and power.",
    watchFor:
      "Coax already in your walls is worth money — a modern analog system reuses it at 5MP, and recabling for IP is often more expensive than the camera difference.",
    see: ["DVR"],
  },
  {
    term: "Cat6 / Cat6A",
    group: "Cabling and power",
    definition:
      "Network cable. Cat6 is correct for essentially every camera and office installation; Cat6A earns its extra cost on long runs, heavy interference, or a building you expect to still be using in fifteen years.",
    watchFor:
      "90 metres is the standard's limit for a copper run, not a guideline. Past it you want fibre or a switch in between — and a quotation with a 120 m run on Cat6 has a problem in it.",
  },
  {
    term: "Balun",
    group: "Cabling and power",
    definition:
      "A small adapter that lets an analog camera's video run over twisted-pair cable instead of coax. Useful in a retrofit where Cat cable is already in the walls.",
  },
  {
    term: "Trunking",
    group: "Cabling and power",
    definition:
      "The plastic channel cable runs inside where it is surface-mounted. Protects the cable, and it is the difference between an installation that looks done and one that looks improvised.",
    watchFor:
      "It is a real cost, not padding — often the largest single consumable line on a job. A quotation that does not mention containment has either hidden it or is not going to fit any.",
  },
  {
    term: "UPS",
    expansion: "uninterruptible power supply",
    group: "Cabling and power",
    definition:
      "A battery that keeps equipment running through a power cut. On a recorder it is frequently worth more than another camera, because a system that stops recording during an outage was not there when you needed it.",
  },

  // ── Access and perimeter ─────────────────────────────────────────────────
  {
    term: "Energizer",
    group: "Access and perimeter",
    definition:
      "The unit that pulses an electric fence. Sized from the perimeter length and the number of live wires — an undersized one gives you a fence that deters nobody.",
    watchFor:
      "Joules is the specification that matters, and it should be justified against your actual perimeter rather than quoted from a shelf.",
  },
  {
    term: "Fail-safe / fail-secure",
    group: "Access and perimeter",
    definition:
      "What an electric lock does when power is lost: fail-safe releases, fail-secure stays locked. Which is correct depends on whether the door is an escape route, and it is a decision to make deliberately rather than discover.",
    watchFor:
      "Fire regulations decide this on an escape route, not preference and not us. If nobody raised it, nobody thought about it.",
  },
  {
    term: "Request to exit",
    group: "Access and perimeter",
    definition:
      "The button or sensor that releases a controlled door from the inside. Unglamorous, mandatory, and the thing most often missing from a cheap access-control quotation.",
  },
  {
    term: "Photocell",
    group: "Access and perimeter",
    definition:
      "The beam across a gate opening that stops it closing on a vehicle or a person. On an automated gate this is a safety device, not an accessory.",
    watchFor:
      "A gate motor quotation with no photocells is not cheaper — it is incomplete, and a gate is the one security product that can genuinely hurt somebody.",
  },

  // ── Commercial ───────────────────────────────────────────────────────────
  {
    term: "Bill of materials",
    expansion: "BOM",
    group: "Commercial",
    definition:
      "The itemised list of everything a job needs, with a quantity and a unit price on every line. It is what we publish for every system on this site, and it is the only form of quotation you can actually compare against another one.",
    watchFor:
      'A quote with an "accessories" line instead of a bill of materials. That line is normally one of the largest on the job.',
  },
  {
    term: "Per point",
    group: "Commercial",
    definition:
      "Labour charged per camera position rather than per day. Covers mounting, sealing, the cable run, terminating both ends, aiming and configuring the channel.",
    watchFor:
      "A day rate transfers the risk of a slow day onto you and gives the installer no reason to be efficient.",
  },
  {
    term: "Site survey",
    group: "Commercial",
    definition:
      "The visit where the real quoting happens: cable routes, camera positions, what the building will and will not allow. Ours produces a written findings report with positions marked up, and the fee is credited to your invoice.",
    watchFor:
      "A free survey is a sales visit, and its cost is inside the quotation you are given. Ask what you get from it in writing.",
  },
  {
    term: "VAT-exclusive",
    group: "Commercial",
    definition:
      "A price before 16% VAT is added. Every figure on this site is VAT-exclusive, which is how quotations in this market are written.",
    watchFor:
      "Comparing a VAT-exclusive quote against a VAT-inclusive one makes a 16% difference appear out of nowhere. Check which each of your quotes is.",
  },
  {
    term: "DPIA",
    expansion: "data protection impact assessment",
    group: "Commercial",
    definition:
      "A written assessment of the privacy risk of a surveillance system, done before it goes in. Kenya's Data Protection Act 2019 requires one for high-risk processing, and the ODPC's draft guidance for private security is explicit about it.",
    see: ["Bill of materials"],
  },
];

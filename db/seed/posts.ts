/**
 * The launch articles — docs/03 §4.
 *
 * Two rules govern everything here.
 *
 * **Every number is generated, not typed — including illustrative ones.** The
 * price tables below are rendered from the same Bom objects the package pages
 * render, handed over by buildSolutions(), so an article and the package page it
 * cites cannot disagree.
 *
 * The "including illustrative ones" was learned twice, the same way both times.
 * A sentence like `a quotation saying "accessories — KES 25,000"` reads as
 * obviously hypothetical to whoever writes it, and it is still a made-up price
 * on a site whose entire claim is that its numbers are real. Both times the
 * invented figure also collided with an actual distributor cost and the
 * cost-price leak scan failed the build, which is the only reason it was caught
 * rather than shipped.
 *
 * So: if a number appears in prose here, it comes from `context`. If you want a
 * hypothetical, describe it without a figure. Each table says the month
 * it was generated and links to the live page, because a markdown body does not
 * re-price itself when the owner runs a price review — the article is a snapshot
 * with a date on it, which is what a cost guide honestly is.
 *
 * **Nothing is published that the catalogue cannot support.** docs/03 §4 Tier 1
 * asks for two electric-fence articles (a downloadable sample BOM and a
 * cost-per-metre breakdown). The fencing catalogue currently holds one published
 * item — an energizer — so writing either would mean inventing prices for posts,
 * insulators, wire, gates and earth rods. docs/08 Sprint 6 forbids exactly that:
 * "do not publish market-research estimates as our prices". They are recorded as
 * open items instead, and their slots are filled by three articles from §4 that
 * the data does support and that are just as differentiated:
 *
 *   Tier 3 #21  What CCTV Installation Labour Actually Costs
 *   Tier 2 #13  CCTV on the Kenyan Coast: Salt Air, Humidity, and What Survives
 *   Tier 4 #28  Analog vs IP on a Real 8-Camera Job
 *   Tier 5 #30  How to Read a CCTV Quotation in Kenya
 *
 * Sprint 7 adds the Tier 3 pieces the catalogue can support without inventing a
 * price — #15 cost per camera, #16 the three-bedroom house, #17 the shop or
 * duka, #19 DVR and NVR prices, #20 cable, and #25 nanny cameras and what is
 * legal. Tier 3 #22 (access control prices), #23 (biometric time and
 * attendance) and #24 (automatic gate cost) are NOT written, for the same
 * reason the fence articles are not: those categories hold no published prices,
 * and a cost article with no costs in it is not a cost article. Tier 4 #26 and
 * #27 (Hikvision vs Dahua, vs HiLook) need published Dahua and HiLook rows,
 * which do not exist yet either.
 *
 * Sprint 5 adds the two Tier 2 pieces the coast strategy turns on:
 *
 *   Tier 2 #6   CCTV Installation in Mombasa: Prices, Coverage
 *   Tier 2 #14  Securing a Holiday Home or Airbnb on the South Coast
 *
 * Tier 2 items 7-12 are the six neighbourhood pages, and those are already live
 * as /services/cctv-installation/[location] with real local copy. Writing them a
 * second time as articles would put two of our own pages in front of the same
 * query, which splits the ranking signal we are trying to concentrate.
 *
 * Tier 1 #2 (the interactive calculator) shipped as /build/cctv and Tier 1 #5
 * (the Hikvision price list) as /price-list/hikvision, so neither needs an
 * article to exist.
 */
import type { Bom, BomLine } from "../../lib/pricing/bom";
import type { NewPost } from "../schema";

export type PostSeedContext = {
  boms: Map<string, Bom>;
  serviceRates: Map<string, { name: string; price: number | null | undefined; pricingUnit: string }>;
  /**
   * Published, priced catalogue items by SKU.
   *
   * The Tier 3 articles quote recorder and cable prices directly rather than
   * only through a BOM, so they need the catalogue. Same rule as everywhere
   * else in this file: an article never contains a number somebody typed, and
   * `item()` throws rather than letting a missing SKU render as blank.
   */
  items: Map<string, { sku: string; name: string; price: number; unit: string }>;
  rules: Map<string, number>;
  pricesUpdatedAt: Date;
  vatRate: number;
  siteSurveyFee: number;
  warrantyMonths: number;
  quoteValidityDays: number;
  depositPercent: number;
};

const kes = (value: number) => `KES ${Math.round(value).toLocaleString("en-KE")}`;

const monthYear = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);

/** A markdown pipe table is a real <table> once rendered — CLAUDE.md §2.2. */
function bomTable(bom: Bom, options: { showSku?: boolean } = {}): string {
  const showSku = options.showSku ?? true;
  const header = showSku
    ? "| Item | Model | Qty | Unit | Unit price | Total |\n|---|---|---:|---|---:|---:|"
    : "| Item | Qty | Unit | Unit price | Total |\n|---|---:|---|---:|---:|";

  const row = (line: BomLine) =>
    showSku
      ? `| ${line.name} | ${line.sku ?? "—"} | ${line.quantity} | ${line.unit} | ${kes(line.unitPrice)} | ${kes(line.extended)} |`
      : `| ${line.name} | ${line.quantity} | ${line.unit} | ${kes(line.unitPrice)} | ${kes(line.extended)} |`;

  const span = showSku ? 5 : 4;
  const pad = "|".repeat(0) + " |".repeat(span - 1);

  const vat = Math.round((bom.subtotal * bom.vatRate) / 100);

  return [
    header,
    ...bom.lines.map(row),
    `| **Equipment and materials** |${pad} **${kes(bom.subtotalItems)}** |`,
    `| **Labour** |${pad} **${kes(bom.subtotalLabour)}** |`,
    `| **Total excluding VAT** |${pad} **${kes(bom.subtotal)}** |`,
    `| VAT at ${bom.vatRate}% |${pad} ${kes(vat)} |`,
    `| **Total including VAT** |${pad} **${kes(bom.subtotal + vat)}** |`,
  ].join("\n");
}

function requireBom(context: PostSeedContext, slug: string): Bom {
  const bom = context.boms.get(slug);
  if (!bom) throw new Error(`post seed: the ${slug} package was not built`);
  return bom;
}

function rate(context: PostSeedContext, slug: string): number {
  const service = context.serviceRates.get(slug);
  if (!service || service.price === null || service.price === undefined) {
    throw new Error(`post seed: the ${slug} service has no published price`);
  }
  return service.price;
}

function item(context: PostSeedContext, sku: string) {
  const found = context.items.get(sku);
  if (!found) {
    throw new Error(
      `post seed: ${sku} is not published and priced, so an article cannot quote it. ` +
        "Either price it or drop the reference — do not let it render as a blank.",
    );
  }
  return found;
}

function rule(context: PostSeedContext, key: string): number {
  const value = context.rules.get(key);
  if (value === undefined) throw new Error(`post seed: no pricing rule ${key}`);
  return value;
}

export function buildPosts(context: PostSeedContext): NewPost[] {
  const stamp = monthYear(context.pricesUpdatedAt);
  const publishedAt = context.pricesUpdatedAt;

  const four = requireBom(context, "home-colour-4-camera-colorvu-cctv");
  const eight = requireBom(context, "business-8-camera-colorvu-cctv");
  const sixteen = requireBom(context, "commercial-16-camera-cctv");
  const eightIp = requireBom(context, "business-ip-8-camera-colorvu-cctv");
  const coast = requireBom(context, "coast-spec-4-camera-cctv");
  const holiday = requireBom(context, "holiday-home-airbnb-cctv");
  const solar = requireBom(context, "wire-free-solar-4g-camera");
  const shop = requireBom(context, "shop-duka-4-camera-cctv");

  const labourPoint = rate(context, "camera-installation-point");
  const dataPoint = rate(context, "data-point-installation");
  const cablePerCamera = rule(context, "cable_m_per_camera_residential");
  const trunkingPerCamera = rule(context, "trunking_m_per_camera");

  // What the "accessories" line on a four-camera job actually contains, computed
  // rather than asserted. The quotation article used to name a round figure I had
  // made up; on a site whose whole premise is that every number is real, an
  // illustrative price is the one thing an article must not contain — and that
  // invented figure turned out to collide with a real distributor cost, which the
  // leak scan flagged. Generated from the BOM now, like everything else.
  const fourConsumables = four.lines
    .filter((line) => line.lineType === "consumable")
    .reduce((sum, line) => sum + line.extended, 0);

  // Recorders and cable, quoted directly rather than only inside a BOM.
  const dvr4 = item(context, "DVR-7200-4");
  const dvr8 = item(context, "DVR-7200-8");
  const dvr16 = item(context, "DVR-7200-16");
  const dvr32 = item(context, "DVR-7200-32");
  const nvr8 = item(context, "DS-7608NXI-K2/VPro");
  const nvr32 = item(context, "DS-7632NXI-K2/16P/VPro");
  const fourEssential = requireBom(context, "home-essential-4-camera-analog-cctv");
  const nannyStarter = requireBom(context, "nanny-cam-starter");
  const nannyPlus = requireBom(context, "nanny-cam-plus");
  const trunking = item(context, "TRUNK-25X16-2M");
  const coax = item(context, "CAB-RG59-SIAM-305");
  const cat6 = item(context, "DS-1LN6U-ZCO");
  const bnc = item(context, "CON-BNC-10");
  const rj45 = item(context, "CON-RJ45-100");
  const nannyBasic = item(context, "C1C-B");
  const nannyBattery = item(context, "CB1");

  const fourLabour = four.subtotalLabour;
  const eightLabour = eight.subtotalLabour;
  const sixteenLabour = sixteen.subtotalLabour;

  const posts: NewPost[] = [
    // ══ Tier 1 · 1 — the flagship ════════════════════════════════════════════
    {
      slug: "cctv-installation-cost-kenya-itemised-bill-of-materials",
      title: `CCTV Installation Cost in Kenya ${publishedAt.getUTCFullYear()}: The Full Itemised Bill of Materials`,
      category: "Costs",
      author: "Hornbill Smart Security Services",
      excerpt: `Three complete CCTV systems — 4, 8 and 16 cameras — with every line priced: cameras, recorder, drive, cable, connectors, trunking and labour. Real figures, ${stamp}, VAT-exclusive.`,
      seoTitle: `CCTV Installation Cost in Kenya ${publishedAt.getUTCFullYear()}: Full Itemised Price Breakdown`,
      seoDescription: `What CCTV actually costs in Kenya: ${kes(four.subtotal)} for 4 cameras, ${kes(eight.subtotal)} for 8, ${kes(sixteen.subtotal)} for 16 — every line itemised, updated ${stamp}.`,
      tags: ["cctv", "pricing", "bill of materials", "kenya"],
      body: `Nobody in this industry publishes what a CCTV installation actually costs. You get a range, or a figure with no workings, or "call for a quote". So here are three complete systems with every single line in them, priced.

All figures are Kenyan Shillings, exclusive of VAT at ${context.vatRate}%, as at ${stamp}. They are the same numbers our package pages carry, and those pages are always current — if you are reading this months later, check the live table linked under each system.

## What a CCTV system is actually made of

The camera is the part people compare on. It is rarely the part that decides the price.

A four-camera installation needs roughly ${cablePerCamera} metres of cable per camera, ${trunkingPerCamera} metres of trunking to run it in, a connector at each end of every run, a power supply, a recorder, a surveillance-rated hard disk, and a day of somebody's labour. The cameras are typically under half the bill. That is the single most useful thing to know before reading anybody's quotation, including ours.

## System 1 — four cameras, residential

The most common domestic job in Kenya: a home, four outdoor cameras, colour footage at night, two weeks of recording.

${bomTable(four)}

The live, always-current version of this table is on the [Home Colour 4 package page](/solutions/home-colour-4-camera-colorvu-cctv).

Note the shape of it. The cameras are one line. The cable, trunking, connectors, clips and power are ${Math.round((four.subtotalItems - four.lines.filter((l) => l.lineType === "primary").reduce((sum, l) => sum + l.extended, 0)) / four.subtotalItems * 100)}% of the equipment cost between them, and they are the lines most quotations hide inside a single word: "accessories".

## System 2 — eight cameras, small business

An office or a shop: eight cameras, five of them outdoors, thirty days of recording because a commercial claim can take that long to surface.

${bomTable(eight)}

The live table is on the [Business 8 package page](/solutions/business-8-camera-colorvu-cctv).

Doubling the cameras did not double the price. Labour scales per camera point (${kes(labourPoint)} each), but the recorder, the survey and a share of the setup do not — which is why the per-camera cost falls from ${kes(Math.round(four.subtotal / 4))} to ${kes(Math.round(eight.subtotal / 8))} between these two systems.

## System 3 — sixteen cameras, commercial

A warehouse or a yard: sixteen cameras, ten outdoors, thirty days retention.

${bomTable(sixteen)}

The live table is on the [Commercial 16 package page](/solutions/commercial-16-camera-cctv).

Per camera this comes to ${kes(Math.round(sixteen.subtotal / 16))}, against ${kes(Math.round(four.subtotal / 4))} on the four-camera system. If a quotation you have been given prices a sixteen-camera job at four times the four-camera price, somebody has multiplied rather than estimated.

## What these prices do not include

- **VAT**, at ${context.vatRate}%. Every figure above is exclusive of it.
- **Trenching, poles, and mains electrical work.** If a camera needs a pole or a cable needs to cross open ground, that is quoted separately after a survey.
- **A UPS.** Worth having where the supply is unreliable, and not assumed here.
- **Unusually long cable runs.** These systems assume about ${cablePerCamera} m per camera. Large compounds and older buildings with no existing conduit run longer, and the survey is where that is established — before you commit, not at the invoice.

## Where the money actually goes

On the four-camera system: equipment and materials ${kes(four.subtotalItems)}, labour ${kes(four.subtotalLabour)}. On the sixteen-camera system: ${kes(sixteen.subtotalItems)} and ${kes(sixteen.subtotalLabour)}.

Labour is between ${Math.round((Math.min(four.subtotalLabour / four.subtotal, sixteen.subtotalLabour / sixteen.subtotal)) * 100)}% and ${Math.round((Math.max(four.subtotalLabour / four.subtotal, sixteen.subtotalLabour / sixteen.subtotal)) * 100)}% of the total on these jobs. Any quotation where labour is invisible has either buried it in the equipment prices or is about to add it later.

## Build your own and see the same tables

Every one of these is generated by the same engine that runs our [system builder](/build/cctv). Answer six questions about your property and you get a bill of materials in this exact format, with a price on every line, before you speak to anybody.

If you want us to price a specific site, a survey is ${kes(context.siteSurveyFee)} and is credited against your invoice.`,
      faq: [
        {
          question: "How much does CCTV installation cost in Kenya?",
          answer: `As at ${stamp}: ${kes(four.subtotal)} for a complete four-camera residential system, ${kes(eight.subtotal)} for eight cameras, and ${kes(sixteen.subtotal)} for sixteen — all excluding VAT and all including cameras, recorder, hard disk, cabling, connectors, trunking and labour. Per camera that works out at roughly ${kes(Math.round(four.subtotal / 4))} down to ${kes(Math.round(sixteen.subtotal / 16))} as the system gets larger.`,
        },
        {
          question: "Why is the cable and accessories cost so high?",
          answer: `Because it is genuinely a large share of the job and most quotations hide it. A camera needs roughly ${cablePerCamera} metres of cable and ${trunkingPerCamera} metres of trunking, plus connectors at both ends, clips, and a share of the power supply. Across four cameras that is hundreds of metres of material. It is not padding — it is what physically connects the system.`,
        },
        {
          question: "Does the price include VAT?",
          answer: `No. Every figure here is VAT-exclusive, which is how quotations in this market are written. VAT at ${context.vatRate}% is added on the invoice.`,
        },
        {
          question: "How much does an extra camera cost?",
          answer: `On an existing system with spare recorder channels, roughly the camera itself plus ${kes(labourPoint)} labour plus its share of cable and connectors. On a system with no spare channels you also need a larger recorder, which is why it is worth sizing the recorder for where you expect to end up rather than where you are starting.`,
        },
      ],
    },

    // ══ Tier 3 · 21 — the number every competitor hides ═══════════════════════
    {
      slug: "what-cctv-installation-labour-actually-costs-kenya",
      title: "What CCTV Installation Labour Actually Costs in Kenya",
      category: "Costs",
      author: "Hornbill Smart Security Services",
      excerpt: `Per-point and per-day rates, published. Camera installation is ${kes(labourPoint)} per point and a data point is ${kes(dataPoint)}. Here is what that buys and how to check a quote against it.`,
      seoTitle: "CCTV Installation Labour Cost Kenya: Per-Point and Day Rates",
      seoDescription: `What installers charge for labour in Kenya: ${kes(labourPoint)} per camera point, ${kes(dataPoint)} per data point, published rather than hidden inside an equipment price.`,
      tags: ["labour", "pricing", "cctv", "kenya"],
      body: `Almost every CCTV quotation in Kenya hides the labour. It appears as "installation" with a single figure, or it does not appear at all because it has been folded into the equipment prices. Both make the quote impossible to check.

Here are our rates. As at ${stamp}, VAT-exclusive.

## The rates

| Work | Rate | Charged |
|---|---:|---|
| Camera installation | ${kes(labourPoint)} | per camera point |
| Data point installation | ${kes(dataPoint)} | per point |
| Site survey | ${kes(context.siteSurveyFee)} | fixed, credited to your invoice |

The current versions of these are on the [services page](/services), which is generated from the same table our quotations are.

## What a camera point actually includes

A "point" is not just screwing a camera to a wall. It is:

- Mounting the camera and sealing it against water. On the coast that means a sealed box, not a cable hanging out of a hole.
- Running the cable from the camera to the recorder — typically ${cablePerCamera} metres — in trunking or conduit, clipped properly.
- Terminating both ends. This is where most of the failures we get called out to fix come from: a badly crimped connector works on the day and fails in three months.
- Aiming and focusing the camera on the view you actually want, not the view that is easiest to mount.
- Configuring the channel on the recorder, including motion zones so you are not reviewing four hours of a tree moving.

That is the work. ${kes(labourPoint)} per camera is what it costs us to do it properly.

## What a whole job comes to

Three real systems, showing labour against the total:

| System | Cameras | Labour | Total ex VAT | Labour as % |
|---|---:|---:|---:|---:|
| [Home Colour 4](/solutions/home-colour-4-camera-colorvu-cctv) | 4 | ${kes(fourLabour)} | ${kes(four.subtotal)} | ${Math.round((fourLabour / four.subtotal) * 100)}% |
| [Business 8](/solutions/business-8-camera-colorvu-cctv) | 8 | ${kes(eightLabour)} | ${kes(eight.subtotal)} | ${Math.round((eightLabour / eight.subtotal) * 100)}% |
| [Commercial 16](/solutions/commercial-16-camera-cctv) | 16 | ${kes(sixteenLabour)} | ${kes(sixteen.subtotal)} | ${Math.round((sixteenLabour / sixteen.subtotal) * 100)}% |

Labour is a fairly stable share of a CCTV job. If a quotation puts it far outside that range in either direction, ask why — a very low labour figure usually means it is hidden in the equipment prices, and a very high one usually means nothing.

## How to use this to check a quote

Ask for the labour as its own line. Then:

1. Divide it by the number of cameras. If it comes to far more than ${kes(labourPoint)} a point, ask what the extra is for. Sometimes there is a real answer — a difficult roof, a long run, work at height — and it should be stated.
2. Check whether the survey is included, charged, or free. A free survey is a sales visit; somebody is paying for it inside another line.
3. Check what happens if the job takes an extra day. Ours does not change the price; a day-rate quote does.

## What we do not charge separately for

- Setting up remote viewing on your phone. That is part of handover.
- Showing you how to export a clip. Also handover.
- Coming back inside the warranty period for a workmanship fault. ${context.warrantyMonths} months.

If any of those appears as a line on somebody's quotation, that is worth a question too.`,
      faq: [
        {
          question: "How much do CCTV installers charge per camera in Kenya?",
          answer: `Our published rate is ${kes(labourPoint)} per camera point excluding VAT, which covers mounting, weather sealing, the cable run, terminating both ends, aiming, and configuring the channel on the recorder. Across a whole job labour typically comes to between ${Math.round((Math.min(fourLabour / four.subtotal, sixteenLabour / sixteen.subtotal)) * 100)}% and ${Math.round((Math.max(fourLabour / four.subtotal, sixteenLabour / sixteen.subtotal)) * 100)}% of the total.`,
        },
        {
          question: "Should labour be a separate line on a CCTV quote?",
          answer: "Yes, and if it is not, ask for it. Labour folded into the equipment prices makes a quotation impossible to compare against another one, which is usually the point.",
        },
        {
          question: "Do you charge a day rate or a per-point rate?",
          answer: "Per point. A day rate transfers the risk of a slow day onto the customer, and it gives the installer no reason to be efficient. Per point means the price you were quoted is the price, whether the job takes one day or two.",
        },
      ],
    },

    // ══ Tier 4 · 28 — two BOMs side by side ══════════════════════════════════
    {
      slug: "analog-vs-ip-cctv-cost-difference-8-camera-job",
      title: "Analog vs IP CCTV in Kenya: The Cost Difference on a Real 8-Camera Job",
      category: "Comparisons",
      author: "Hornbill Smart Security Services",
      excerpt: `Two complete eight-camera systems, priced line by line: ${kes(eight.subtotal)} analog against ${kes(eightIp.subtotal)} IP. Where the difference actually comes from, and when it is worth paying.`,
      seoTitle: "Analog vs IP CCTV Cost Kenya: Two Real 8-Camera Quotes Compared",
      seoDescription: `Analog ${kes(eight.subtotal)} vs IP ${kes(eightIp.subtotal)} for the same eight-camera job, itemised. Which is worth it, and which lines actually differ.`,
      tags: ["analog", "ip", "comparison", "cctv"],
      body: `The analog-versus-IP argument is usually had in the abstract. Here it is with two complete bills of materials for the same eight-camera commercial job, priced as at ${stamp}, VAT-exclusive.

**Analog: ${kes(eight.subtotal)}. IP: ${kes(eightIp.subtotal)}.** A difference of ${kes(eightIp.subtotal - eight.subtotal)}, or ${Math.round(((eightIp.subtotal - eight.subtotal) / eight.subtotal) * 100)}%.

## The analog system

${bomTable(eight)}

Live table: [Business 8](/solutions/business-8-camera-colorvu-cctv).

## The IP system

${bomTable(eightIp)}

Live table: [Business IP 8](/solutions/business-ip-8-camera-colorvu-cctv).

## Where the difference comes from

Three places, and only one of them is the cameras.

**The cameras.** IP cameras cost more per unit at the same coverage. That is the obvious part.

**The recorder.** An NVR with built-in PoE costs more than a DVR, but it also removes the separate power supply and the power run to every camera, which claws some of it back.

**The cabling.** Analog runs coaxial with a separate power pair. IP runs a single Cat6 that carries data and power together. Per metre the cable costs differ, but the bigger effect is that an IP install is one run per camera instead of two.

## When IP is worth it

- **When you will ever need to read something.** A number plate, a face at a gate, a serial number on a box. Higher resolution is not a marketing feature here — it is the difference between footage that identifies somebody and footage that shows that a person was present.
- **When the site will grow.** Adding a camera to an IP system is one cable and a port. On analog it is a cable, a power run, and eventually a bigger DVR.
- **When you want analytics that work.** Line crossing and intrusion detection on a modern IP camera are usable. On analog they are a checkbox.

## When analog is the right answer

- **A domestic system that exists to tell you what happened.** Four cameras watching a compound, at ${kes(four.subtotal)} for the whole job. IP would add cost and give you very little you would actually use.
- **A retrofit where coaxial is already in the walls.** Modern analog runs 5MP over existing cable. Re-cabling a building for IP can cost more than the camera difference.
- **A tight budget where the alternative is fewer cameras.** Six analog cameras covering everything beats four IP cameras covering most of it. Coverage beats resolution more often than the internet suggests.

## The honest summary

For most Kenyan homes, analog at 1080p or 5MP with colour night vision is the correct engineering answer and the cheaper one. For a business that may need to identify a person or a vehicle, or that will add cameras over time, IP earns its ${Math.round(((eightIp.subtotal - eight.subtotal) / eight.subtotal) * 100)}% premium.

Anybody who tells you one is simply better than the other is selling whichever one they have in stock.`,
      faq: [
        {
          question: "Is IP CCTV worth the extra cost in Kenya?",
          answer: `On our figures an eight-camera IP system costs ${kes(eightIp.subtotal)} against ${kes(eight.subtotal)} for the analog equivalent — about ${Math.round(((eightIp.subtotal - eight.subtotal) / eight.subtotal) * 100)}% more. It is worth it if you need to identify people or vehicles rather than just record that something happened, or if the system will grow. For a straightforward domestic system, analog at 5MP is the better value.`,
        },
        {
          question: "Can I use my existing coaxial cable for a new system?",
          answer: "Usually yes, for analog. Modern analog cameras run 5MP over the same RG59 that carried an older system, so a retrofit can be camera-and-recorder only. For IP you need Cat6, and if the coax is buried in walls that recabling cost is often larger than the camera price difference.",
        },
        {
          question: "Which is better for night footage?",
          answer: "That is decided by the camera's sensor and lighting, not by whether it is analog or IP. A ColorVu analog camera gives colour footage at night; a cheap IP camera gives grainy black and white. Compare the specific models, not the technologies.",
        },
      ],
    },

    // ══ Tier 2 · 13 — coast expertise no Nairobi firm can claim ═══════════════
    {
      slug: "cctv-kenyan-coast-salt-air-humidity-what-survives",
      title: "CCTV on the Kenyan Coast: Salt Air, Humidity, and What Actually Survives",
      category: "Coast",
      author: "Hornbill Smart Security Services",
      excerpt:
        "Why coastal installations fail early, which components corrode first, and what changes on a Mombasa, Diani or Kilifi job that a Nairobi installer will not quote for.",
      seoTitle: "CCTV on the Kenyan Coast: Salt Air, Corrosion and What Survives",
      seoDescription:
        "Salt air kills coastal CCTV installations from the connections inwards. What corrodes first, what to specify instead, and what a coast-specification system costs.",
      tags: ["coast", "mombasa", "corrosion", "cctv"],
      body: `A CCTV system on the coast fails differently from one upcountry. It rarely fails at the camera. It fails at the connections, and it fails from the outside in.

We install on this coast exclusively, so this is what we actually see.

## What goes first

**Junction boxes and connector joints.** An unsealed box on a seafront wall will show green corrosion within a season and an intermittent fault within two. The camera is fine. The joint feeding it is not. This is the single most common coastal failure and it is entirely preventable at the point of installation.

**Screws and mounting brackets.** Ordinary plated screws rust, the bracket stains the wall, and eventually the mounting loosens. Stainless fixings cost a few shillings more per camera.

**Cable entry points.** Where the cable enters the camera housing or the box is where humidity gets in. A gland and a proper drip loop matter more here than anywhere else in Kenya.

**The recorder's hard disk, indirectly.** Humidity plus mains instability is hard on drives. This is why we fit surveillance-rated drives rather than desktop ones — they are built for continuous write and they tolerate the environment better.

## What does not matter as much as people think

**The camera's IP rating.** An IP66 or IP67 camera is standard and every serious brand meets it. Buying a higher-rated camera does not fix a system whose junction box is a plastic pattress with a hole drilled in it. Spend the money on the connection, not on the housing rating.

**Distance from the water.** Salt carries a long way inland on the sea breeze. Nyali, Bamburi and Mtwapa are all salt environments even where you cannot see the water from the site. Treating "seafront" as the only coastal spec is how a system two kilometres inland fails in year two.

## What we change on a coast job

- Sealed IP66 junction boxes as standard, not as an upgrade.
- Stainless fixings.
- Glands and drip loops at every cable entry.
- Connections made inside the box, never in free air.
- Surveillance-rated storage throughout.

That specification is a package on this site: the [Coast-Spec system](/solutions/coast-spec-4-camera-cctv) is ${kes(coast.subtotal)} for four cameras against ${kes(four.subtotal)} for the standard build — ${kes(coast.subtotal - four.subtotal)} more, which is less than one replacement camera and one callout.

## Holiday homes and empty properties

A large share of what we install between Diani and Watamu watches a house that is empty for months. That changes the design, not just the hardware:

- The owner is often out of the country and the caretaker is on site. Both need access, and they should not have the same access. That is a configuration decision made at handover.
- Mains power is not dependable enough to assume, which is why solar and 4G cameras do so much of the work on this coast — no trenching and no dependence on a supply that drops.
- Nobody is there to notice a camera has stopped. Remote health checks matter more here than in a house somebody lives in.

## The practical version

If you are getting quotes for a coastal property, ask two questions:

1. **What junction box are you fitting?** If the answer is not a sealed IP-rated box, you have found where the system will fail.
2. **What fixings?** If the answer is not stainless, the brackets will rust.

Neither adds much to a quotation. Both decide whether the system is still working in year three.`,
      faq: [
        {
          question: "Does salt air really damage CCTV cameras?",
          answer:
            "It damages the connections long before it damages the cameras. Modern cameras are IP66 or IP67 and cope well. The failures we see are corroded junction boxes, rusted fixings and green connector joints — all at the points where the installation was made, not in the equipment.",
        },
        {
          question: "How far inland does salt air affect an installation?",
          answer:
            "Further than most people assume. The sea breeze carries salt well inland, so Nyali, Bamburi, Shanzu and Mtwapa are all salt environments even where the water is not visible from the site. We specify sealed boxes as standard across the whole coastal strip rather than only on seafront properties.",
        },
        {
          question: "What does a coast-specification system cost?",
          answer: `Our four-camera coast-spec build is ${kes(coast.subtotal)} excluding VAT against ${kes(four.subtotal)} for the standard version — about ${kes(coast.subtotal - four.subtotal)} more. That is less than one replacement camera plus a callout, which is what the alternative usually costs in year two.`,
        },
      ],
    },

    // ══ Tier 5 · 30 — the page that gets shared ══════════════════════════════
    {
      slug: "how-to-read-a-cctv-quotation-kenya",
      title: "How to Read a CCTV Quotation in Kenya: Nine Ways Installers Overcharge",
      category: "Buying",
      author: "Hornbill Smart Security Services",
      excerpt:
        "A quotation with one line and one number cannot be checked, which is usually the point. Nine specific things to look for, and the questions that expose each one.",
      seoTitle: "How to Read a CCTV Quotation in Kenya: 9 Ways You Get Overcharged",
      seoDescription:
        "Nine specific things to check on a CCTV quotation in Kenya — hidden labour, vague accessories, undersized drives, missing model numbers — and the question that exposes each.",
      tags: ["buying", "quotations", "cctv", "kenya"],
      body: `Most CCTV quotations in Kenya are written to be impossible to compare. Not always dishonestly — often just because that is how it has always been done. Either way you end up choosing between three numbers with no idea what is inside them.

Here is what to look for. Every one of these is something we have seen on a quotation a customer brought to us.

## 1. One line reading "accessories"

The single most common line on a Kenyan CCTV quotation, and it can hide almost anything.

Here is what it is actually hiding. On our own four-camera system the cable, connectors, trunking, clips and power come to ${kes(fourConsumables)} — ${Math.round((fourConsumables / four.subtotal) * 100)}% of the whole job, every line of it published on the [package page](/solutions/home-colour-4-camera-colorvu-cctv). This is not a small line being rounded off. It is one of the largest lines on the quotation, and it is the one most often reduced to a single word.

**Ask:** how many metres of cable, how many connectors, how many lengths of trunking, and at what unit price each?

## 2. No model numbers

"4 x HD outdoor camera" tells you nothing. There is a factor of five in price between cameras that could all be described that way, and the difference in what they can actually see at night is enormous.

**Ask:** the exact model number of every camera and the recorder. Then search it. If the installer will not give you model numbers before you pay, that is the answer.

## 3. Labour folded into the equipment prices

If there is no labour line, it is in there somewhere. It has to be. Our published rate is ${kes(labourPoint)} per camera point — [we publish the whole rate card](/services) — and labour is normally between ${Math.round((Math.min(fourLabour / four.subtotal, sixteenLabour / sixteen.subtotal)) * 100)}% and ${Math.round((Math.max(fourLabour / four.subtotal, sixteenLabour / sixteen.subtotal)) * 100)}% of a job.

**Ask:** what is the labour charge, per point?

## 4. A hard disk sized for the invoice, not for the retention

A 1TB drive on eight cameras at 5MP does not give you thirty days. It might give you a week. You find this out the month you need footage from three weeks ago.

**Ask:** how many days of recording will this drive hold, at this resolution, on this number of cameras? Get the answer in writing.

## 5. A desktop hard disk in a recorder

A surveillance drive is built for continuous writing. A desktop drive is not, and it fails — usually inside two years, usually silently.

**Ask:** is this a surveillance-rated drive?

## 6. Cable quantity guessed rather than measured

A quotation that assumes a standard run per camera on a site nobody has walked is a quotation that will grow. Our own packages assume ${cablePerCamera} metres per camera and say so, which means we also have to say when a site needs more — before the work starts.

**Ask:** how many metres, and was that measured or assumed?

## 7. "Installation included" with no scope

Included up to what? Does it include the trunking? Working at height? Mains work? Coming back to configure your phone?

**Ask:** what is not included.

## 8. A free survey

Someone is paying for it. A free survey is a sales visit, and the cost of running them is inside the quotation you are being given. We charge ${kes(context.siteSurveyFee)}, credit it against the invoice, and give you a written report with camera positions marked up — yours to keep whether or not you use us.

**Ask:** what do I get from the survey, in writing?

## 9. No validity date

A quotation with no expiry is a quotation that can be revised when the shilling moves. Ours are valid ${context.quoteValidityDays} days.

**Ask:** how long is this price held?

## The one-question version

If you only ask one thing, ask this: **"Can you send me the quote with a price against every individual line?"**

The answer tells you most of what you need to know. Everything on this site is published that way already — [every package](/solutions), [every price](/price-list), [every labour rate](/services) — so you can put ours next to theirs line by line.

That is uncomfortable for us on the days we are the more expensive quote. It is still the right way to sell this.`,
      faq: [
        {
          question: "What should a CCTV quotation include?",
          answer:
            "Every item with its model number, quantity and unit price; the cable in metres; the connectors and trunking as their own lines; the hard disk with its capacity and the retention that gives you; labour as a separate line; VAT stated separately; and a validity date. If any of those is missing, ask for it before comparing the quote against another.",
        },
        {
          question: "Why do CCTV quotes in Kenya vary so much?",
          answer:
            "Mostly because they are not for the same thing. A camera described as 'HD outdoor' can vary by a factor of five in price, drives are sized differently, and some quotes include labour while others add it later. Once both quotations are itemised the gap usually turns out to be a real difference in specification rather than in margin.",
        },
        {
          question: "Should I pay a deposit before installation?",
          answer: `A deposit is normal — we ask for ${context.depositPercent}% before work begins, with the balance on completion. What is not normal is paying in full up front. If someone asks for the whole amount before any equipment is on site, that is worth pausing over.`,
        },
      ],
    },

    // == Tier 2 - 6: the coast land-grab, head-on ==============================
    {
      slug: "cctv-installation-mombasa-prices-coverage",
      title: `CCTV Installation in Mombasa ${publishedAt.getUTCFullYear()}: Prices, Coverage and What to Expect`,
      category: "Coast",
      author: "Hornbill Smart Security Services",
      excerpt: `What a CCTV system costs in Mombasa, itemised: ${kes(four.subtotal)} for four cameras at a home, ${kes(shop.subtotal)} for a shop, ${kes(eight.subtotal)} for eight at a business. Every area we cover, and what changes between them.`,
      seoTitle: `CCTV Installation Mombasa: Prices from ${kes(four.subtotal)} - ${publishedAt.getUTCFullYear()}`,
      seoDescription: `Itemised CCTV prices for Mombasa: ${kes(four.subtotal)} residential, ${kes(shop.subtotal)} retail, ${kes(eight.subtotal)} commercial, VAT-exclusive. Island, Nyali, Bamburi, Mtwapa, Likoni and the south coast.`,
      tags: ["mombasa", "pricing", "cctv", "coast"],
      body: `If you are getting CCTV quotes in Mombasa, here is what the work actually costs, what changes between neighbourhoods, and the questions worth asking whoever you end up using.

Prices are Kenyan Shillings, exclusive of VAT at ${context.vatRate}%, as at ${stamp}.

## What it costs

| System | Cameras | Total ex VAT | Full itemised bill |
|---|---:|---:|---|
| Residential | 4 | ${kes(four.subtotal)} | [Home Colour 4](/solutions/home-colour-4-camera-colorvu-cctv) |
| Shop or duka | 4 | ${kes(shop.subtotal)} | [Shop / Duka 4](/solutions/shop-duka-4-camera-cctv) |
| Small business | 8 | ${kes(eight.subtotal)} | [Business 8](/solutions/business-8-camera-colorvu-cctv) |
| Warehouse or yard | 16 | ${kes(sixteen.subtotal)} | [Commercial 16](/solutions/commercial-16-camera-cctv) |
| Coast specification | 4 | ${kes(coast.subtotal)} | [Coast-Spec CCTV](/solutions/coast-spec-4-camera-cctv) |

Every one of those links opens the complete bill of materials - the cameras with their part numbers, the recorder, the drive, the metres of cable, the connectors, the trunking and the labour, each with a price on it. Nobody else in this market publishes that, and the reason to is simple: it is the only way you can tell two quotes apart.

The whole [price list](/price-list) is public too, if you would rather check our figures item by item.

## Why the coast specification costs more

${kes(coast.subtotal - four.subtotal)} more than the standard four-camera build, and it is not a premium for its own sake.

Salt gets into everything here, and it does not attack the cameras - those are IP66 as standard from any serious brand. It attacks the connections. An unsealed junction box on a wall facing the water shows green corrosion within a season and an intermittent fault within two. So the coast build fits sealed IP66 boxes and stainless fixings as standard rather than as an upgrade, and the connections are made inside the box instead of in free air.

That is [written up in full here](/blog/cctv-kenyan-coast-salt-air-humidity-what-survives), including how far inland it matters - further than most people assume, because the sea breeze carries salt well past the point where you can still see the water.

## What changes by area

The island, Nyali, Bamburi, Mtwapa, Likoni, Diani, Kilifi and Malindi are genuinely different jobs, and any installer who quotes them identically has not thought about it:

- **[Mombasa Island](/services/cctv-installation/mombasa-island)** - older, often shared buildings, so cable routes cross space that belongs to somebody else. Getting that agreed before the day is half the job.
- **[Nyali](/services/cctv-installation/nyali)** - compounds with grounds. A camera aimed through a bougainvillea is a camera aimed at a bougainvillea in six months, so positions are set with a year of growth in mind.
- **[Bamburi and Shanzu](/services/cctv-installation/bamburi-shanzu)** - apartment blocks and hospitality. One recorder, access split between a caretaker and a committee. That is a configuration question, not a hardware one.
- **[Mtwapa](/services/cctv-installation/mtwapa)** - runs late, under mixed artificial light, which is exactly where ordinary infrared washes out and colour-at-night earns its money.
- **[Likoni and the south coast](/services/cctv-installation/likoni-south-coast)** - the ferry. A return trip can lose an afternoon to the queue, so the survey has to be thorough enough that the job is done in one visit.
- **[Diani and Ukunda](/services/cctv-installation/diani-ukunda)** - houses standing empty for months, owners abroad, a caretaker on site. Access has to be split, and mains power is not dependable enough to assume.

## Five questions worth asking any Mombasa installer

1. **What is the exact model number of every camera?** "4 x HD outdoor camera" spans a factor of five in price and an enormous difference in what you can actually see at night.
2. **What is the labour charge, per camera point?** Ours is ${kes(labourPoint)} and [we publish the whole rate card](/services). If a quote has no labour line, it is hidden inside the equipment prices.
3. **How many days of recording will that drive hold, at this resolution, on this many cameras?** Get it in writing. A 1TB drive on eight 5MP cameras is a week, not a month.
4. **Is it a surveillance-rated drive?** A desktop drive in a recorder fails, usually inside two years and usually silently.
5. **What junction box are you fitting?** On this coast, if the answer is not a sealed IP-rated box, you have just found where the system will fail.

There is a longer version of that list - [nine ways installers overcharge](/blog/how-to-read-a-cctv-quotation-kenya) - with the question that exposes each one.

## How we work

A survey first, ${kes(context.siteSurveyFee)}, credited against your invoice, with a written findings report and camera positions marked up that is yours whether or not you use us. Then a quotation with every line priced, valid ${context.quoteValidityDays} days. ${context.depositPercent}% deposit to start. ${context.warrantyMonths} months on workmanship.

Or skip all of that for now and [build the system yourself](/build/cctv) - six questions, and you get the same itemised bill we would send you.`,
      faq: [
        {
          question: "How much does CCTV installation cost in Mombasa?",
          answer: `As at ${stamp}: ${kes(four.subtotal)} for a complete four-camera residential system, ${kes(shop.subtotal)} for a shop, ${kes(eight.subtotal)} for eight cameras at a business, all excluding VAT and all including cameras, recorder, drive, cabling, connectors, trunking and labour. The coast specification, with sealed junction boxes and stainless fixings throughout, is ${kes(coast.subtotal)} for four cameras.`,
        },
        {
          question: "Do you charge extra to come to Mtwapa, Diani or Kilifi?",
          answer:
            "Not as a callout fee. Distance affects how we plan a job rather than what we charge for it - Malindi and Watamu are quoted as a planned visit with everything on the vehicle rather than as a callout, which is cheaper for you. If travel does change a price we say so before you commit, not at the invoice.",
        },
        {
          question: "How long does a Mombasa installation take?",
          answer:
            "A four-camera residential job is normally one day, eight cameras one to two. Older buildings on the island with no existing conduit take longer, and establishing that is the main thing the survey is for.",
        },
        {
          question: "Which areas of Mombasa do you cover?",
          answer:
            "Mombasa Island, Nyali, Bamburi and Shanzu, Tudor and Kizingo, Likoni and the south coast approach, Mtwapa, Diani and Ukunda, Kilifi, Malindi and Watamu, and the Mariakani-Mazeras corridor. Each has its own page with what is actually different about installing there.",
        },
      ],
    },

    // == Tier 2 - 14: the highest-value work nobody is targeting ===============
    {
      slug: "securing-holiday-home-airbnb-south-coast",
      title: "Securing a Holiday Home or Airbnb on the South Coast",
      category: "Coast",
      author: "Hornbill Smart Security Services",
      excerpt: `A house that is empty for months is a different problem from one you live in. What to fit, what it costs - from ${kes(solar.subtotal)} for a single wire-free camera to ${kes(holiday.subtotal)} for a two-camera holiday-home setup - and how to give a caretaker access without giving them everything.`,
      seoTitle: "Securing a Holiday Home or Airbnb on the South Coast: What to Fit and What It Costs",
      seoDescription: `Diani, Galu and Watamu holiday homes: solar and 4G cameras from ${kes(solar.subtotal)}, a two-camera setup at ${kes(holiday.subtotal)}, and how to split access between an absent owner and a caretaker.`,
      tags: ["diani", "holiday home", "airbnb", "solar", "coast"],
      body: `Most of what we install between Diani and Watamu watches a house that nobody is in. That single fact changes the whole design, and it is why a system copied from a Nairobi suburb does not work here.

Prices are VAT-exclusive, as at ${stamp}.

## The three things that make it different

**Nobody is there to notice a failure.** In a house you live in, you find out a camera has stopped because you looked. In an empty house you find out when you need footage, which is the worst possible moment. That makes remote health visibility more important than another camera.

**Mains power is not dependable enough to assume.** Long outages are normal, and a system that stops recording during one is a system that was not there. This is why solar and 4G cameras do so much of the work on this coast - no trenching, no dependence on a supply that drops, and nothing to reinstall if the plot changes hands.

**Two people need access, and not the same access.** The owner is often out of the country. A caretaker, a manager or a cleaner is on site. Giving the caretaker the admin account is how a system gets reconfigured by somebody with good intentions; giving them nothing is how you end up being phoned in another time zone to check whether the gate is shut. That split is a configuration decision made at handover, and it is the part most installers skip.

## What it costs

| Setup | What it is | Total ex VAT |
|---|---|---:|
| [Wire-Free Solar 4G](/solutions/wire-free-solar-4g-camera) | One solar camera on its own SIM, recording to a card. No mains, no cabling, no recorder. | ${kes(solar.subtotal)} |
| [Holiday Home / Airbnb](/solutions/holiday-home-airbnb-cctv) | Two cameras covering the approach and the entrance, card recording, remote viewing for owner and caretaker. | ${kes(holiday.subtotal)} |
| [Coast-Spec CCTV](/solutions/coast-spec-4-camera-cctv) | Four cameras, a recorder and a drive, built for salt: sealed IP66 boxes and stainless fixings throughout. | ${kes(coast.subtotal)} |

Each link opens the complete bill of materials with a price on every line.

Which of those is right depends less on the size of the house than on whether anybody is there. A cottage let out through the season and a four-bedroom villa used three weeks a year are different jobs.

## Where to point them

In this order, because it is the order things actually happen:

1. **The approach and the gate.** Almost everything that matters is decided here, and it is the only camera that gets you a face and a vehicle together. Two angles on a gate - one for the vehicle, one for whoever walks in beside it - is worth more than two extra cameras elsewhere.
2. **The main entrance.** Who came in, when, and whether they had a key.
3. **The boundary where it is weakest.** Usually where it meets a plot that is still empty, or where vegetation gives cover.

Inside the house is normally the wrong instinct. If someone is already inside, the useful footage was taken outside twenty minutes earlier.

## The legal part, for a let property

If you let the house out, guests have a reasonable expectation of privacy and Kenya's Data Protection Act 2019 applies to you as much as to a business. Practically:

- Cameras cover approaches, entrances and the boundary. Never a bedroom, a bathroom, or inside a space a guest has exclusive use of.
- Say in the listing that there is exterior CCTV. Every major platform requires disclosure, and an undisclosed camera found by a guest is a delisting and a refund, not a warning.
- Do not run indoor cameras in a let property. There is no version of that which ends well.

We will tell you if a camera position we have been asked for is one we think you should not have.

## Salt, again

Diani and Galu are as exposed as anywhere we work. What fails is never the camera - it is the junction box, the fixings and the cable entry. Sealed boxes, stainless screws and a proper gland at every entry are the difference between a system still working in year three and one that starts dropping a channel in month eight. [The full version of that is here](/blog/cctv-kenyan-coast-salt-air-humidity-what-survives).

## If you are not in the country

That is normal for this work, and it is worth saying how it goes. Send photographs and a rough plan on WhatsApp and we can price it without a visit. The survey happens with whoever is on site. Photographs of the finished installation go to you, and remote viewing is set up on your phone before we leave, wherever your phone is.

${kes(context.siteSurveyFee)} for the survey, credited to your invoice. ${context.depositPercent}% deposit to begin, balance on completion, and ${context.warrantyMonths} months on workmanship.

Nobody else on this coast is building specifically for this market, and it is the highest-value work we do.`,
      faq: [
        {
          question: "What CCTV works in a holiday home with no reliable mains power?",
          answer: `A solar camera with its own 4G SIM, recording to a card in the camera. There is no recorder to keep powered, no cabling to trench and nothing that stops working during an outage. One is ${kes(solar.subtotal)} installed, excluding VAT, and a two-camera holiday-home setup is ${kes(holiday.subtotal)}.`,
        },
        {
          question: "Can my caretaker see the cameras without controlling the system?",
          answer:
            "Yes, and they should. We set up separate access at handover so a caretaker can view the cameras they need without being able to reconfigure the system, delete footage or add users. Getting that split right is the part of a holiday-home installation most installers skip.",
        },
        {
          question: "Can I put cameras inside a house I rent out on Airbnb?",
          answer:
            "No, and we will not fit them. Guests have a reasonable expectation of privacy, Kenya's Data Protection Act 2019 applies, and every major letting platform requires disclosure of exterior cameras and prohibits interior ones in private spaces. Exterior cameras on approaches and entrances, disclosed in the listing, are both legal and effective.",
        },
        {
          question: "Do I need to be there for the installation?",
          answer:
            "No. Most of the owners we do this work for are out of the country. We price from photographs and a plan over WhatsApp, survey with whoever is on site, send you photographs of the finished job, and set up remote viewing on your phone wherever you are.",
        },
      ],
    },

    // == Tier 3 - 15 =========================================================
    {
      slug: "cctv-cost-per-camera-kenya",
      title: "What Does CCTV Cost Per Camera in Kenya?",
      category: "Costs",
      author: "Hornbill Smart Security Services",
      excerpt: `Per camera it falls from about ${kes(Math.round(four.subtotal / 4))} on a four-camera job to ${kes(Math.round(sixteen.subtotal / 16))} on sixteen — because the recorder, the survey and the setup do not multiply. Why a "per camera" price is the wrong question, and what to ask instead.`,
      seoTitle: `CCTV Cost Per Camera in Kenya: ${kes(Math.round(sixteen.subtotal / 16))} to ${kes(Math.round(four.subtotal / 4))}`,
      seoDescription: `Real per-camera figures from complete installed systems: ${kes(Math.round(four.subtotal / 4))} at four cameras down to ${kes(Math.round(sixteen.subtotal / 16))} at sixteen, VAT-exclusive, itemised.`,
      tags: ["pricing", "cctv", "per camera", "kenya"],
      body: `"How much per camera?" is the first question almost everybody asks, and it is the one question a CCTV system cannot honestly answer with a single number. Here is why, with the real figures.

Prices are VAT-exclusive, as at ${stamp}.

## The actual numbers

| System | Cameras | Total ex VAT | Per camera |
|---|---:|---:|---:|
| [Home Colour 4](/solutions/home-colour-4-camera-colorvu-cctv) | 4 | ${kes(four.subtotal)} | ${kes(Math.round(four.subtotal / 4))} |
| [Business 8](/solutions/business-8-camera-colorvu-cctv) | 8 | ${kes(eight.subtotal)} | ${kes(Math.round(eight.subtotal / 8))} |
| [Commercial 16](/solutions/commercial-16-camera-cctv) | 16 | ${kes(sixteen.subtotal)} | ${kes(Math.round(sixteen.subtotal / 16))} |

The per-camera figure falls by roughly ${Math.round((1 - sixteen.subtotal / 16 / (four.subtotal / 4)) * 100)}% between the smallest and largest of those. Nothing got cheaper — the fixed costs simply spread further.

## What does not multiply

Three things on every job are paid once regardless of camera count:

- **The recorder.** A ${dvr16.name} is ${kes(dvr16.price)} whether you put four cameras on it or sixteen.
- **The survey.** ${kes(context.siteSurveyFee)}, once.
- **A share of the setup.** Configuring remote viewing, retention and motion zones is largely per-system, not per-camera.

What *does* multiply is the camera, its cable, its connectors, its share of the trunking, and ${kes(labourPoint)} of labour per point. That is the marginal cost of camera number nine, and it is far below the average cost of cameras one to eight.

## So what should you ask instead?

**"What is the total, itemised?"** Then divide it yourself if you want to. A per-camera price quoted before anybody has seen your site is either a guess or a bundle with things left out of it.

If you do want a single number to sanity-check a quotation, use the marginal one: adding a camera to a system with a spare recorder channel should cost roughly the camera plus ${kes(labourPoint)} plus a few hundred shillings of cable and connectors. If somebody quotes you the *average* price for one extra camera, they are charging you for a second recorder you are not getting.

## The trap in the other direction

A very low per-camera price usually means one of three things, and it is worth knowing which:

1. **A cheaper camera.** There is a factor of five between cameras that could all be described as "HD outdoor".
2. **A smaller drive.** Which shows up as retention, not as a price — and you find out weeks later.
3. **Labour hidden in the equipment lines.** So the total moves once the work starts.

[Every package on this site](/solutions) shows the whole bill, so you can see which of those is happening. Or [build your own](/build/cctv) and get the same table for your own camera count.`,
      faq: [
        {
          question: "How much does one CCTV camera cost installed in Kenya?",
          answer: `On a new four-camera system the average works out at about ${kes(Math.round(four.subtotal / 4))} per camera including its share of the recorder, drive, cable and labour. Adding one camera to an existing system with a spare channel is much less — roughly the camera itself plus ${kes(labourPoint)} labour plus cable and connectors — because the recorder is already paid for.`,
        },
        {
          question: "Is it cheaper per camera to install more cameras?",
          answer: `Yes, substantially. Our own figures run from ${kes(Math.round(four.subtotal / 4))} per camera at four down to ${kes(Math.round(sixteen.subtotal / 16))} at sixteen, because the recorder, the survey and much of the configuration are paid once however many cameras hang off them.`,
        },
        {
          question: "Why do installers not publish a per-camera price?",
          answer:
            "The honest reason is that it depends on the camera, the cable run and the recorder, so any single figure is wrong before it is written down. The less honest reason is that a bundled figure cannot be compared against anybody else's.",
        },
      ],
    },

    // == Tier 3 - 16 =========================================================
    {
      slug: "cctv-cost-three-bedroom-house-kenya",
      title: "How Much Does CCTV Cost for a Three-Bedroom House in Kenya?",
      category: "Costs",
      author: "Hornbill Smart Security Services",
      excerpt: `${kes(four.subtotal)} for the system most three-bedroom houses should actually buy, itemised line by line — and ${kes(fourEssential.subtotal)} for the cheaper build, with an honest account of what you give up.`,
      seoTitle: `CCTV Cost for a 3-Bedroom House in Kenya: ${kes(fourEssential.subtotal)}–${kes(four.subtotal)}`,
      seoDescription: `What CCTV costs on a three-bedroom Kenyan house: ${kes(fourEssential.subtotal)} for infrared, ${kes(four.subtotal)} for colour at night, both complete and itemised. VAT-exclusive.`,
      tags: ["pricing", "residential", "cctv", "kenya"],
      body: `A three-bedroom house is the most common job we quote, so this is the most useful number on the site for most people reading it.

**Four cameras, complete and installed: ${kes(fourEssential.subtotal)} to ${kes(four.subtotal)} excluding VAT.** The difference between those two figures is whether you get colour footage after dark, and it is the single decision worth thinking about.

## Where four cameras go on a three-bedroom house

Almost every house we survey ends up with the same four, in this order of usefulness:

1. **The gate or the drive.** The only position that reliably gets you a face and a vehicle together.
2. **The front door.** Who came in, when, and whether they had a key.
3. **The back or the service entrance.** Which is where most actual entries happen.
4. **The weakest boundary.** Usually where the compound meets an empty plot or where vegetation gives cover.

Inside the house is normally the wrong instinct. If somebody is already indoors, the footage that mattered was taken outside twenty minutes earlier.

## The cheaper build — ${kes(fourEssential.subtotal)}

${bomTable(fourEssential)}

Live table: [Home Essential 4](/solutions/home-essential-4-camera-analog-cctv).

Infrared night vision, so after dark the footage is black and white. It tells you a person was there, their build and their direction. It does not tell you the colour of their shirt or their car.

## The one most houses should buy — ${kes(four.subtotal)}

${bomTable(four)}

Live table: [Home Colour 4](/solutions/home-colour-4-camera-colorvu-cctv).

${kes(four.subtotal - fourEssential.subtotal)} more, and what it buys is colour at night. That is not a luxury feature — it is the difference between footage that identifies somebody and footage that shows that somebody was present. If you are going to spend ${kes(fourEssential.subtotal)}, this is where the next ${kes(four.subtotal - fourEssential.subtotal)} does the most work of any money on the quotation.

## What is not in either figure

- **VAT** at ${context.vatRate}%.
- **Trenching, a pole, or mains electrical work.** Quoted separately after a survey if the site needs it.
- **A UPS.** Worth having where the supply is unreliable, and not assumed here.
- **Unusually long cable runs.** These assume about ${cablePerCamera} m per camera. Large compounds and older houses with no conduit run longer, and the survey is where that is established — before you commit.

## If you are on the coast

Add roughly ${kes(coast.subtotal - four.subtotal)} for the [coast specification](/solutions/coast-spec-4-camera-cctv): sealed IP66 junction boxes and stainless fixings throughout. On this coast the connections corrode long before the cameras do, and that is [worth understanding properly](/blog/cctv-kenyan-coast-salt-air-humidity-what-survives) before you compare quotes.

## Getting your own number

[Build it yourself](/build/cctv) — six questions and you get this exact table for your own house. A survey is ${kes(context.siteSurveyFee)}, credited against your invoice.`,
      faq: [
        {
          question: "How much is CCTV for a 3-bedroom house in Kenya?",
          answer: `${kes(fourEssential.subtotal)} to ${kes(four.subtotal)} excluding VAT for four cameras complete — cameras, recorder, surveillance drive, cabling, connectors, trunking, power and labour. The lower figure gives black-and-white footage at night; the higher one keeps full colour after dark, which is the difference between identifying somebody and merely recording that they were there.`,
        },
        {
          question: "How many cameras does a three-bedroom house need?",
          answer:
            "Four covers it well: the gate or drive, the front door, the back or service entrance, and the weakest boundary. Six is worth it on a larger plot or where the boundary is long. More than that on a normal house usually means cameras watching each other.",
        },
        {
          question: "Is colour night vision worth the extra money?",
          answer: `On our figures it is ${kes(four.subtotal - fourEssential.subtotal)} on a four-camera job, and it is the best-value line on the quotation. Infrared footage tells you somebody was there. Colour footage tells you what they were wearing and what they were driving, which is the difference between useful and merely reassuring.`,
        },
      ],
    },

    // == Tier 3 - 17 =========================================================
    {
      slug: "cctv-for-shop-duka-kenya",
      title: "CCTV for Your Shop or Duka: What It Costs and Where to Point It",
      category: "Costs",
      author: "Hornbill Smart Security Services",
      excerpt: `${kes(shop.subtotal)} for a four-camera retail system, itemised — and the camera position that pays for the whole thing, which is not the one most shopkeepers ask for.`,
      seoTitle: `CCTV for a Shop or Duka in Kenya: ${kes(shop.subtotal)} Itemised`,
      seoDescription: `Retail CCTV in Kenya from ${kes(shop.subtotal)} complete: four cameras, thirty days of footage, itemised line by line. Where to point them and why the till comes first.`,
      tags: ["retail", "pricing", "cctv", "shop"],
      body: `Most shop owners ask for cameras on the door. The camera that actually pays for the system is the one on the till.

**Four cameras, thirty days of footage, complete: ${kes(shop.subtotal)} excluding VAT.**

## Why thirty days and not fourteen

A domestic system can get away with two weeks because you notice a break-in the next morning. Retail loss does not work like that. A discrepancy surfaces at a stock count, which might be three weeks after the event, and footage that has already been overwritten is footage you paid for and cannot use.

That is the main thing separating this package from the residential build: a bigger drive, sized for thirty days rather than fourteen.

## The bill

${bomTable(shop)}

Live table: [Shop / Duka 4](/solutions/shop-duka-4-camera-cctv).

## Where the four cameras go

1. **Over the till, looking down at the counter and the hands.** This is the one. Most retail loss is at the point of sale, not through the door, and this is the only camera that shows a transaction that did not get rung up.
2. **The entrance, at face height.** Not up in a corner looking at the tops of heads.
3. **The stockroom or the back door.** Where deliveries arrive and where stock leaves.
4. **The shop floor**, covering the aisle with the small expensive things in it.

The order matters because if the budget only stretches to two cameras, it should be the till and the stockroom — not the two everybody assumes.

## What it will and will not do

It will show you a transaction that was not entered, a delivery that was short, and who was in the shop at a given minute. Reviewed weekly it changes behaviour, which is most of the value.

It will not stop somebody walking out with something while you are serving another customer. And it is not an inventory system — it tells you what happened, not what is missing.

## Staff, and the law

If your staff are recorded, they must know. Notice, signage, and a stated reason. Consent is a weak basis in employment because an employee cannot freely refuse, so legitimate interest is normally the right footing — and continuous monitoring of one person at their station is a different thing that needs a written assessment first.

The practical version is [on our law page](/cctv-and-the-law-in-kenya). It matters more in a shop than in a house, because a house does not have employees.

## Bigger premises

A supermarket or a hardware with several aisles is an eight-camera job at [${kes(eight.subtotal)}](/solutions/business-8-camera-colorvu-cctv). Beyond that the question stops being cameras and starts being whether anybody is watching them.

Survey ${kes(context.siteSurveyFee)}, credited to your invoice. Or [price it yourself](/build/cctv) first.`,
      faq: [
        {
          question: "How much does CCTV cost for a shop in Kenya?",
          answer: `${kes(shop.subtotal)} excluding VAT for a complete four-camera retail system with thirty days of footage — cameras, recorder, surveillance drive, cabling, connectors, trunking, power and labour, every line published. A larger premises needing eight cameras is ${kes(eight.subtotal)}.`,
        },
        {
          question: "Where should I put cameras in a shop?",
          answer:
            "Over the till first, looking down at the counter and the hands — most retail loss is at the point of sale rather than through the door, and it is the only camera that shows a transaction that was not rung up. Then the entrance at face height, the stockroom or back door, and the aisle with the expensive stock.",
        },
        {
          question: "Can I record my staff at work?",
          answer:
            "In shared and work areas, yes, provided they know: notice, signage and a stated reason. Not in changing areas or rest areas. Continuous monitoring of an individual at their station is much harder to justify and needs a written impact assessment before it starts rather than after somebody complains.",
        },
        {
          question: "How long should a shop keep footage?",
          answer:
            "Thirty days is what most retail sites can defend, because a stock discrepancy often surfaces weeks after the event. Fourteen days is usually too short for retail even though it is fine for a house.",
        },
      ],
    },

    // == Tier 3 - 19 =========================================================
    {
      slug: "dvr-nvr-prices-kenya-4-8-16-32-channel",
      title: "DVR and NVR Prices in Kenya: 4, 8, 16 and 32 Channel",
      category: "Costs",
      author: "Hornbill Smart Security Services",
      excerpt: `Every recorder we stock with its price and its part number — ${kes(dvr4.price)} for a four-channel DVR up to ${kes(nvr32.price)} for a 32-channel PoE NVR — and the sizing mistake that costs the most.`,
      seoTitle: `DVR and NVR Price List Kenya: 4, 8, 16, 32 Channel — from ${kes(dvr4.price)}`,
      seoDescription: `Current Kenyan DVR and NVR prices with full part numbers: ${kes(dvr4.price)} four-channel to ${kes(nvr32.price)} 32-channel PoE NVR. KES, VAT-exclusive, updated monthly.`,
      tags: ["dvr", "nvr", "pricing", "recorders"],
      body: `The recorder is the one part of a CCTV system you cannot upgrade halfway. Cameras can be added, a drive can be swapped, but a four-channel DVR takes four cameras and that is the end of it.

Prices are VAT-exclusive, as at ${stamp}. The [full price list](/price-list) has every model.

## Analog recorders (DVR)

| Part number | Channels | Price |
|---|---:|---:|
| \`${dvr4.sku}\` | 4 | ${kes(dvr4.price)} |
| \`${dvr8.sku}\` | 8 | ${kes(dvr8.price)} |
| \`${dvr16.sku}\` | 16 | ${kes(dvr16.price)} |
| \`${dvr32.sku}\` | 32 | ${kes(dvr32.price)} |

These record analog cameras over coaxial cable and handle 5MP perfectly well, so an analog system in ${publishedAt.getUTCFullYear()} is not the compromise it was ten years ago.

## IP recorders (NVR)

| Part number | Channels | Price |
|---|---:|---:|
| \`${nvr8.sku}\` | 8 | ${kes(nvr8.price)} |
| \`${nvr32.sku}\` | 32, with 16 PoE ports | ${kes(nvr32.price)} |

An NVR costs more than a DVR of the same channel count, and some of that comes back: the PoE ports power the cameras down the same network cable, so there is no separate power supply and no power run to each camera.

## The sizing mistake

**Going from four cameras to five means a new recorder.** The step from a four-channel to an eight-channel DVR is ${kes(dvr8.price - dvr4.price)} — less than one camera. Buying the four-channel and then needing five costs you the whole ${kes(dvr4.price)} again.

So the question at survey is not how many cameras you want now. It is how many you might want in three years. Most houses that start with four end up at six.

## Plastic or metal chassis

Both series exist at every channel count and the metal one costs a little more. It is not marketing: a metal chassis runs cooler, and a recorder that runs hot in a Mombasa ceiling void is a recorder with a shorter life and a drive under more stress. We fit metal as standard on anything that is not going in an air-conditioned room.

## What the recorder does not decide

**Retention.** That is cameras × resolution × days, and it is set by the drive, not the recorder. A 32-channel NVR with a 1TB drive holds a couple of days. [Size it properly](/tools/storage-calculator) — it is the number most quotations get wrong.

## Two-way audio models

The hybrid two-way-audio DVRs let you speak through a compatible camera. Genuinely useful at a gate or a yard; pointless everywhere else, and worth knowing that it only works with cameras that support it.

Every recorder here is priced individually on the [price list](/price-list), and every [packaged system](/solutions) shows which one it uses and why.`,
      faq: [
        {
          question: "How much is a DVR in Kenya?",
          answer: `As at ${stamp}: ${kes(dvr4.price)} for a four-channel, ${kes(dvr8.price)} for eight, ${kes(dvr16.price)} for sixteen and ${kes(dvr32.price)} for a 32-channel, all excluding VAT and all metal-chassis models. An 8-channel 4K NVR for IP cameras is ${kes(nvr8.price)}.`,
        },
        {
          question: "What is the difference between a DVR and an NVR?",
          answer:
            "A DVR records analog cameras over coaxial cable with a separate power run to each. An NVR records IP cameras over network cable and usually powers them down the same cable, so it is one run per camera instead of two. The NVR costs more up front and adding a camera later is easier.",
        },
        {
          question: "Should I buy a bigger recorder than I need?",
          answer: `Usually yes, and the arithmetic is stark: stepping from a four-channel to an eight-channel is ${kes(dvr8.price - dvr4.price)}, while discovering you need a fifth camera later costs you a whole second recorder. Most houses that start with four cameras end up at six.`,
        },
        {
          question: "How many cameras can a 4-channel DVR take?",
          answer:
            "Four. It is a hard limit, not a recommendation, and it is the single most common reason a system has to be part-replaced two years in.",
        },
      ],
    },

    // == Tier 3 - 20 =========================================================
    {
      slug: "cctv-cable-rg59-vs-cat6-prices-how-much",
      title: "CCTV Cable: RG59 vs Cat6, Prices, and How Much You Actually Need",
      category: "Costs",
      author: "Hornbill Smart Security Services",
      excerpt: `A 305 m box of RG59 siamese is ${kes(coax.price)} and Cat6 is ${kes(cat6.price)} — and the metres, connectors and trunking together are usually the largest line on a quotation after the cameras. How to check the quantity.`,
      seoTitle: `CCTV Cable Prices Kenya: RG59 vs Cat6, and How Many Metres You Need`,
      seoDescription: `RG59 siamese ${kes(coax.price)} per 305 m box, Cat6 ${kes(cat6.price)}, connectors priced, and the ${cablePerCamera} m per camera rule for checking a quotation's cable quantity.`,
      tags: ["cable", "pricing", "rg59", "cat6"],
      body: `Cable is the line on a CCTV quotation nobody checks, and it is one of the largest. On our own four-camera system the cable, connectors, trunking, clips and power come to ${kes(fourConsumables)} — ${Math.round((fourConsumables / four.subtotal) * 100)}% of the whole job.

Prices are VAT-exclusive, as at ${stamp}.

## What it costs

| Item | Part number | Unit | Price |
|---|---|---|---:|
| RG59 siamese coax + power | \`${coax.sku}\` | 305 m box | ${kes(coax.price)} |
| Cat6 pure copper UTP | \`${cat6.sku}\` | 305 m box | ${kes(cat6.price)} |
| BNC connectors | \`${bnc.sku}\` | pack of 10 | ${kes(bnc.price)} |
| Cat6 RJ45 connectors | \`${rj45.sku}\` | pack of 100 | ${kes(rj45.price)} |
| PVC trunking 25 × 16 mm | \`${trunking.sku}\` | 2 m length | ${kes(trunking.price)} |

A 305 m box works out at about ${kes(Math.round(coax.price / 305))} a metre for coax and ${kes(Math.round(cat6.price / 305))} for Cat6, which is the number to have in your head when you read a quotation.

## Which cable

**RG59 siamese** for analog cameras. It is coax for the video with a power pair bonded alongside, so one run carries both. If your walls already have coax in them from an older system, a modern analog camera reuses it at 5MP — and that saving is often larger than the difference between an analog and an IP system in the first place.

**Cat6** for IP cameras. One cable carries data and power together, so it is one run per camera instead of two. Cat6 is right for essentially every camera installation; Cat6A earns its extra cost on long runs, heavy interference, or a building you expect to still be using in fifteen years. Anyone selling you Cat6A for a four-camera house is selling you cable.

**The 90 metre limit** on a copper run is the standard's limit, not a guideline. Past it you want fibre or a switch in between, and a quotation with a 120 m Cat6 run in it has a problem you should raise.

## How much you need

Our packages assume **${cablePerCamera} metres per camera** for a residential job and **${trunkingPerCamera} metres of trunking** to run it in. That is the figure to check a quotation against:

- Four cameras ≈ ${cablePerCamera * 4} m, so one 305 m box covers it with plenty spare.
- Sixteen cameras ≈ ${cablePerCamera * 16} m, still inside a box and a bit.

The assumption breaks on large compounds, on older buildings with no conduit to reuse, and anywhere the recorder is not roughly central. A quotation that assumed a standard run on a site nobody walked is a quotation that will grow, which is why the survey exists.

**Ask for the metres.** A quotation with a single cabling figure and no quantity behind it is the line to question first — on a four-camera job that line should be somewhere near ${kes(fourConsumables)}, and you cannot tell whether it is without the metres. It is the easiest place on a quotation to add margin invisibly, because nobody counts cable after it is in the wall.

## Trunking, which is not optional

The plastic channel the cable runs in where it is surface-mounted. It protects the cable, and it is the difference between an installation that looks finished and one that looks improvised. At ${trunkingPerCamera} m per camera it is often the largest single consumable line on a job — ${kes(trunking.price)} a length adds up fast, and a quotation that does not mention containment has either hidden it or is not going to fit any.

## Honest note on these prices

The cable, connector and trunking prices above are our estimated trade rates rather than confirmed distributor figures — our own supplier list covers cameras, recorders and drives but not consumables. They are marked as estimates on every bill of materials they appear in, and the affected share of each package total is published. We would rather tell you that than quietly present an estimate as a firm price.`,
      faq: [
        {
          question: "How much does CCTV cable cost in Kenya?",
          answer: `A 305 m box of RG59 siamese coax with power is ${kes(coax.price)} and a 305 m box of Cat6 pure copper is ${kes(cat6.price)}, both excluding VAT — roughly ${kes(Math.round(coax.price / 305))} and ${kes(Math.round(cat6.price / 305))} a metre. Connectors are ${kes(bnc.price)} for ten BNC or ${kes(rj45.price)} for a hundred RJ45.`,
        },
        {
          question: "How many metres of cable do I need per camera?",
          answer: `We budget ${cablePerCamera} metres per camera on a residential job plus ${trunkingPerCamera} metres of trunking to run it in. Four cameras is about ${cablePerCamera * 4} metres, so a single 305 m box covers it comfortably. Large compounds, older buildings with no conduit, and a recorder that is not roughly central all push it up — which is what the survey establishes.`,
        },
        {
          question: "Can I use Cat6 for analog cameras?",
          answer:
            "Yes, with a balun at each end to convert the video onto twisted pair. It is a common and sensible retrofit where Cat cable is already in the walls and coax is not.",
        },
        {
          question: "Is Cat6A worth paying for?",
          answer:
            "On long runs, in heavy electrical interference, or when cabling a building once for the next fifteen years — yes. On a four-camera house, no. Cat6 is the correct specification for essentially every camera installation.",
        },
      ],
    },

    // == Tier 3 - 25 =========================================================
    {
      slug: "nanny-camera-prices-kenya-and-what-is-legal",
      title: "Nanny Camera Prices in Kenya — and What Is Actually Legal",
      category: "Buying",
      author: "Hornbill Smart Security Services",
      excerpt: `From ${kes(nannyBasic.price)} for an indoor camera to ${kes(nannyPlus.subtotal)} for a three-camera setup installed — and the four positions we will not fit one in, whatever you are willing to pay.`,
      seoTitle: `Nanny Camera Prices Kenya from ${kes(nannyBasic.price)} — and What Is Legal`,
      seoDescription: `Indoor and nanny camera prices in Kenya from ${kes(nannyBasic.price)}, installed and app-configured. Plus the positions that are not lawful, which almost nobody selling these will tell you.`,
      tags: ["nanny camera", "indoor", "legal", "pricing"],
      body: `This is the one category where the legal question matters more than the price, and where almost nobody selling the cameras will raise it. So the prices are below, and then the part that matters.

Prices are VAT-exclusive, as at ${stamp}.

## What they cost

| Setup | What it is | Price |
|---|---|---:|
| \`${nannyBasic.sku}\` | ${nannyBasic.name} | ${kes(nannyBasic.price)} |
| \`${nannyBattery.sku}\` | ${nannyBattery.name} | ${kes(nannyBattery.price)} |
| [Nanny Cam Starter](/solutions/nanny-cam-starter) | One camera, fitted, app configured | ${kes(nannyStarter.subtotal)} |
| [Nanny Cam Plus](/solutions/nanny-cam-plus) | Three cameras, fitted, app configured | ${kes(nannyPlus.subtotal)} |

You can buy the camera itself online for close to our price and we are not going to pretend otherwise — the dealer-to-Jumia spread on consumer smart-home kit is thin. What the package adds is fitting it where it actually sees something, getting the app working on every phone that needs it, and setting the notification and retention behaviour so it is still switched on in a month.

## Where they are legal

In your own home, in shared and living areas, recording your own household: yes. That is the ordinary case and there is nothing difficult about it.

Two conditions we would still hold you to:

- **Tell the person.** A nanny, a house help, a driver — they should know a camera is there. Kenya's Data Protection Act 2019 applies to households more than most people assume, and a camera somebody discovers is a camera that ends an employment relationship badly and possibly a complaint.
- **Audio is different from video.** Recording conversations is a higher bar than recording pictures. If you do not need the audio, turn it off.

## Where they are not, and we will not fit them

Four positions, and this is not negotiable at any price:

1. **A bathroom.** Ever, for any reason.
2. **A bedroom** — including a child's bedroom where a live-in worker sleeps or changes.
3. **A live-in worker's own room.** It is their private space. That it is inside your house does not change it.
4. **Anywhere in a property you let out** where a guest has exclusive use. Every major letting platform prohibits it, and it is a delisting and a refund rather than a warning.

We have lost work over this list. It stays.

## What they are actually good at

Watching a room where a child is, in daylight, on a good Wi-Fi signal, with somebody occasionally looking at the app. That is a genuinely useful thing and it is what these are for.

What they are poor at: anything outdoors — most of them are not rated for it whatever the listing says; anywhere the Wi-Fi is weak at the camera position, which no better camera will fix; and surviving the theft of the camera itself, because the footage is on a card inside it.

## If you actually want security rather than reassurance

An indoor Wi-Fi camera is not a security system. If the concern is entry rather than supervision, [a four-camera outdoor system](/solutions/home-colour-4-camera-colorvu-cctv) at ${kes(four.subtotal)} does a completely different job — and the useful footage of a break-in is almost always taken outside, before anybody got in.

More on the legal side is [on our law page](/cctv-and-the-law-in-kenya), including what the ODPC's draft guidance for the sector actually asks for.`,
      faq: [
        {
          question: "How much is a nanny camera in Kenya?",
          answer: `From ${kes(nannyBasic.price)} for an indoor 1080p Wi-Fi camera, or ${kes(nannyStarter.subtotal)} for one fitted with the app configured on every phone that needs it. A three-camera setup installed is ${kes(nannyPlus.subtotal)}, all excluding VAT.`,
        },
        {
          question: "Is it legal to put a camera in my house where my house help works?",
          answer:
            "In shared and living areas, generally yes — and you should tell them it is there. Not in a bathroom, not in a bedroom, and not in a live-in worker's own room, which is their private space even though it is in your house. We will decline to fit those positions.",
        },
        {
          question: "Can I record audio as well?",
          answer:
            "Recording conversations is a higher legal bar than recording pictures, and most of the time you do not need it. If the camera has audio and you have no specific reason for it, switch it off.",
        },
        {
          question: "Can I put a camera inside a house I rent out?",
          answer:
            "No, not in any space a guest or tenant has exclusive use of. Every major letting platform prohibits interior cameras and requires disclosure of exterior ones, and a guest who finds an undisclosed camera is a delisting and a refund rather than a warning.",
        },
      ],
    },
  ].map((post) => ({ ...post, published: true, publishedAt }));

  return posts;
}

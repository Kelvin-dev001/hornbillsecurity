/**
 * The coast location set — docs/03 §2.
 *
 * "Owner decision: the coast is the whole market. No Nairobi location pages are
 * built." Ten places, and the reason they are worth building is in docs/01 §1:
 * AreaSpy holds 28 Nairobi area pages and zero coast pages, and Jiji's entire
 * Mombasa CCTV-installation category returns four listings.
 *
 * docs/02 is equally clear about the risk: "A location page with nothing but a
 * find-and-replaced town name is thin content and will be treated as such." So
 * every one below carries a condition that is actually specific to it — salt
 * air, estate access, the ferry, holiday-home vacancy, the port corridor — and
 * none of them is the same paragraph with the name swapped.
 *
 * What is deliberately NOT here is a completed job or a photograph, because
 * those are the owner's to supply (docs/09 items 6 and 8). The pages are honest
 * without them and will be far stronger with them.
 */
export type LocationSeed = {
  slug: string;
  name: string;
  county: string;
  lat: number;
  lng: number;
  intro: string;
  localNotes: string;
};

export const locationSeed: LocationSeed[] = [
  {
    slug: "mombasa-island",
    name: "Mombasa Island",
    county: "Mombasa",
    lat: -4.0435,
    lng: 39.6682,
    intro:
      "CCTV installation across the island — Mwembe Tayari, Majengo, the Old Town, Makadara and the business district. We are based here, which in practice means a survey the same week and a technician who does not have to cross a bridge to reach you.",
    localNotes:
      "Two things shape an island install. The buildings are old and often shared, so cable routes go through spaces that belong to somebody else — getting that agreed before the day is half the job. And the salt is in the air everywhere, not just on the seafront: an unsealed junction box on a Kilindini-facing wall corrodes within a season, which is why we fit sealed IP66 boxes as standard here rather than as an upgrade.",
  },
  {
    slug: "nyali",
    name: "Nyali",
    county: "Mombasa",
    lat: -4.0435,
    lng: 39.7,
    intro:
      "CCTV and electric fencing for Nyali homes, apartments and businesses, from the bridge through to Links Road and out towards Kongowea. Residential compounds with grounds, which is a different problem from a plot in town.",
    localNotes:
      "Nyali is close enough to the water that corrosion decides how long a system lasts, and far enough into greenery that vegetation decides what your cameras actually see. A camera aimed through a bougainvillea is a camera aimed at a bougainvillea in six months, so we set positions with a year of growth in mind. Estate compounds here also tend to want the gate covered from two angles — one for the vehicle, one for whoever is walking in beside it.",
  },
  {
    slug: "bamburi-shanzu",
    name: "Bamburi and Shanzu",
    county: "Mombasa",
    lat: -3.9833,
    lng: 39.7333,
    intro:
      "CCTV for homes, apartment blocks, shops and hotels along the Bamburi and Shanzu stretch, from the cement works up past Haller Park towards Shanzu and Serena.",
    localNotes:
      "This stretch is mostly apartment blocks and hospitality, and both change the brief. A block needs the entrance, the parking and the stairwells covered under one recorder with access split between a caretaker and the committee, which is a configuration question rather than a hardware one. Hotels and guest houses need to record public approaches without pointing a camera anywhere a guest would object to — that line matters legally as well as commercially.",
  },
  {
    slug: "mtwapa",
    name: "Mtwapa",
    county: "Kilifi",
    lat: -3.9333,
    lng: 39.75,
    intro:
      "CCTV and perimeter security in Mtwapa, on both sides of the creek — homes off the Malindi road, rentals, bars and restaurants, and the compounds behind them.",
    localNotes:
      "Mtwapa runs late, and a system built for a quiet residential street is the wrong system here. Night footage has to work under mixed artificial light, which is exactly where ordinary infrared washes out and ColorVu earns its money. Short-let and rental compounds also change hands often, so we set the recorder up so an owner can hand over viewing access without handing over the whole system.",
  },
  {
    slug: "tudor-kizingo",
    name: "Tudor and Kizingo",
    county: "Mombasa",
    lat: -4.05,
    lng: 39.66,
    intro:
      "CCTV for the older residential quarters of the island — Tudor, Kizingo, Ganjoni and the streets around Mama Ngina Waterfront. Larger plots, mature trees, and houses that were not wired for this.",
    localNotes:
      "These are the compounds where cable routing takes longer than the cameras do. Mature grounds mean long runs and few straight lines, and the older houses have no conduit to reuse — so the survey is where the real quoting happens, and our published cable assumption of 30 m per camera is often light here. We say so at survey rather than after.",
  },
  {
    slug: "likoni-south-coast",
    name: "Likoni and the south coast approach",
    county: "Mombasa",
    lat: -4.0833,
    lng: 39.6667,
    intro:
      "CCTV for homes and businesses on the Likoni side and along the road south, including everything that depends on the ferry crossing.",
    localNotes:
      "The ferry is the practical fact here. A site visit and a return trip can lose an afternoon to the queue, so we plan Likoni work to be done in one visit with the materials on the vehicle — which means the survey has to be thorough enough that nothing is missed. Power on this side is also less reliable than on the island, so a small UPS on the recorder is worth more here than another camera.",
  },
  {
    slug: "diani-ukunda",
    name: "Diani and Ukunda",
    county: "Kwale",
    lat: -4.2833,
    lng: 39.5833,
    intro:
      "CCTV for holiday homes, villas, cottages and the businesses that serve them, from Ukunda through Diani Beach Road down to Galu.",
    localNotes:
      "Most of what we fit in Diani watches a house that is empty for months. That changes everything: the owner is often abroad, a caretaker is on site, and the system has to give each of them the right amount of access without giving either of them all of it. Mains power is not dependable enough to assume, which is why solar and 4G cameras do so much of the work here — no trenching, no dependence on a supply that drops. Nobody else is building for this market on this coast, and it is the highest-value work we do.",
  },
  {
    slug: "kilifi",
    name: "Kilifi",
    county: "Kilifi",
    lat: -3.6333,
    lng: 39.85,
    intro:
      "CCTV and perimeter security in Kilifi town, along the creek and out towards Bofa — homes, plots under construction, and small businesses.",
    localNotes:
      "A lot of Kilifi work is on plots that are still being built or only occasionally occupied, where there is no mains supply and no network. A solar 4G camera on a pole covers a boundary or a materials store from the day the plot is bought, and moves when the building starts. For finished houses the distances are longer than in town, so cable and containment are a bigger share of the bill here than the camera count would suggest.",
  },
  {
    slug: "malindi-watamu",
    name: "Malindi and Watamu",
    county: "Kilifi",
    lat: -3.2175,
    lng: 40.1191,
    intro:
      "CCTV for homes, holiday properties and businesses in Malindi and Watamu, including the villas and guest houses along the Watamu road.",
    localNotes:
      "Same shape as Diani — properties that stand empty, owners who are not in the country, and a caretaker who needs limited access rather than none. The distance from Mombasa is the other factor: we quote Malindi and Watamu as a planned visit with everything on the vehicle rather than as a callout, which is cheaper for you and is why we would rather survey properly than guess.",
  },
  {
    slug: "mariakani-mazeras",
    name: "Mariakani and Mazeras",
    county: "Kilifi",
    lat: -3.8628,
    lng: 39.4736,
    intro:
      "CCTV for yards, warehouses, transport businesses and homes along the Nairobi road corridor through Mazeras, Mariakani and the surrounding shopping centres.",
    localNotes:
      "This is the port corridor, and the work here is mostly commercial: yards, fuel, transport and storage, where the boundary is long and the light is poor. That combination is what 80 m cameras and a proper perimeter design are for — a 20 m camera on a 200 m fence is a camera watching one gatepost. Vehicle movement at night is the thing most of these sites actually need to be able to review.",
  },
];

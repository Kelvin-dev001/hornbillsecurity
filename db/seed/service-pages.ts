/**
 * Service-page copy for each service line — docs/05 Sprint 6.
 *
 * "Each gets: a service page, a category in the catalogue, seeded items, at
 * least two packaged Solutions with full BOMs, and a cost article."
 *
 * This file is the first of those. One entry per category with
 * `kind = 'service'`, keyed by slug, seeded into the four `service_*` columns
 * and editable afterwards at /admin/categories.
 *
 * Three rules held throughout, and they are the reason this file is long rather
 * than a loop over a template.
 *
 * **No prices.** Not one figure is written here. Every price on a service page
 * is read from the catalogue at render time, so a line with nothing priced yet
 * shows no price rather than an invented one (CLAUDE.md §2.7, docs/08 Sprint 6:
 * "do not publish market-research estimates as our prices"). Fuel monitoring is
 * the single exception in the data — KES 45,000 installed per vehicle is
 * owner-confirmed (docs/09 item 23) — and even that lives in the items table,
 * not here.
 *
 * **`notFor` is the point.** CLAUDE.md §6: "Every Solution states what it is
 * not suitable for. Honesty about limits is the strongest trust signal on the
 * site and the most citable kind of sentence." On the lines where we are
 * weakest, it is the only thing on the page a competitor would not also claim.
 *
 * **Nothing claims a licence we do not hold.** PSRA registration and the
 * Communications Authority radio licence are both in progress (docs/09 items 15
 * and 16), so radio communications says exactly that — including the fee and the
 * lead time, which is the kind of specific fact that wins a job.
 */
export type ServicePageSeed = {
  /** categories.slug */
  slug: string;
  intro: string;
  includes: string[];
  notFor: string[];
  faq: { question: string; answer: string }[];
};

export const servicePageSeed: ServicePageSeed[] = [
  {
    slug: "electric-fencing",
    intro:
      "Electric fencing on a wall or a boundary, sized properly. The energizer is chosen from the actual perimeter length and the number of live wires, not from a price list — an undersized energizer on a long fence gives you a fence that deters nobody, and an oversized one is money spent on a bigger box. We publish what every component costs, which no competitor in Kenya does.",
    includes: [
      "Perimeter measured and the energizer sized from it",
      "Posts, insulators and wire run and tensioned",
      "Earth stake and earth return",
      "Warning signage, which is a legal requirement and not decoration",
      "Commissioning, with the voltage measured and recorded at the far end",
      "How to isolate a section to work on the fence safely",
    ],
    notFor: [
      "A boundary that has not been agreed with a neighbour. An energized fence on a disputed line is a legal problem, not a security one.",
      "Livestock containment — that is a different energizer, a different wire spacing and a different job.",
      "A property with young children and no separate physical barrier. We will say so at survey.",
      "Replacing a wall. A fence on a failing wall fails with the wall.",
    ],
    faq: [
      {
        question: "How much does electric fencing cost per metre in Kenya?",
        answer:
          "It depends almost entirely on the number of live wires and whether the posts go on an existing wall or into the ground, which is why a per-metre figure quoted before a survey is a guess. Our component prices are published so you can see how a total is built up, and the builder totals a real perimeter for you.",
      },
      {
        question: "Is an electric fence dangerous?",
        answer:
          "A correctly installed one delivers a short, high-voltage, low-current pulse — painful and memorable, not harmful to a healthy adult. What makes a fence dangerous is bad earthing, no isolation switch, no signage, and a mains-derived fault. Those are installation failures, and they are why an energizer bought over the counter and fitted by a handyman is a worse idea than it looks.",
      },
      {
        question: "Does it work during a power cut?",
        answer:
          "Yes. Energizers run from a battery that the mains keeps charged, so a cut does not switch the fence off — it starts draining the battery. How long you get depends on the battery and the energizer, and it is worth knowing that number before you need it.",
      },
      {
        question: "Can you put a fence on top of my existing wall?",
        answer:
          "Usually, and it is the cheaper install because the posts bolt down rather than going into the ground. What we check at survey is whether the wall can take it — a coping that is already cracking will not hold a tensioned wire.",
      },
    ],
  },
  {
    slug: "razor-wire-perimeter",
    intro:
      "Razor wire, concertina coils, wall spikes and anti-climb toppings. The cheapest genuine deterrent per metre there is, and the one most often fitted badly — a coil that is not fixed at every span can be pushed aside by hand, which makes it decoration.",
    includes: [
      "Brackets or arms fixed at the correct span",
      "Coil or flat wrap run and tied at every bracket",
      "Corners and gate returns, where the gaps normally are",
    ],
    notFor: [
      "A boundary onto a public footpath at head height. It is a liability and in most cases should not be there.",
      "Anywhere children can reach it.",
      "A property that wants to look welcoming. It does the job and it looks like it.",
      "A substitute for a camera. It slows somebody down; it does not tell you they were there.",
    ],
    faq: [
      {
        question: "Razor wire or electric fence?",
        answer:
          "Razor wire is cheaper per metre, needs no power and no maintenance, and stops an opportunist. An electric fence deters before contact, can be zoned and alarmed, and tells you when it is interfered with. On a long rural boundary razor wire usually wins on cost; on a compound you actually monitor, the fence earns its price.",
      },
      {
        question: "How long does razor wire last on the coast?",
        answer:
          "Less time than inland, and the failure is at the fixings rather than the wire. Galvanised wire on plated brackets rusts at the bracket first. Stainless fixings cost a little more and are the difference between a topping that lasts and one that is hanging off in three years.",
      },
    ],
  },
  {
    slug: "gate-automation",
    intro:
      "Sliding and swing gate motors, with the safety devices that make them legal rather than just functional. A gate that closes on a car or a child is the one security product that can genuinely hurt somebody, so photocells and a manual release are part of the job here, not an upsell.",
    includes: [
      "Motor sized to the gate's actual weight and travel",
      "Photocells across the opening",
      "Manual release, and showing everyone in the house how to use it",
      "Remotes paired, and a keypad or intercom release where wanted",
      "Limits and force set, then tested against an obstruction",
    ],
    notFor: [
      "A gate that does not run smoothly by hand. Automating a dragging gate burns out the motor and we will decline the job until it is fixed.",
      "A gate with no clear space for a person to stand while it moves.",
      "A property with no mains at the gate and no appetite for solar. A motor on an unreliable supply is a gate you push by hand.",
      "Retrofitting a motor to a gate that was not built to carry one, which is more common than people expect.",
    ],
    faq: [
      {
        question: "Can my existing gate be automated?",
        answer:
          "Usually, if it runs freely by hand and its frame can carry the load. The two things that stop a retrofit are a gate that drags on its track and a leaf that flexes when pushed — both need welding work first, and automating around them just breaks the motor.",
      },
      {
        question: "What happens in a power cut?",
        answer:
          "Every motor we fit has a manual release, and part of handover is showing whoever is at the property how to use it in the dark. A backup battery is worth having where cuts are frequent, and it is a line on the quotation rather than an assumption.",
      },
    ],
  },
  {
    slug: "video-intercom",
    intro:
      "Video door stations for a gate or an apartment block, so whoever is at the gate can be seen and let in without anybody walking down. On a block, this is as much a wiring and access-rights problem as a hardware one.",
    includes: [
      "Door station and indoor monitors, wired and configured",
      "Release wired to the gate motor or the strike",
      "Phone app set up where the model supports it",
      "For a block: which flat can release which door, agreed before install",
    ],
    notFor: [
      "A gate with no line of sight and no lighting. A camera that shows a silhouette has told you nothing.",
      "Replacing a full access-control system on a block with high turnover — see access control instead.",
      "A property where the gate is 200 m from the house and there is no cable route. Wireless intercoms at that distance disappoint.",
    ],
    faq: [
      {
        question: "Can I answer the gate from my phone?",
        answer:
          "On the models that support it, yes, and we set it up at handover. Worth knowing the honest limit: it depends on your internet, so it is a convenience rather than the thing you rely on. The indoor monitor is what actually always works.",
      },
    ],
  },
  {
    slug: "access-control-time-attendance",
    intro:
      "Card, PIN and fingerprint access on doors, and the same readers used for time and attendance. The hardware is the easy part. What decides whether the system is still in use in a year is whether somebody owns the enrolment list — adding a new staff member, and more importantly removing one who left.",
    includes: [
      "Reader, lock, power supply and controller wired per door",
      "Fail-safe or fail-secure chosen deliberately, and explained",
      "Request-to-exit and emergency egress, which fire regulations decide, not us",
      "Enrolment of the initial staff list, and training somebody to maintain it",
      "Attendance reports set up and exported once with you watching",
    ],
    notFor: [
      "A door that is a fire escape, unless the release arrangement has been agreed. Life safety outranks access control every time.",
      "An organisation with nobody willing to own the enrolment list. It will be propped open within a month.",
      "Fingerprint readers on a dusty site or where staff work with their hands in water or oil. Cards work; fingers stop reading.",
      "Payroll. It gives you attendance data; it is not a payroll system and integrating the two is a separate conversation.",
    ],
    faq: [
      {
        question: "Fingerprint or card?",
        answer:
          "Cards for anywhere dusty, wet or oily, and for high staff turnover — issuing and cancelling a card takes seconds. Fingerprints where you specifically need to stop staff clocking each other in. Plenty of sites are better off with both on the same reader.",
      },
      {
        question: "What happens if the power goes off?",
        answer:
          "That depends on a choice made at design time. Fail-secure keeps the door locked, fail-safe releases it. Which is correct depends on whether the door is an escape route, and it is a decision to make deliberately rather than discover.",
      },
    ],
  },
  {
    slug: "fire-smoke-detection",
    intro:
      "Smoke and heat detection, sounders, call points and panels. This is the one line on this site where the standard is set by regulation rather than by preference, and where cutting the specification is not a saving.",
    includes: [
      "Detector type chosen per room — smoke, heat or multi-sensor",
      "Panel, zones and sounder coverage",
      "Call points on escape routes",
      "Commissioning with every device tested, and the certificate",
      "Logbook, and showing somebody how to test it weekly",
    ],
    notFor: [
      "Signing off a design somebody else specified without surveying it ourselves.",
      "A building where the escape routes themselves are the problem. Detection tells people to leave; it does not give them somewhere to go.",
      "Anyone wanting the cheapest possible system to satisfy an inspection. We would rather not quote than fit a system that passes a walk-round and misses a fire.",
    ],
    faq: [
      {
        question: "Do I legally need a fire alarm?",
        answer:
          "For most commercial premises in Kenya, yes, and the specifics depend on occupancy, size and use. We survey against that rather than guessing, and the survey report is what you show an inspector.",
      },
      {
        question: "Why is a heat detector used instead of a smoke detector in a kitchen?",
        answer:
          "Because a smoke detector in a kitchen goes off when somebody cooks, and a detector that gets disconnected because it is annoying protects nobody. Heat detection in a kitchen and smoke elsewhere is not a downgrade; it is the design working.",
      },
    ],
  },
  {
    slug: "networking-structured-cabling",
    intro:
      "Cat6 and Cat6A data cabling, patch panels, cabinets and the switches to run them. Every IP camera system is a network installation whether anybody calls it one, and most of the CCTV faults we are called out to fix are cabling faults.",
    includes: [
      "Cable runs in containment, terminated at both ends",
      "Faceplates, modules, patch panel and a labelled cabinet",
      "Every link tested, and the results handed over",
      "Switch configured, with PoE budget checked against the load",
    ],
    notFor: [
      "Runs over 90 m of copper. That is the standard's limit, not a guideline, and past it you want fibre or a switch in between.",
      "Outdoor runs in indoor cable, which is a cheap saving that fails in one rainy season.",
      "Fixing somebody else's unlabelled cabinet without surveying it first. We have to know what is in there before we touch it.",
    ],
    faq: [
      {
        question: "Cat6 or Cat6A?",
        answer:
          "Cat6 is right for almost every camera and office installation. Cat6A earns its extra cost on long runs, in heavy interference, or where you are cabling once for a building you expect to still be using in fifteen years. Anyone selling you Cat6A for a four-camera house is selling you cable.",
      },
      {
        question: "Can you use the coaxial cable already in my walls?",
        answer:
          "For analog cameras, usually yes, and it saves a great deal. For IP you need Cat6, and if the coax is buried in walls that recabling cost is often larger than the difference between an analog and an IP system in the first place.",
      },
    ],
  },
  {
    slug: "radio-communications",
    intro:
      "Two-way radios and repeaters for sites where phones are the wrong tool — a yard, an estate patrol, a hotel, a construction site. Coverage is the whole question, and it is decided by terrain and antenna height rather than by the price of the handset.",
    includes: [
      "Handsets programmed to a common plan",
      "Repeater and antenna sited for the coverage you actually need",
      "Channel plan written down, so a replacement handset can be programmed to match",
      "Charging and issue arrangements, which is what stops radios going missing",
    ],
    notFor: [
      "Operating on licensed frequencies before the licence is granted. Ours is in progress with the Communications Authority — roughly KES 19,700 and 74 to 106 days — and we will not put a repeater on the air until it is held.",
      "A site where the real problem is that nobody answers. Radios do not fix a staffing issue.",
      "Replacing a phone system. Different tool, different job.",
    ],
    faq: [
      {
        question: "Do I need a licence for two-way radios in Kenya?",
        answer:
          "For licence-free channels, no. For a repeater or dedicated frequencies, yes — from the Communications Authority, currently around KES 19,700 with a 74 to 106 day lead time. We state that plainly because the lead time affects when a site can actually go live, and our own application is in progress rather than granted.",
      },
      {
        question: "How far will they reach?",
        answer:
          "Far less than the box says, and the honest answer needs a site visit. Handset to handset across a flat yard is realistic; through a concrete building or across a valley is not, and that is what a repeater is for.",
      },
    ],
  },
  {
    slug: "fuel-monitoring",
    intro:
      "Fuel-level sensors and reporting for a fleet, so a drop that is not a journey shows up as a drop. This is the one line where we are deliberately brand-agnostic — the right unit depends on the tank, the vehicle and how the reports will actually be read, not on who gives us the best margin.",
    includes: [
      "Sensor fitted and calibrated to the tank, which is most of the accuracy",
      "Reporting set up, with the alerts that matter switched on and the rest off",
      "Somebody in the office trained to read a report and spot a siphon",
      "Installed price per vehicle, confirmed rather than estimated",
    ],
    notFor: [
      "A fleet with nobody reading the reports. The sensor is not the control; the person looking at it is.",
      "Proving a specific theft after the fact. It shows you a pattern from the day it is fitted, not last month.",
      "A tank that has been modified or patched, until it has been looked at. Calibration on a tank of unknown shape is guesswork.",
    ],
    faq: [
      {
        question: "How much does fuel monitoring cost per vehicle?",
        answer:
          "KES 45,000 installed per vehicle, which is a confirmed installed price rather than an estimate, and it is VAT-exclusive like everything else on this site.",
      },
      {
        question: "How accurate is it?",
        answer:
          "Accurate enough to see a siphon and to tell a real consumption change from noise, provided the sensor is calibrated to that specific tank. Calibration is where accuracy comes from, and it is why we fit rather than sell these.",
      },
    ],
  },
  {
    slug: "smart-home-nanny-cameras",
    intro:
      "Indoor cameras, smart plugs, doorbells and locks — the consumer end, where you can check our price against Jumia in thirty seconds. So we do not pretend to beat it. We take a thin margin on the hardware and charge visibly for the installation, the configuration and getting the app working on everybody's phone, which is the part that actually goes wrong.",
    includes: [
      "Fitted, connected to your Wi-Fi and tested where it will live",
      "App set up on every phone that needs it, with the sharing configured",
      "Recording, retention and notification settings explained",
      "What the device does when the internet drops, so it is not a surprise",
    ],
    notFor: [
      "Anywhere a person has a reasonable expectation of privacy. A camera in a live-in worker's room is not something we will fit, and in a let property it is a legal problem as well as a wrong one.",
      "Outdoor use, unless the specific model is rated for it. Most are not, whatever the listing says.",
      "A property with poor Wi-Fi at the camera position. The camera is not the problem and a better camera will not fix it.",
      "Anyone who needs footage to survive a device being stolen. Card recording goes with the camera.",
    ],
    faq: [
      {
        question: "Is it legal to put a camera in my house where staff work?",
        answer:
          "In shared and communal areas, generally yes, and you should tell them it is there. In a bedroom, a bathroom or a live-in worker's own room, no. Kenya's Data Protection Act 2019 applies to households more than most people assume, and we will decline a position we think is on the wrong side of it.",
      },
      {
        question: "Why is your price similar to Jumia's?",
        answer:
          "Because it should be. The dealer-to-Jumia spread on these items is thin, and marking them up the way professional equipment is marked up would put us above a price you can check in seconds. We take the thin margin and charge for the work instead, as a visible line.",
      },
    ],
  },
  {
    slug: "power-backup",
    intro:
      "UPS and battery backup for the equipment that must not stop — the recorder, the router, the gate, the access controller. On this coast a small UPS on a recorder is frequently worth more than another camera, because a system that stops recording during an outage was not there when you needed it.",
    includes: [
      "The load measured rather than assumed",
      "Runtime you actually asked for, stated in minutes",
      "Fitted, with the equipment moved onto it and tested by pulling the mains",
      "What happens when the battery reaches end of life, and roughly when that is",
    ],
    notFor: [
      "Running a whole house. That is a solar and inverter job, and a different quotation.",
      "A site with no mains at all — a UPS charges from something.",
      "Extending runtime indefinitely. Past a point the batteries cost more than a generator.",
    ],
    faq: [
      {
        question: "Do I need a UPS on my CCTV?",
        answer:
          "If your supply is unreliable, it is the cheapest meaningful upgrade you can make. A recorder that loses power mid-write can also corrupt a drive, so it protects the footage you already have as well as the footage you are about to miss.",
      },
    ],
  },
  {
    slug: "server-control-room",
    intro:
      "Racks, monitor walls, UPS and the cooling to keep it all running, for a site with enough cameras that somebody watches them. The failure mode here is almost never the equipment — it is a room that gets too hot, or a wall of screens nobody can actually read.",
    includes: [
      "Rack, containment and cable management, labelled",
      "Monitor wall laid out for what the operator actually needs to see",
      "Power and cooling sized to the load",
      "Handover to the people who will sit in the room, not just to whoever signed",
    ],
    notFor: [
      "A room with no ventilation and no budget for cooling. Equipment in a hot cupboard fails, and it fails in the hot season when you need it.",
      "A site with nobody to sit in it. Sixty-four cameras and no operator is a very expensive recording.",
      "Retrofitting into a space too small to work in. If a technician cannot reach the back of the rack, nobody will maintain it.",
    ],
    faq: [
      {
        question: "How many cameras can one person actually monitor?",
        answer:
          "Far fewer than most monitor walls display. Live monitoring is for a specific purpose — a gate, a till, a loading bay — and everything else is better served by recording plus good analytics and alerts. A wall of sixty-four live feeds is a wall nobody is watching.",
      },
    ],
  },
  {
    slug: "entrance-control",
    intro:
      "Boom barriers, turnstiles, road blockers and parking ticket dispensers — controlling vehicles and people at a single point. Everything here is heavy, moves, and can hurt somebody, so safety devices and a manual release are part of the specification rather than options on it.",
    includes: [
      "Barrier or turnstile sized to the opening and the traffic",
      "Loop or sensor detection so it does not close on a vehicle",
      "Integration with access control or a ticket system where wanted",
      "Manual operation for a power failure, demonstrated at handover",
    ],
    notFor: [
      "An entrance with no space to queue. A barrier at a gate that opens onto a main road moves the problem into the traffic.",
      "A site unwilling to maintain it. These have moving parts and a maintenance schedule; without one they end up permanently raised.",
      "Stopping a determined vehicle. A boom barrier controls access; it is not a road blocker, and confusing the two is how a security plan fails.",
    ],
    faq: [
      {
        question: "How long does a boom barrier last?",
        answer:
          "It is decided by cycles and maintenance rather than years. A barrier at a busy commercial entrance does more cycles in a month than a residential one does in a year, and the ones that fail early are almost always the ones nobody serviced.",
      },
    ],
  },
  {
    slug: "screening",
    intro:
      "Walk-through metal detectors, hand-held scanners and baggage X-ray for entrances that screen people and bags. Whether it works has almost nothing to do with the machine and almost everything to do with whether the person operating it has been trained and is allowed to act on what it says.",
    includes: [
      "Unit sited and calibrated for the traffic and the environment",
      "Operator training on what a real alarm looks like",
      "A search and escalation procedure agreed with the client, in writing",
      "Sensitivity set for the site rather than left at the factory default",
    ],
    notFor: [
      "A site that will not train or empower the operator. An archway that alarms constantly and is waved through is worse than nothing — it teaches everybody the alarm means nothing.",
      "An entrance with no space to hold and search somebody once it alarms.",
      "Anywhere the honest answer is a guard and a look in the bag.",
    ],
    faq: [
      {
        question: "Do walk-through detectors actually work?",
        answer:
          "The hardware works. Installations fail because sensitivity is set so high that everything alarms, so operators wave people through and the archway becomes furniture. Setting sensitivity for the site and training the operator is most of the value, and it is the part almost nobody quotes for.",
      },
    ],
  },
  {
    slug: "installation-and-commissioning",
    intro:
      "The survey, the installation and the handover — the work itself, priced per point rather than per day. It is also where CCTV data-protection compliance gets decided, because where a camera points, how long footage is kept and who can see it are set at survey and not afterwards.",
    includes: [
      "A written survey report with camera positions marked up, yours to keep",
      "Installation to the published bill of materials, with nothing added at invoice that was not on the quotation",
      "Retention configured to a number you chose, and verified against the drive",
      "Access split deliberately — who can view, who can export, who can reconfigure",
      "Surveillance signage, which the transparency principle effectively requires",
      "Remote viewing set up on every phone that needs it, and how to export a clip",
    ],
    notFor: [
      "A camera position we think is unlawful. A bathroom, a bedroom, a live-in worker's own room, or inside a let property — we will say so at survey rather than after fitting it, and it has cost us jobs.",
      "Signing off somebody else's design without surveying it ourselves.",
      "A data protection impact assessment as a document we write for you. We will tell you when one is needed and what it has to cover; the assessment is yours, and for anything contentious it should have an advocate's eyes on it.",
      "Retrospective compliance on a system we did not install, until we have surveyed it.",
    ],
    faq: [
      {
        question: "What does the site survey actually produce?",
        answer:
          "A written findings report and marked-up camera positions. It is yours whether or not you use us, which is the difference between it and a free survey — a free survey is a sales visit, and its cost is inside the quotation you are handed.",
      },
      {
        question: "Can you make my existing CCTV compliant?",
        answer:
          "Usually, and it is mostly cheap: re-aim anything pointing off your property, put signage up, set a retention period you can justify, and separate the viewing account from the admin account. The expensive case is a system with no way to export one person's footage without exporting everybody's, which is a configuration problem rather than a hardware one.",
      },
      {
        question: "Do I need a data protection impact assessment?",
        answer:
          "For high-risk processing, yes — Kenya's Data Protection Act 2019 requires it, and the ODPC's draft guidance for private security is explicit about it for surveillance. Monitoring staff continuously, covering a public space, or running cameras across multiple sites all point that way. We will tell you where you stand; we are not advocates and will not pretend to be.",
      },
    ],
  },
  {
    slug: "maintenance-and-monitoring",
    intro:
      "Scheduled maintenance and remote monitoring contracts. The difference between a system that works in year three and one that turns out to have stopped recording in month seven — which is what we find on most of the systems we are called to look at.",
    includes: [
      "Scheduled cleaning, focus check and re-aim",
      "Recording verified, and retention re-measured against the drive",
      "Firmware and password review",
      "A written report each visit, and a defined fault response",
    ],
    notFor: [
      "A system we have never surveyed. We cannot promise a response time on equipment we have not seen.",
      "Anyone expecting it to cover replacement hardware. It covers labour and attention; a failed drive is a drive.",
      "A site that wants a monitoring contract instead of guarding. We watch the system's health, not your premises.",
    ],
    faq: [
      {
        question: "Why would I pay for maintenance on a system that works?",
        answer:
          "Because you cannot tell from looking at it. The most common fault we find is a system that has been recording nothing for months — a full or failed drive, a camera knocked out of aim, a channel that dropped. Nobody noticed because nobody had needed footage yet.",
      },
      {
        question: "What notice do I need to give to cancel?",
        answer: "Three months.",
      },
    ],
  },
  {
    slug: "training",
    intro:
      "CCTV installation training for technicians who want to do this properly — cable, termination, aiming, recorder configuration and the coast-specific work that decides whether an installation survives.",
    includes: [
      "Hands-on termination and cable practice, not slides",
      "Recorder and camera configuration on real equipment",
      "Coast-specific practice: sealing, glands, corrosion",
      "How to survey a site and write a bill of materials from it",
    ],
    notFor: [
      "Anyone expecting a licence at the end. We teach the work; regulatory registration is a separate matter with the PSRA.",
      "A course delivered without equipment to practise on. That is a lecture, and it does not produce a technician.",
    ],
    faq: [
      {
        question: "Is there a certificate?",
        answer:
          "A certificate of attendance and competence from us, which says what you were assessed on. It is not a regulatory licence and we will not imply that it is — anybody claiming to issue one should be asked which authority granted them the power.",
      },
    ],
  },
];

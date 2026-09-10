# 12 · Distributor Pricing Worksheet

**Generated — do not edit by hand.** `npm run docs:pricing` rewrites it from the
database, so a row disappears the moment its price is entered. Last generated
against a catalogue whose last price review was 1 September 2026.

This is the single ask that blocks the most work on this project. It replaces the
prose in `docs/09` items 2, 29, 34 and 37 with the actual list, because you cannot
take "the fencing category" to a supplier.

## How to enter them

Either way, **enter the trade / distributor cost, not the retail price.** The public
price is computed as `cost × 1.40`, rounded to the nearest 100, and applying that to
a figure that is already retail prices us out of the market (`CLAUDE.md` §5).

1. **One at a time** — Admin → Items → the item → cost price. The panel shows cost,
   markup, computed price, ceiling and effective price together, and warns if the
   computed price would clear a ceiling you have set.
2. **In bulk** — Admin → Items → Export CSV, fill in the `supplier_price_kes`
   column, then Import. The importer reports what it will change before it writes.

Anything you have no cost for, leave blank. A blank stays invisible on the site,
which is the correct behaviour — a guess is not.

## 1. Live on an estimated cost — the commercially urgent group

15 rows. These are **published and in use**, priced at estimated
Mombasa trade rates, and marked as estimates on every line of every bill of
materials they appear in. They are the parts your own price list does not carry —
cable, connectors, trunking, clips, power supplies, boxes.

They matter more than anything else on this page: they are consumables, so they
appear in every package, and on the four-camera package they are **36% of the
total** (`docs/09` item 29). Every published package price on the site is that
much of an estimate until these are real.

### CCTV accessories

| SKU | Item | Unit | Estimated cost | Public price now | Your trade cost |
|---|---|---|---:|---:|---|
| `BAL-VID-PR` | Passive Video Balun, Pair | pair | KES 250 | KES 400 | |
| `CAB-RG59-SIAM-305` | RG59 Siamese Coaxial + Power Cable, 305 m Box | roll_305m | KES 6,000 | KES 8,400 | |
| `CON-BNC-10` | BNC Connectors, Pack of 10 | box | KES 400 | KES 600 | |
| `CON-DC-10` | DC Power Connectors, Pack of 10 Pairs | box | KES 350 | KES 500 | |
| `JB-CAM` | Camera Junction / Adapter Box | each | KES 180 | KES 300 | |
| `JB-CAM-IP66` | Sealed Outdoor Junction Box, IP66 | each | KES 450 | KES 600 | |
| `MNT-POLE-SOLAR` | Solar Camera Pole Mount Bracket | each | KES 1,500 | KES 2,100 | |
| `PSU-12V10A` | 12V 10A Boxed CCTV Power Supply, 8-Way | each | KES 2,200 | KES 3,100 | |
| `PSU-12V2A` | 12V 2A Camera Power Adapter | each | KES 450 | KES 600 | |
| `SD-64GB` | 64 GB Surveillance microSD Card | each | KES 900 | KES 1,300 | |

### Networking and structured cabling

| SKU | Item | Unit | Estimated cost | Public price now | Your trade cost |
|---|---|---|---:|---:|---|
| `CON-RJ45-100` | Cat6 RJ45 Connectors, Pack of 100 | box | KES 1,200 | KES 1,700 | |
| `SW-POE-16` | 16-Port PoE Switch, 250W | each | KES 14,000 | KES 19,600 | |
| `SW-POE-8` | 8-Port PoE Switch, 120W | each | KES 6,500 | KES 9,100 | |

### Cable management and containment

| SKU | Item | Unit | Estimated cost | Public price now | Your trade cost |
|---|---|---|---:|---:|---|
| `CLIP-CABLE-100` | Cable Clips, Pack of 100 | box | KES 250 | KES 400 | |
| `TRUNK-25X16-2M` | PVC Trunking 25 x 16 mm, 2 m Length | length_2m | KES 250 | KES 400 | |

## 2. Priced from market research — held back from the site

2 rows. Each carries a figure read off a Kenyan reseller or Jumia
listing, which is a **ceiling to stay under, never a base to mark up** — those
listings already run 25–105% over dealer (`CLAUDE.md` §5). Marking one up by 40%
would put us above a price the customer can check in thirty seconds.

So they are unpublished. A trade cost publishes them.

### Video intercom

| SKU | Item | Unit | Researched retail | Your trade cost |
|---|---|---|---:|---|
| `DS-KIS603-P` | IP Video Intercom Kit (7 inch Indoor Station + DS-KV6113-WPE1 Door Station) | each | KES 26,500 | |
| `DS-KIS608-P` | IP Video Intercom Kit with Hik-Connect (7 inch Touch + PoE Door Station) | each | KES 29,000 | |

## 3. No price at all

17 rows across 4 categories. These are
invisible on the site today. Their service pages are live and say plainly that
equipment prices are not published yet, rather than showing an estimate.

This group is what blocks the rest of Sprint 6: `docs/05` wants at least two
packaged solutions with full bills of materials per service line, and a bill of
materials assembled from guesses would put an invented total on a page whose whole
claim is that its totals are real.

### DVRs and NVRs

| SKU | Brand | Item | Unit | Your trade cost | Note |
|---|---|---|---|---|---|
| `DS-7732NXI-K4/16P` | Hikvision | 32-Channel 4K AcuSense Embedded NVR with 16 PoE and 4 SATA | each | | No price in supplier status - request quote before publishing |

### Video intercom

| SKU | Brand | Item | Unit | Your trade cost | Note |
|---|---|---|---|---|---|
| `DS-KIS212` | Hikvision | 4-Wire HD TVI Video Intercom Kit (7 inch Monitor + Door Station) | each | | No price in supplier status |
| `DS-KIS213` | Hikvision | 4-Wire HD Video Intercom Kit (7 inch Monitor + Door Station) | each | | No price in supplier status |

### Entrance control and parking

| SKU | Brand | Item | Unit | Your trade cost | Note |
|---|---|---|---|---|---|
| `BARRIER-3M` | Unbranded / OEM | Automatic Boom Barrier 3 m | each | | Mock row - owner to price from admin. Estates hotels office parks port corridor |
| `BARRIER-45M` | Unbranded / OEM | Automatic Boom Barrier 4.5 m | each | | Mock row - owner to price from admin |
| `BARRIER-6M` | Unbranded / OEM | Automatic Boom Barrier 6 m | each | | Mock row - owner to price from admin |
| `BOLLARD-AUTO` | Unbranded / OEM | Automatic Rising Bollard | each | | Mock row - owner to price from admin |
| `PARK-ANPR` | Unbranded / OEM | ANPR Number Plate Recognition Camera and Controller | each | | Mock row - owner to price from admin |
| `PARK-DISPENSER` | Unbranded / OEM | Parking Ticket Dispenser | each | | Mock row - owner to price from admin. Malls hospitals hotels |
| `PARK-PAYSTATION` | Unbranded / OEM | Parking Pay Station / Cashier Terminal | each | | Mock row - owner to price from admin |
| `TURNSTILE-FULL` | Unbranded / OEM | Full-Height Turnstile | each | | Mock row - owner to price from admin |
| `TURNSTILE-TRIPOD` | Unbranded / OEM | Tripod Turnstile with Dual Authentication | each | | Mock row - owner to price from admin |

### Screening and detection

| SKU | Brand | Item | Unit | Your trade cost | Note |
|---|---|---|---|---|---|
| `HHMD-STD` | Unbranded / OEM | Handheld Metal Detector Wand | each | | Mock row - owner to price from admin |
| `WTMD-18Z` | Unbranded / OEM | Walk-Through Metal Detector 18 Zone | each | | Mock row. Schools events hotels banks |
| `XRAY-100100` | Unbranded / OEM | Cargo / Pallet X-Ray Scanner 1000 x 1000 mm Tunnel | each | | Mock row. Port corridor and logistics |
| `XRAY-5030` | Unbranded / OEM | Baggage X-Ray Scanner 500 x 300 mm Tunnel | each | | Mock row. Hotels malls government buildings. High ticket low competition on the coast |
| `XRAY-6550` | Unbranded / OEM | Baggage X-Ray Scanner 650 x 500 mm Tunnel | each | | Mock row - owner to price from admin |

## 4. Held back for a reason other than price

3 rows. **These already have a cost** — do not send
them to a supplier. Each is waiting on one specific fact, and each publishes with
one click once you confirm it.

| SKU | Item | Cost held | What is needed |
|---|---|---:|---|
| `VARIFOCAL-4MP` | 4MP Smart Hybrid Light Motorized Varifocal Dome/Bullet Network Camera | KES 13,500 | HELD BACK: model number unconfirmed - the box code was illegible in the supplier screenshot (docs/01 8). Publish once the supplier confirms the real model number. \| CONFIRM MODEL NUMBER with supplier - box code illegible in screenshot |
| `VARIFOCAL-6MP` | 6MP Smart Hybrid Light Motorized Varifocal Dome/Bullet Network Camera | KES 16,000 | HELD BACK: model number unconfirmed - the box code was illegible in the supplier screenshot (docs/01 8). Publish once the supplier confirms the real model number. \| CONFIRM MODEL NUMBER with supplier - box code illegible in screenshot |
| `DS-1LN6AUSPE` | Cat6A UTP Outdoor Network Cable | KES 23,000 | HELD BACK: reel length unconfirmed, so we cannot say what the price buys. Confirm the reel length with the supplier, set the unit, then publish. \| Outdoor runs and coastal installs. CONFIRM reel length with supplier |

## 5. Services with no rate

8 rows. These are your own labour and contract rates
rather than anything a supplier quotes, so nobody else can fill them in. They are
unpublished until you set them, and the recurring ones are the whole of Sprint 8's
revenue model.

| Service | Category | Charged | Your rate |
|---|---|---|---|
| Commissioning and handover training | Installation and commissioning | fixed | |
| Static / Generator Tank Fuel Monitoring | Fuel monitoring | per tank | |
| GPS Vehicle Tracking - Installed | GPS tracking and fleet | per vehicle | |
| Annual Maintenance Contract - Residential up to 8 cameras | Maintenance and monitoring | per year | |
| Annual Maintenance Contract - Commercial 9 to 32 cameras | Maintenance and monitoring | per year | |
| Cloud / Offsite Recording | Maintenance and monitoring | per camera per month | |
| Remote Monitoring | Maintenance and monitoring | per month | |
| CCTV Installation Training Course | Training | per delegate | |

## 6. Two numbers to sanity-check rather than supply

Neither is a supplier price. Both are assumptions of mine that move every package
total, and ten minutes with a past job settles them.

| Rule | Current | Why it matters |
|---|---|---|
| `trunking_m_per_camera` | 12 m | The single largest consumable line. At 12 m a four-camera house takes 24 lengths. Right for a surface-run bungalow; roughly double if most runs go through the roof (`docs/09` item 30) |
| `labour_per_camera_point` | Admin → Quantity rules | Industry-typical, not yours. It is about 17% of a four-camera job (`docs/09` item 13b) |

Both live in Admin → Quantity rules. Changing either re-prices every package on
the site immediately.

## Summary

| Group | Rows | Effect today |
|---|---:|---|
| Live on an estimated cost | 15 | Published; 36% of a four-camera package total is an estimate |
| Priced from market research | 2 | Held back; cannot be marked up |
| No price at all | 17 | Invisible; blocks solutions and cost articles |
| Held back, not on price | 3 | Costed already; waiting on one fact each |
| Services with no rate | 8 | Held back; yours to set, not a supplier's |
| **Total** | **45** | |

All prices are KES and VAT-exclusive throughout
(VAT 16% is added at invoice).

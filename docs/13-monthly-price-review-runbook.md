# 13 · Monthly Price Review Runbook

The one recurring operational job on this site. `CLAUDE.md` §9: prices are "reviewed monthly by the owner from the admin portal", and §2.6 requires a visible "Prices updated {Month Year}" stamp — so if the review does not happen, the stamp starts lying, and the stamp is one of the main reasons the site is trusted.

**Fifteen minutes if nothing has moved. An hour if the shilling has.**

Everything below is done in the admin portal. None of it needs a developer.

---

## Before you start

Have to hand:

- Your current distributor price list or quote sheets.
- A note of anything you have quoted in the last month where your margin felt wrong — too thin or embarrassingly fat. That is the most useful input to this whole process and it does not come from a spreadsheet.

---

## 1. Check what has actually moved (5 min)

**Admin → Items.** Sort by category and compare against your supplier sheet. You are looking for the handful that changed, not all 106.

In practice the movers are:
- Anything imported, when the shilling moves.
- Hard disks, which move independently of everything else.
- Whatever your distributor has just repriced or run out of.

If nothing has changed, skip to step 5 and stamp the date. Reviewing and finding no change is a completed review, not a skipped one.

## 2. Enter the ones that moved (5–30 min)

**One or two items:** Admin → Items → the item → cost price.

The panel shows **cost, markup, computed price, market ceiling and effective price side by side**. Read it left to right and it tells you the whole story of that price. If the computed price would clear a ceiling you have set, it says so in-line — that is the warning that stops us pricing above Jumia on consumer items.

**A whole category, or a currency move affecting everything:** Admin → Price review.

- Filter by category or brand.
- Enter a percentage.
- **Look at the before/after preview.** It lists every row that would change, with both figures. Nothing is written until you confirm.

The percentage moves **cost price**, not the public price. That is deliberate: the markup rule stays the single source of what a thing sells for, so a 6% cost increase becomes a 6% cost increase everywhere and the public prices follow the rule rather than drifting away from it.

**Or in bulk from a spreadsheet:** Admin → Items → Export CSV, fill in `supplier_price_kes`, then Import. The importer shows what it will change before it writes.

> Always enter the **trade / distributor cost**, never a retail price. The public price is `cost × 1.40` rounded to the nearest 100, and applying that to a figure that is already retail prices us out of the market (`CLAUDE.md` §5).

## 3. Check the two categories where the markup rule bites (5 min)

`CLAUDE.md` §5 singles these out and they are worth a deliberate look each month.

**Consumer smart-home and solar** — EZVIZ, Tapo, Imou, smart locks, doorbells. Jumia is the price ceiling every Kenyan buyer checks first, and the dealer-to-Jumia spread on these is 1–34%. A 40% markup lands *above* Jumia.

Spot-check two or three on Jumia. If our price is at or above theirs, set a `market_ceiling_price` on the item — the effective price then becomes `min(cost × 1.4, ceiling)` automatically and the admin panel shows you the reduction. Accept the thin hardware margin and let the installation line carry the profit; that is the agreed policy, not a concession.

**Anything sourced from a Kenyan reseller list** — Techyshop, Hubtech, CCTV Shop Kenya, Protech Line. Those figures already carry 25–105% over dealer. They are a ceiling to stay under, never a base to mark up.

## 4. Glance at the packages (2 min)

**Admin → Packages.** Open any one on the live site and check the total looks sane.

You do not need to re-price them. Every package total is computed from live item prices and the quantity rules on every request, so changing one cost price in step 2 has already re-priced all seventeen. This is a sanity check, not a task.

If a total looks wrong, the cause is almost always a quantity rule rather than a price — see step 6.

## 5. Stamp the date (30 seconds, and do not skip it)

**Admin → Business details → Prices updated.** Set it to today.

This drives the "Prices updated {Month Year}" line beside every price block on the site and the machine-readable `dateModified` that search engines and answer engines read. It is also what `priceValidUntil` in the structured data is derived from — the end of the following month, which is exactly as long as this review cycle promises.

Leaving it stale is worse than leaving a price stale, because it makes a true claim into a false one.

## 6. Twice a year: the quantity rules (10 min)

**Admin → Quantity rules.** These are not prices, they are the assumptions every bill of materials is built from, and they move every package total at once.

The two worth checking against a real recent job:

| Rule | Why |
|---|---|
| `trunking_m_per_camera` | The largest single consumable line. At 12 m a four-camera house takes 24 lengths. Right for a surface-run bungalow; roughly double what it should be if most of your runs go through the roof (`docs/09` item 30) |
| `labour_per_camera_point` | Seeded at an industry-typical figure rather than yours. It is about 17% of a four-camera job (`docs/09` item 13b) |

Ten minutes with three past quotes settles both, and it is the single highest-value thing on this page after step 2.

---

## What happens automatically

You do not need to do any of this, but it is worth knowing it happens, because it is why the site is never briefly wrong after you save:

- **Every public page re-renders.** Saving in admin revalidates the cache tag and the affected routes, so the catalogue, packages, price list, builder, service pages and home page all pick the change up.
- **The sitemap updates**, with a real `lastModified`.
- **Saved quotations do not move.** A quote is a frozen snapshot: every line's price and label was copied into it at submission. A customer holding a 30-day quotation keeps the figures they were given, whatever you change today. That is deliberate and it is tested.
- **`cost_price` never leaves the server.** Four independent layers plus a 208-route scan on every test run.

---

## If something looks wrong

| Symptom | Almost always |
|---|---|
| A price on the site does not match admin | The page cache. Save the item again, or wait an hour. If it persists it is a bug — report it |
| A package total jumped | A quantity rule, not a price. Check Admin → Quantity rules |
| The public price is not cost × 1.4 | A `price_override` or a `market_ceiling_price` is set on that item. The admin panel shows both |
| A price shows as an estimate | It is one. The row is on an estimated cost — see [`docs/12`](./12-distributor-pricing-worksheet.md) |
| An item is not on the site | It is unpublished, or it has no cost price. Both show in Admin → Items |

---

## The annual jobs

Once a year, not monthly:

- **Re-read `docs/12`** and clear whatever is still on an estimated cost. While anything is, a share of every package total is an estimate rather than a figure.
- **Audit the NAP** — business name, address, phone — against the Google Business Profile and every directory listing. `docs/03` §5: consistency is what makes scattered mentions read as one business.
- **Check the trust claims** in Admin → Business details. Years operating, technician count, and whether PSRA registration or the CA radio licence have been granted — neither may be claimed on the site until it is held.

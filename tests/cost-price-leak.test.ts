/**
 * THE MOST IMPORTANT TEST IN THIS REPOSITORY.
 *
 * CLAUDE.md §2.3: "Never render cost_price to the browser. Not in HTML, not in
 * JSON, not in a props payload, not in an API response reachable without an
 * admin session. A leaked distributor price destroys the business."
 *
 * So: fetch every public route and assert that no distributor cost, and no name
 * of a private column, appears anywhere in the response body.
 *
 * Run it with `npm run test:leak`. It needs the database (to learn what the
 * costs actually are) and a running site; if nothing is listening it starts one
 * itself from the existing production build.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { formatKes, formatKesPlain } from "../lib/money";
import { connect, readPrivatePriceRows } from "./helpers/db";
import { readRenderableAmounts } from "./helpers/renderable";
import { readPublicRoutes } from "./helpers/routes";
import { startSite, type RunningSite } from "./helpers/server";

/** Field and column names that would give the game away on their own. */
const FORBIDDEN_STRINGS = [
  "cost_price",
  "costPrice",
  "markup_multiplier",
  "markupMultiplier",
  "internal_note",
  "internalNote",
];

/**
 * How a leaked cost would actually look, and why a looser test does not work.
 *
 * Scanning for the bare digits of every cost fails on this catalogue, and not
 * hypothetically: 1,200 is the Tenda F3's cost and also sits inside the model
 * names `AC1200` and `OAP1200`, and 15,000 is a camera's cost and also the
 * price-band facet key `?price=5000-15000`. Both are meaningless coincidences.
 *
 * A leak, by contrast, arrives in one of exactly two shapes:
 *
 *   1. Rendered as money, through our own formatter — "KSh 15,000".
 *   2. As a data value: a bare number in JSON-LD, in the RSC flight payload, in
 *      an API response, or alone inside an HTML element. In every one of those
 *      it is bounded by a structural character — , : [ { > or a quote — never by
 *      a letter, which is what distinguishes it from `AC1200`.
 *
 * Both shapes are checked. The two coincidences above match neither.
 */
function buildScanners(values: number[]) {
  const alternation = values
    .flatMap((value) => [String(value), formatKesPlain(value)])
    .map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  return {
    /**
     * A bare cost sitting in a data position.
     *
     * The lookbehind matters. Without it the ",900" inside the published price
     * "KES 11,900" reads as the number 900 preceded by a delimiter, and 900 is
     * the cost of the 64 GB card. A thousands separator is never a structural
     * delimiter, so the character before one cannot be a digit.
     */
    asData: new RegExp(`(?<!\\d)[,:\\[{>]\\s*"?(${alternation})"?\\s*[,:\\]}<]`, "g"),
    /**
     * A cost run through the site's own money formatter.
     *
     * The lookahead rejects a match that continues into a larger number or into
     * a range — "KES 15,000 – 30,000" is a facet label, not a leaked price, and
     * a real rendered price is always followed by markup or a quote.
     */
    asMoney: new RegExp(
      `(?:${values
        .map((value) => formatKes(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|")})(?![\\d,]|\\s*[-–—]\\s*\\d)`,
      "g",
    ),
  };
}

describe("no cost price reaches the browser", () => {
  const sql = connect();
  let site: RunningSite;
  let routes: string[];
  /** Cost value → the SKUs it belongs to. */
  let forbiddenValues: Map<number, string[]>;
  let scanners: ReturnType<typeof buildScanners>;

  before(async () => {
    const [rows, publishable, discovered] = await Promise.all([
      readPrivatePriceRows(sql),
      readRenderableAmounts(sql),
      readPublicRoutes(sql),
    ]);

    routes = discovered;

    // A cost value the site can legitimately arrive at — a published price, a
    // line total, a subtotal — is not evidence of a leak. readRenderableAmounts()
    // computes that set exactly, by running the same pricing engine the pages do.
    forbiddenValues = new Map();
    for (const row of rows) {
      if (row.cost_price === null) continue;
      if (publishable.has(row.cost_price)) continue;
      const owners = forbiddenValues.get(row.cost_price) ?? [];
      owners.push(row.sku);
      forbiddenValues.set(row.cost_price, owners);
    }

    scanners = buildScanners([...forbiddenValues.keys()]);
    site = await startSite();
    console.log(
      `  scanning ${routes.length} routes on ${site.baseUrl} (${site.origin}) ` +
        `for ${forbiddenValues.size} distributor costs`,
    );
  });

  after(async () => {
    await site?.stop();
    await sql.end({ timeout: 5 });
  });

  it("has enough cost values to make the scan meaningful", () => {
    // Guards against the test quietly becoming vacuous — an empty items table,
    // or a change that makes every cost coincide with a legitimate amount, would
    // otherwise turn this file into a lot of assertions about nothing.
    //
    // The threshold is deliberately well below the ~40 the seed currently yields.
    // What it needs to catch is the set collapsing to nothing, not a few more
    // costs colliding with the site's own arithmetic as packages are added —
    // that will happen, and it is not a regression.
    assert.ok(
      forbiddenValues.size >= 25,
      `only ${forbiddenValues.size} distributor costs are distinguishable from the ` +
        `amounts the site may legitimately print. Has the seed run?`,
    );
    assert.ok(routes.length >= 20, `only ${routes.length} public routes discovered`);
  });

  it("never serves a private column name or a distributor cost", async () => {
    const failures: string[] = [];

    for (const route of routes) {
      const url = new URL(route, site.baseUrl).toString();
      const response = await fetch(url);
      const body = await response.text();

      assert.ok(
        response.status < 500,
        `${route} returned ${response.status}; the scan cannot vouch for a page that errored`,
      );

      for (const needle of FORBIDDEN_STRINGS) {
        if (body.includes(needle)) failures.push(`${route} contains the string "${needle}"`);
      }

      const owner = (raw: string) => {
        const value = Number(raw.replace(/[^\d]/g, ""));
        return `${value} (cost of ${forbiddenValues.get(value)?.join(", ") ?? "?"})`;
      };

      for (const match of body.matchAll(scanners.asData)) {
        failures.push(`${route} carries ${owner(match[1])} as a data value: ${match[0].trim()}`);
      }
      for (const match of body.matchAll(scanners.asMoney)) {
        failures.push(`${route} prints ${owner(match[0])} as money: ${match[0]}`);
      }
    }

    assert.deepEqual(failures, [], `\n  ${failures.join("\n  ")}\n`);
  });

  it("does not expose cost_price through the public_items view", async () => {
    const columns = await sql<{ column_name: string }[]>`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'public_items'
    `;
    const names = columns.map((c) => c.column_name);

    assert.ok(names.length > 0, "public_items view is missing");
    for (const forbidden of ["cost_price", "markup_multiplier", "internal_note"]) {
      assert.ok(!names.includes(forbidden), `public_items exposes ${forbidden}`);
    }
  });

  it("does not grant the public roles SELECT on cost_price", async () => {
    const grants = await sql<{ grantee: string; column_name: string }[]>`
      select grantee, column_name from information_schema.column_privileges
      where table_name = 'items'
        and grantee in ('anon', 'authenticated')
        and privilege_type = 'SELECT'
    `;

    assert.ok(grants.length > 0, "the public roles hold no SELECT grant on items at all");
    for (const grant of grants) {
      assert.ok(
        !["cost_price", "markup_multiplier", "internal_note"].includes(grant.column_name),
        `${grant.grantee} can select items.${grant.column_name}`,
      );
    }
  });
});

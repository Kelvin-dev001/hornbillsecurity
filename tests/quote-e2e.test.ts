/**
 * The quote flow, walked as an anonymous visitor.
 *
 * The sprint brief: "Test the whole path end to end as an anonymous visitor
 * before telling me it works." So this drives real HTTP against a running build
 * — server actions, cookies, redirects and all — rather than calling the
 * functions underneath, because the parts most likely to break are the seams
 * between them.
 *
 * The path: add a package → see it on /quote → submit the form → land on
 * /q/[code] → download the PDF → confirm the row in the database, and confirm
 * the prices stayed frozen when the catalogue moves underneath them.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { connect } from "./helpers/db";
import { startSite, type RunningSite } from "./helpers/server";

/**
 * A cookie jar, because the basket is cookie-keyed and fetch will not keep one.
 * Just enough of one to follow a session through a handful of requests.
 */
class Jar {
  private cookies = new Map<string, string>();

  absorb(response: Response) {
    for (const header of response.headers.getSetCookie()) {
      const [pair] = header.split(";");
      const index = pair.indexOf("=");
      if (index > 0) this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1));
    }
  }

  get header(): string {
    return [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }
}


/**
 * The hidden fields of one form on a page, so the test posts what a browser
 * with no JavaScript would.
 *
 * Next encodes a server action differently depending on where it lives: a form
 * in a server component carries `$ACTION_ID_<hash>`, while one bound through
 * useActionState in a client component carries `$ACTION_REF_n`, `$ACTION_n:0`,
 * `$ACTION_n:1` and `$ACTION_KEY`. Reading whatever is actually in the form
 * keeps this test from breaking every time that encoding changes — and from
 * silently posting the wrong form's action, which is what happens when you take
 * the first `$ACTION_ID_` on a page that has five forms on it.
 */
function hiddenFields(html: string, formMarker: string): Record<string, string> {
  const start = html.indexOf(formMarker);
  assert.ok(start >= 0, `no form matching ${formMarker}`);

  const form = html.slice(start, start + html.slice(start).indexOf("</form>"));
  const fields: Record<string, string> = {};

  for (const input of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const name = /name="([^"]*)"/.exec(input[0])?.[1];
    if (!name) continue;
    const raw = /value="([^"]*)"/.exec(input[0])?.[1] ?? "";
    fields[name] = raw
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  return fields;
}

describe("a stranger builds a quote and sends it", () => {
  const sql = connect();
  let site: RunningSite;
  const jar = new Jar();
  let solutionSlug: string;
  let code: string;

  const url = (path: string) => new URL(path, site.baseUrl).toString();
  const get = async (path: string) => {
    const response = await fetch(url(path), {
      headers: { cookie: jar.header },
      redirect: "follow",
    });
    jar.absorb(response);
    return response;
  };

  before(async () => {
    const [row] = await sql<{ slug: string }[]>`
      select slug from solutions where published order by sort_order limit 1
    `;
    solutionSlug = row.slug;
    site = await startSite();
  });

  after(async () => {
    if (code) await sql`delete from quotes where code = ${code}`;
    await site?.stop();
    await sql.end({ timeout: 5 });
  });

  it("starts with an empty quote and no cookie", async () => {
    const response = await get("/quote");
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /Your quote is empty/);
    // Reading a page must not issue a basket cookie to someone who has not asked
    // for anything.
    assert.equal(jar.has("hb_quote"), false, "a cookie was set before anything was added");
  });

  it("adds a package to the quote", async () => {
    // Exactly what the browser posts when the form is submitted with no
    // JavaScript: a plain form POST to the page holding the server action.
    const page = await fetch(url(`/solutions/${solutionSlug}`));
    const html = await page.text();

    // multipart, because that is the encType Next puts on a server-action form
    // and therefore what a browser with no JavaScript sends. fetch sets the
    // boundary itself when handed a FormData.
    const form = new FormData();
    for (const [name, value] of Object.entries(hiddenFields(html, '<form class="contents"'))) {
      form.set(name, value);
    }

    const response = await fetch(url(`/solutions/${solutionSlug}`), {
      method: "POST",
      headers: { cookie: jar.header },
      body: form,
      redirect: "manual",
    });
    jar.absorb(response);

    assert.ok(
      response.status >= 300 && response.status < 400,
      `expected a redirect after adding, got ${response.status}`,
    );
    assert.ok(jar.has("hb_quote"), "no basket cookie after adding a package");
  });

  it("shows the package, its whole bill of materials and a total", async () => {
    const response = await get("/quote");
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.doesNotMatch(body, /Your quote is empty/);
    assert.match(body, /Send this to Hornbill/);
    // The full BOM, not just a package line.
    const rows = (body.match(/<th scope="row"/g) ?? []).length;
    assert.ok(rows >= 5, `only ${rows} bill-of-materials rows on /quote`);
    assert.match(body, /Total, including VAT/);
  });

  it("rejects a number we could not call back", async () => {
    const result = await submit({ phone: "12345" });
    assert.equal(
      result.redirected,
      false,
      `a bad number created a quote: ${result.status} -> ${result.location}`,
    );
    assert.match(
      result.body,
      /Kenyan mobile number/,
      `status ${result.status}, body: ${result.body.slice(0, 300)}`,
    );
  });

  it("saves the quote and redirects to its code", async () => {
    const result = await submit({});
    assert.ok(
      result.location,
      `expected a redirect to /q/CODE, got ${result.status}: ${result.body.slice(0, 300)}`,
    );

    const match = /\/q\/([A-Z0-9]{6})/.exec(result.location);
    assert.ok(match, `redirect was ${result.location}`);
    code = match[1];

    // The code never contains the four characters that get mis-transcribed.
    assert.doesNotMatch(code, /[O0I1]/, `code ${code} contains an ambiguous character`);
  });

  it("empties the basket, so a refresh cannot submit twice", async () => {
    const response = await get("/quote");
    assert.match(await response.text(), /Your quote is empty/);
  });

  it("serves the saved quote at its code, noindex, without the phone number", async () => {
    const response = await fetch(url(`/q/${code}`));
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, new RegExp(code));
    assert.match(body, /Grace Wanjiru Test/);
    assert.match(body, /Nyali/);

    // A shareable link that leaks a mobile number is a link somebody regrets
    // forwarding.
    assert.doesNotMatch(body, /254712345678|0712 345 678/, "the phone number is on the page");
    assert.match(body, /<meta name="robots" content="[^"]*noindex/);
  });

  it("renders the PDF", async () => {
    const response = await fetch(url(`/q/${code}/pdf`));
    const buffer = Buffer.from(await response.arrayBuffer());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
    assert.equal(buffer.subarray(0, 5).toString(), "%PDF-", "not a PDF");
    assert.ok(buffer.length > 5000, `PDF is only ${buffer.length} bytes`);
  });

  it("stores a frozen snapshot, not references to the catalogue", async () => {
    const [row] = await sql<
      {
        lines: { sku: string | null; name: string; unitPrice: number; extended: number }[];
        subtotal: number;
        total: number;
        customer_phone: string;
        submitter_hash: string | null;
        source: string;
      }[]
    >`select lines, subtotal, total, customer_phone, submitter_hash, source
      from quotes where code = ${code}`;

    assert.ok(row, `quote ${code} is not in the database`);
    assert.ok(row.lines.length >= 5, `only ${row.lines.length} frozen lines`);
    assert.equal(row.customer_phone, "254712345678", "the phone was not normalised");
    assert.equal(row.source, "solution_page");

    // Every line carries its own price and label, and nothing that could be
    // used to look one up again.
    for (const line of row.lines) {
      assert.equal(typeof line.name, "string");
      assert.equal(typeof line.unitPrice, "number");
      assert.ok(!("id" in line), "a frozen line carries a database id");
    }

    const sum = row.lines.reduce((total, line) => total + line.extended, 0);
    assert.equal(sum, row.subtotal, "the frozen lines do not add up to the stored subtotal");

    // An IP is never stored, only a hash of one.
    if (row.submitter_hash) {
      assert.doesNotMatch(row.submitter_hash, /\d+\.\d+\.\d+\.\d+/);
      assert.equal(row.submitter_hash.length, 32);
    }
  });

  it("keeps the quoted prices when the catalogue moves underneath it", async () => {
    // The whole promise of /q/[code]. Repricing an item the quote contains must
    // change nothing on the saved quotation.
    const [before] = await sql<{ total: number }[]>`select total from quotes where code = ${code}`;

    const [item] = await sql<{ id: string; cost_price: number | null }[]>`
      select i.id, i.cost_price from items i
      join solution_lines l on l.item_id = i.id
      join solutions s on s.id = l.solution_id and s.slug = ${solutionSlug}
      where i.cost_price is not null limit 1
    `;
    assert.ok(item, "no priced item in the package to move");

    const original = item.cost_price as number;
    try {
      await sql`update items set cost_price = ${original * 2} where id = ${item.id}`;

      const response = await fetch(url(`/q/${code}`), { cache: "no-store" });
      const body = await response.text();
      const [after] = await sql<{ total: number }[]>`select total from quotes where code = ${code}`;

      assert.equal(after.total, before.total, "the stored total changed");
      assert.match(body, new RegExp(formatKes(before.total).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } finally {
      await sql`update items set cost_price = ${original} where id = ${item.id}`;
    }
  });

  it("refuses a malformed code without touching the database", async () => {
    for (const bad of ["ABC", "AB0CD3", "ABICD3", "toolongcode"]) {
      const response = await fetch(url(`/q/${bad}`));
      assert.equal(response.status, 404, `${bad} did not 404`);
    }
  });

  /** Posts the submission form the way a browser with no JavaScript would. */
  async function submit(overrides: Record<string, string>) {
    const page = await fetch(url("/quote"), { headers: { cookie: jar.header } });
    const html = await page.text();

    // The submission form specifically — /quote also carries a quantity form per
    // line, a remove form per line and a clear form, and taking the first
    // `$ACTION_ID_` on the page posts a quantity change instead.
    const fields: Record<string, string> = {
      ...hiddenFields(html, '<form class="space-y-4"'),
      name: "Grace Wanjiru Test",
      phone: "0712345678",
      email: "",
      county: "Mombasa",
      area: "Nyali",
      propertyType: "Home",
      website: "",
      ...overrides,
    };

    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);

    const response = await fetch(url("/quote"), {
      method: "POST",
      headers: { cookie: jar.header },
      body: form,
      redirect: "manual",
    });
    jar.absorb(response);

    const body = await response.text();
    // A successful submit is a 303 with an empty body; a validation failure is a
    // 200 with the page re-rendered around the error. Reading the Location
    // header rather than scraping the body keeps those two apart.
    const location = response.headers.get("location") ?? "";

    return { status: response.status, body, location, redirected: Boolean(location) };
  }
});

function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/[  ]/g, " ");
}

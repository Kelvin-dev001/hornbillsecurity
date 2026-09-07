/**
 * The quote flow's pure logic: reference codes, phone normalisation and the
 * frozen snapshot.
 *
 * The end-to-end path — add, review, submit, PDF — is exercised by
 * tests/quote-e2e.test.ts against a running site.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CODE_ALPHABET,
  CODE_LENGTH,
  generateQuoteCode,
  isValidQuoteCode,
  normaliseQuoteCode,
} from "../lib/quote/code";
import { formatKenyanMobile, normaliseKenyanMobile } from "../lib/quote/phone";
import { freezeLines } from "../lib/quote/freeze";
import type { Bom } from "../lib/pricing/bom";

describe("quote codes", () => {
  it("excludes the four characters that get mis-transcribed", () => {
    // docs/02: no O, 0, I or 1. The code is read down a phone line and written
    // on a survey sheet, and those four are where it goes wrong.
    for (const character of "O0I1") {
      assert.ok(!CODE_ALPHABET.includes(character), `alphabet contains ${character}`);
    }
    assert.equal(CODE_ALPHABET.length, 32);
  });

  it("generates six valid characters, and not the same one twice", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      const code = generateQuoteCode();
      assert.equal(code.length, CODE_LENGTH);
      assert.ok(isValidQuoteCode(code), `${code} is not valid`);
      codes.add(code);
    }
    // 32^6 is about a billion, so 500 draws colliding would mean the generator
    // is not random rather than that we were unlucky.
    assert.equal(codes.size, 500, "generated a duplicate code in 500 draws");
  });

  it("accepts a code typed in lower case or with punctuation", () => {
    assert.equal(normaliseQuoteCode(" ab2cd3 "), "AB2CD3");
    assert.equal(normaliseQuoteCode("AB2-CD3"), "AB2CD3");
    assert.equal(normaliseQuoteCode("AB2CD3XXXX"), "AB2CD3");
  });

  it("rejects an excluded character rather than guessing what was meant", () => {
    // A substitution guess that lands on a real code would open somebody else's
    // quotation, with their name and area on it, and the reader could not tell.
    assert.equal(isValidQuoteCode(normaliseQuoteCode("AB0CD3")), false);
    assert.equal(isValidQuoteCode(normaliseQuoteCode("ABOCD3")), false);
    assert.equal(isValidQuoteCode(normaliseQuoteCode("AB1CD3")), false);
    assert.equal(isValidQuoteCode(normaliseQuoteCode("ABICD3")), false);
    assert.equal(isValidQuoteCode("AB2CD"), false);
  });
});

describe("Kenyan mobile numbers", () => {
  it("accepts the three ways a customer will write the same number", () => {
    for (const input of [
      "0759293030",
      "0759 293 030",
      "+254759293030",
      "254759293030",
      "254-759-293-030",
      "+254 759 293 030",
    ]) {
      assert.equal(normaliseKenyanMobile(input), "254759293030", `failed on ${input}`);
    }
  });

  it("accepts the newer 01xx range", () => {
    assert.equal(normaliseKenyanMobile("0112345678"), "254112345678");
    assert.equal(normaliseKenyanMobile("+254112345678"), "254112345678");
  });

  it("rejects what we cannot call back or reach on WhatsApp", () => {
    for (const input of ["", "0759", "020 1234567", "+447700900000", "12345", "abc"]) {
      assert.equal(normaliseKenyanMobile(input), null, `accepted ${input}`);
    }
  });

  it("formats back to the way a Kenyan writes it down", () => {
    assert.equal(formatKenyanMobile("254759293030"), "0759 293 030");
  });
});

describe("freezing a quote", () => {
  const bom = {
    lines: [
      {
        id: "l1",
        lineType: "primary" as const,
        sku: "DS-2CD1043G2-LIUF/SL",
        href: "/catalog/item/x",
        name: "4MP Bullet",
        spec: "4MP / 30m",
        unit: "each",
        quantity: 4,
        unitPrice: 11900,
        extended: 47600,
        note: null,
        provisional: false,
      },
      {
        id: "l2",
        lineType: "labour" as const,
        sku: null,
        href: null,
        name: "Camera installation, per point",
        spec: "point",
        unit: "point",
        quantity: 4,
        unitPrice: 3000,
        extended: 12000,
        note: "Per camera position.",
        provisional: false,
      },
    ],
    groups: [],
    subtotalItems: 47600,
    subtotalLabour: 12000,
    subtotal: 59600,
    vatRate: 16,
    vatAmount: 9536,
    total: 69136,
    provisionalAmount: 0,
    provisionalShare: 0,
  } satisfies Bom;

  it("keeps every price and label as text and integers, with no foreign keys", () => {
    const frozen = freezeLines(bom);

    assert.equal(frozen.length, 2);
    assert.deepEqual(frozen[0], {
      kind: "item",
      sku: "DS-2CD1043G2-LIUF/SL",
      name: "4MP Bullet",
      spec: "4MP / 30m",
      unit: "each",
      quantity: 4,
      unitPrice: 11900,
      extended: 47600,
      lineType: "primary",
      group: null,
      note: null,
    });

    // Nothing in the snapshot can be used to look a price up again — which is
    // the point. docs/02: reopening a quote must show what the customer was
    // shown, whatever the catalogue has done since.
    for (const line of frozen) {
      assert.ok(!("id" in line), "a frozen line carries a database id");
      assert.ok(!("href" in line), "a frozen line carries a catalogue link");
      assert.equal(typeof line.unitPrice, "number");
    }
  });

  it("marks a labour line as a service", () => {
    const frozen = freezeLines(bom);
    assert.equal(frozen[1].kind, "service");
    assert.equal(frozen[1].sku, null);
    assert.equal(frozen[1].lineType, "labour");
  });

  it("totals to what the basket totalled", () => {
    const frozen = freezeLines(bom);
    const sum = frozen.reduce((total, line) => total + line.extended, 0);
    assert.equal(sum, bom.subtotal);
  });
});

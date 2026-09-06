/**
 * The formula evaluator, tested hardest on what it must REFUSE.
 *
 * Quantity formulas come out of the database and are editable from an admin
 * form. If this parser ever grew into eval(), that form would be a remote code
 * execution hole. Half of this file exists to keep it from doing so quietly.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateFormula, FormulaError, formulaVariables } from "../lib/pricing/formula";

const rules = {
  cameras: 4,
  cable_m_per_camera_residential: 30,
  cable_wastage_factor: 1.15,
  trunking_m_per_camera: 12,
  connectors_per_camera: 4,
  cameras_per_psu_12v_10a: 8,
  poe_ports_headroom: 1.25,
  retention_days: 14,
  hdd_gb_per_channel_per_day_4mp: 22,
};

describe("evaluateFormula", () => {
  it("does arithmetic with the usual precedence", () => {
    assert.equal(evaluateFormula("2 + 3 * 4", {}), 14);
    assert.equal(evaluateFormula("(2 + 3) * 4", {}), 20);
    assert.equal(evaluateFormula("10 / 4", {}), 2.5);
    assert.equal(evaluateFormula("2 - 3 - 4", {}), -5);
    assert.equal(evaluateFormula("-3 + 10", {}), 7);
    assert.equal(evaluateFormula("1.5 * 2", {}), 3);
  });

  it("resolves pricing rules and builder variables by name", () => {
    assert.equal(evaluateFormula("cameras * connectors_per_camera", rules), 16);
    assert.equal(evaluateFormula("cameras_per_psu_12v_10a", rules), 8);
  });

  it("evaluates the real cable formula", () => {
    // 4 cameras x 30 m x 1.15 = 138 m, which is one 305 m box.
    assert.equal(
      evaluateFormula(
        "ceil(cameras * cable_m_per_camera_residential * cable_wastage_factor / 305)",
        rules,
      ),
      1,
    );
    // 16 cameras needs two.
    assert.equal(
      evaluateFormula(
        "ceil(cameras * cable_m_per_camera_residential * cable_wastage_factor / 305)",
        { ...rules, cameras: 16 },
      ),
      2,
    );
  });

  it("evaluates the published storage formula", () => {
    // docs/01 §6: HDD_GB = channels x gb_per_channel_per_day x retention_days.
    assert.equal(
      evaluateFormula("cameras * hdd_gb_per_channel_per_day_4mp * retention_days", rules),
      1232,
    );
  });

  it("supports min, max, ceil, floor and round", () => {
    assert.equal(evaluateFormula("min(3, 7)", {}), 3);
    assert.equal(evaluateFormula("max(3, 7, 11)", {}), 11);
    assert.equal(evaluateFormula("ceil(4.1)", {}), 5);
    assert.equal(evaluateFormula("floor(4.9)", {}), 4);
    assert.equal(evaluateFormula("round(4.5)", {}), 5);
    assert.equal(evaluateFormula("ceil(cameras * poe_ports_headroom)", rules), 5);
  });

  it("reports the names a formula depends on", () => {
    assert.deepEqual(formulaVariables("ceil(cameras * trunking_m_per_camera / 2)"), [
      "cameras",
      "trunking_m_per_camera",
    ]);
    assert.deepEqual(formulaVariables("min(1, 2)"), []);
  });
});

describe("evaluateFormula refuses", () => {
  const rejects = (formula: string, because: string) => {
    it(because, () => {
      assert.throws(() => evaluateFormula(formula, rules), FormulaError, `accepted: ${formula}`);
    });
  };

  // An unknown name is the dangerous one: returning 0 would quote a camera
  // system with no cable in it, and the total would look perfectly plausible.
  rejects("cable_m_per_camra * 2", "an unknown name, rather than treating it as zero");
  rejects("CAMERAS", "an uppercase name that does not match a rule");

  rejects("sqrt(16)", "a function that is not on the allow-list");
  rejects("ceil(1, 2)", "the wrong number of arguments");
  rejects("ceil()", "a call with no arguments");

  // The reason this module exists.
  rejects("process.exit(1)", "anything reaching for a global");
  rejects("require('fs')", "a require call");
  rejects("(function(){})()", "an inline function");
  rejects("cameras.constructor", "property access");
  rejects("cameras['x']", "bracket access");
  rejects("1; cameras", "a statement separator");
  rejects("`${cameras}`", "a template literal");
  rejects("cameras => 1", "an arrow function");
  rejects("cameras ** 2", "an operator that is not on the allow-list");
  rejects("cameras % 2", "the modulo operator");
  rejects("0x10", "hexadecimal, which is not a plain decimal number");

  rejects("2 +", "a formula that ends mid-expression");
  rejects("(2 + 3", "an unclosed bracket");
  rejects("2 + 3)", "a stray closing bracket");
  rejects("", "an empty formula");
  rejects("   ", "a formula of only whitespace");
  rejects("cameras / 0", "division by zero");
  rejects("2 3", "two expressions with nothing joining them");
});

describe("FormulaError", () => {
  it("names the formula that failed", () => {
    try {
      evaluateFormula("cameras * mystery_rule", rules);
      assert.fail("should have thrown");
    } catch (error) {
      assert.ok(error instanceof FormulaError);
      assert.match(error.message, /unknown name "mystery_rule"/);
      assert.match(error.message, /cameras \* mystery_rule/);
    }
  });
});

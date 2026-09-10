/**
 * The read-retry guard.
 *
 * This exists because a single slow moment on Supabase took down a whole
 * production build: `select … from site_settings limit 1` came back `57014
 * canceling statement due to statement timeout`, and unlike its own prerender
 * timeout Next does not retry a query that errors — so one page's failed read
 * ended the export.
 *
 * A guard like that is worth very little if it silently stops matching the
 * errors it was written for. postgres.js wraps the driver error and Drizzle
 * wraps that again, so the code that matters is nested two levels down, and a
 * refactor of either library could quietly break the detection with no visible
 * symptom until the next bad build. Hence these tests.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readWithRetry } from "../lib/cache";

/** The shape drizzle hands up: its own error, with the driver error as cause. */
function wrappedPgError(code: string): Error {
  const driver = Object.assign(new Error("canceling statement due to statement timeout"), {
    code,
    severity: "ERROR",
  });
  return Object.assign(new Error("Failed query: select ..."), { cause: driver });
}

describe("readWithRetry", () => {
  it("returns the value when the read succeeds first time", async () => {
    let calls = 0;
    const value = await readWithRetry(async () => {
      calls += 1;
      return "ok";
    }, "test");

    assert.equal(value, "ok");
    assert.equal(calls, 1, "a successful read must not be repeated");
  });

  it("retries a statement timeout and returns the retry's value", async () => {
    let calls = 0;
    const value = await readWithRetry(async () => {
      calls += 1;
      if (calls === 1) throw wrappedPgError("57014");
      return "recovered";
    }, "test");

    assert.equal(value, "recovered");
    assert.equal(calls, 2);
  });

  it("finds the code through drizzle's and postgres.js's wrapping", async () => {
    // The exact nesting from the build failure this was written for. If this
    // stops passing after a dependency bump, the guard is off and builds will
    // start dying again.
    const error = wrappedPgError("57014");
    assert.equal((error as { code?: string }).code, undefined, "code is not on the outer error");

    let calls = 0;
    await readWithRetry(async () => {
      calls += 1;
      if (calls < 2) throw error;
      return null;
    }, "test");

    assert.equal(calls, 2, "a nested transient code must still be retried");
  });

  it("retries a connection failure", async () => {
    for (const code of ["08006", "53300", "ECONNRESET", "ETIMEDOUT"]) {
      let calls = 0;
      await readWithRetry(async () => {
        calls += 1;
        if (calls < 2) throw Object.assign(new Error(code), { code });
        return null;
      }, "test");
      assert.equal(calls, 2, `${code} should be retried`);
    }
  });

  it("throws a real error immediately, without retrying", async () => {
    // A missing column or a bad query must fail loudly and at once. Retrying it
    // three times just makes a broken build slower to diagnose.
    let calls = 0;
    await assert.rejects(
      readWithRetry(async () => {
        calls += 1;
        throw Object.assign(new Error('column "nope" does not exist'), { code: "42703" });
      }, "test"),
      /does not exist/,
    );

    assert.equal(calls, 1, "a non-transient error must not be retried");
  });

  it("gives up after three attempts and rethrows the last error", async () => {
    let calls = 0;
    await assert.rejects(
      readWithRetry(async () => {
        calls += 1;
        throw wrappedPgError("57014");
      }, "test"),
      /Failed query/,
    );

    assert.equal(calls, 3, "three attempts, then surface it");
  });
});

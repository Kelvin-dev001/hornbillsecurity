/**
 * Gets a running site for the leak test to fetch from.
 *
 * Order of preference:
 *   1. TEST_BASE_URL, if it is set and answering.
 *   2. An already-running dev or production server on localhost:3000.
 *   3. `next start` on a spare port, using the existing production build.
 *
 * Option 3 matters: the production build is what ships, and it prerenders the
 * catalogue at build time. If the leak test only ever ran against `next dev` it
 * would be testing a different renderer from the one the public sees.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const FALLBACK_PORT = 3123;
const READY_TIMEOUT_MS = 90_000;

export type RunningSite = {
  baseUrl: string;
  /** How the site was obtained, for the test log. */
  origin: "TEST_BASE_URL" | "already running" | "next start";
  stop: () => Promise<void>;
};

async function answers(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(3000) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

async function waitUntilReady(baseUrl: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`next start exited with code ${child.exitCode} before answering`);
    }
    if (await answers(baseUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`next start did not answer on ${baseUrl} within ${READY_TIMEOUT_MS}ms`);
}

export async function startSite(): Promise<RunningSite> {
  const configured = process.env.TEST_BASE_URL?.replace(/\/$/, "");
  if (configured) {
    if (!(await answers(configured))) {
      throw new Error(`TEST_BASE_URL is set to ${configured} but nothing is answering there.`);
    }
    return { baseUrl: configured, origin: "TEST_BASE_URL", stop: async () => {} };
  }

  const local = "http://localhost:3000";
  if (await answers(local)) {
    return { baseUrl: local, origin: "already running", stop: async () => {} };
  }

  const fallback = `http://localhost:${FALLBACK_PORT}`;
  if (await answers(fallback)) {
    // Node runs test files in parallel, so the leak scan and the end-to-end walk
    // both reach this point. Whichever arrives second shares the server the
    // first started rather than failing on EADDRINUSE — and does not stop it,
    // since it does not own it.
    return { baseUrl: fallback, origin: "already running", stop: async () => {} };
  }

  if (!existsSync(".next/BUILD_ID")) {
    throw new Error(
      "No server to test against. Either start one (`npm run dev`) or build first " +
        "(`npm run build`) so this test can run `next start` itself.",
    );
  }

  const baseUrl = fallback;

  // The next binary is run directly rather than through `npx` with shell: true.
  // A shell wrapper means child.kill() kills the shell and orphans the server,
  // which holds the port and keeps this process alive after the tests pass — the
  // test then appears to hang having already succeeded.
  const child = spawn(
    process.execPath,
    [nextBin(), "start", "-p", String(FALLBACK_PORT)],
    { stdio: ["ignore", "ignore", "inherit"] },
  );

  await waitUntilReady(baseUrl, child);

  return {
    baseUrl,
    origin: "next start",
    stop: async () => {
      const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
      child.kill();
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 5000))]);
    },
  };
}

function nextBin(): string {
  const bin = resolve("node_modules/next/dist/bin/next");
  if (!existsSync(bin)) {
    throw new Error(`Cannot find the next binary at ${bin}. Run npm install.`);
  }
  return bin;
}

import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Drizzle client over the Supabase Postgres connection.
 *
 * Uses the pooled ("transaction mode") connection string, so `prepare: false`
 * is required — pgBouncer in transaction mode does not support prepared
 * statements.
 *
 * This connects as the database owner and therefore BYPASSES RLS. It is the
 * right tool for server-rendering published content with an explicit select
 * list, and the wrong tool for anything that should be scoped to a session.
 * Never select cost_price through it in a public code path (CLAUDE.md §2.3).
 */
declare global {
  var __hornbillDb: ReturnType<typeof createDb> | undefined;
}

/**
 * Which Supabase pooler to use, and why it is not the same one at build time.
 *
 * `DATABASE_URL` is the **transaction** pooler (port 6543). It multiplexes many
 * client connections onto fewer server connections, which is exactly right for
 * serverless functions: hundreds of short-lived invocations, each holding a
 * connection for milliseconds.
 *
 * `DATABASE_URL_DIRECT` is the **session** pooler (5432). One client connection
 * gets one server connection for its lifetime. Right for long-lived processes
 * doing a lot of concurrent work — migrations, the seed, and a build.
 *
 * Using the transaction pooler for a build is what produced this, on a
 * `select … from site_settings limit $1`:
 *
 *     invalid input syntax for type bigint: "f"
 *     where: unnamed portal parameter $1 = '...'
 *
 * `"f"` is Postgres's text form of boolean false. A parameter from a different,
 * concurrent query arrived on this one. The same run also produced a Drizzle
 * array mapper receiving `undefined` — a row decoded with another query's column
 * metadata. Two symptoms, one cause: results and parameters crossing between
 * concurrent queries multiplexed over the transaction pooler while 198 routes
 * prerender at once.
 *
 * That is a correctness problem, not a slow build. Crossed parameters can return
 * the wrong row to the wrong caller, and on a site whose central guarantee is
 * that a cost price never reaches a browser, "occasionally returns another
 * query's data" is not a class of bug to tune around.
 *
 * So the build uses the session pooler and the runtime uses the transaction
 * pooler. If DATABASE_URL_DIRECT is not set, the build falls back rather than
 * failing — with a warning, because a silent fallback here reintroduces the bug.
 */
function connectionStringFor(phase: string | undefined): string {
  const isBuild = phase === "phase-production-build";
  const pooled = process.env.DATABASE_URL;
  const direct = process.env.DATABASE_URL_DIRECT;

  if (isBuild) {
    if (direct) return direct;
    console.warn(
      "! DATABASE_URL_DIRECT is not set, so this build is using the transaction " +
        "pooler. Concurrent prerendering over a multiplexed connection has been " +
        "observed to cross query parameters. Set the session-pooler URL.",
    );
  }

  if (!pooled && !direct) {
    throw new Error(
      "DATABASE_URL is not set. Copy it from Supabase → Project Settings → " +
        "Database → Connection string → Transaction pooler, and the session " +
        "pooler as DATABASE_URL_DIRECT. See .env.example.",
    );
  }

  return (pooled ?? direct) as string;
}

/**
 * How many connections one process may hold, which depends on which pooler it
 * is talking to.
 *
 * The session pooler is capped at `pool_size: 15` for the whole project, and a
 * build runs several worker processes that each hold their own pool — so five
 * per worker overshoots it and the losers get
 * `(EMAXCONNSESSION) max clients reached in session mode`. Three per worker
 * keeps four workers inside the cap with headroom, and on a session connection
 * three is genuinely three because nothing is multiplexed.
 *
 * At runtime the transaction pooler is doing the multiplexing and a serverless
 * instance serves one request at a time, so five is comfortable there.
 */
function poolSizeFor(phase: string | undefined): number {
  return phase === "phase-production-build" ? 3 : 5;
}

function createDb() {
  const phase = process.env.NEXT_PHASE;
  const connectionString = connectionStringFor(phase);

  // Opening a connection to the Supabase pooler takes a second or two from
  // here; queries themselves come back in about 250ms. connect_timeout bounds a
  // connection that never establishes, and is set generously on purpose — a
  // short one turns ordinary slowness into a hard build failure, which is worse
  // than waiting. idle_timeout releases connections a build worker has finished
  // with, so several prerendering at once do not each hold a full pool open.
  // `prepare: false` is required on the transaction pooler and harmless on the
  // session pooler, so it stays on for both rather than being made conditional.
  const client = postgres(connectionString, {
    prepare: false,
    max: poolSizeFor(phase),
    connect_timeout: 60,
    idle_timeout: 20,
  });

  return drizzle(client, { schema });
}

// Reused across hot reloads in development so `next dev` does not exhaust the
// connection pool.
export const db = globalThis.__hornbillDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__hornbillDb = db;
}

export { schema };

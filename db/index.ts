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

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy it from Supabase → Project Settings → " +
        "Database → Connection string → Transaction pooler. See .env.example.",
    );
  }

  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

// Reused across hot reloads in development so `next dev` does not exhaust the
// connection pool.
export const db = globalThis.__hornbillDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalThis.__hornbillDb = db;
}

export { schema };

/**
 * Seed runner — `npm run db:seed`.
 *
 * A standalone CLI script with its own connection: it deliberately does not
 * import db/index.ts, which is marked `server-only` and belongs to the Next.js
 * runtime.
 *
 * Idempotent: re-running updates the single site_settings row rather than
 * failing or duplicating it. Safe to run after every migration.
 *
 * Later sprints extend this in the order set out in docs/02 §Seed order:
 *   site_settings → pricing_rules → brands → categories → items → services →
 *   solutions + solution_lines → locations → projects → testimonials → posts
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { siteSettings } from "../schema";
import { siteSettingsSeed } from "./site-settings";

config({ path: ".env.local", quiet: true });

async function main() {
  const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy it from Supabase → Project Settings → " +
        "Database → Connection string. See .env.example.",
    );
  }

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    const { id: _id, ...updatable } = siteSettingsSeed;

    await db
      .insert(siteSettings)
      .values(siteSettingsSeed)
      .onConflictDoUpdate({ target: siteSettings.id, set: updatable });

    console.log("✓ site_settings seeded");
  } finally {
    await client.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("✗ Seed failed:", error);
    process.exit(1);
  });

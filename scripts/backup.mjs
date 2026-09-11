/**
 * A database backup you own — `npm run db:backup`.
 *
 * docs/05 Sprint 8 asks for "automated database backups". Two halves, and this
 * is only one of them:
 *
 * **Supabase's own backups.** Daily, retained for a window that depends on the
 * plan — on the free tier that window is short and there is no point-in-time
 * recovery. That is the owner's call and it is recorded as an open item, not
 * something a script can fix.
 *
 * **A copy that does not live in the same account.** This. Because the failure
 * this protects against is not a disk dying — Supabase handles that — it is
 * somebody with admin access running the wrong UPDATE, or the project being
 * suspended, or a billing lapse. A backup inside the account you lost access to
 * is not a backup.
 *
 * What is in it: the whole public schema and its data, as a plain `.sql` file
 * from `pg_dump`. Small enough to be trivial — the catalogue is ~250 rows and
 * the articles are the largest thing in it.
 *
 * ## It contains cost prices
 *
 * `CLAUDE.md` §2.3 is about never sending `cost_price` to a *browser*, and a
 * backup is the one artefact that legitimately contains it. So the file is
 * written to a gitignored directory, the script refuses to run if that would
 * put it inside a tracked path, and the reminder below is not decoration: a
 * dump pasted into a chat or committed to a repository is the leak the whole
 * schema design exists to prevent.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// The session pooler, not the transaction pooler: pg_dump needs a real session.
const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "DATABASE_URL_DIRECT is not set. pg_dump needs the session-pooler " +
      "connection string (port 5432), not the transaction pooler.",
  );
  process.exit(1);
}

const dir = join(process.cwd(), "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const file = join(dir, `hornbill-${stamp}.sql`);

mkdirSync(dir, { recursive: true });

// Refuse to write somewhere git would pick it up. The dump contains every
// cost price in the catalogue.
const gitignore = join(process.cwd(), ".gitignore");
const ignored =
  existsSync(gitignore) && /^\s*(\/)?backups\/?\s*$/m.test(readFileSync(gitignore, "utf8"));

if (!ignored) {
  console.error(
    "backups/ is not in .gitignore. Refusing to write a dump containing every " +
      "cost price into a tracked directory. Add `backups/` to .gitignore first.",
  );
  process.exit(1);
}

console.log(`Dumping the public schema to ${file} …`);

try {
  execFileSync(
    "pg_dump",
    [
      connectionString,
      "--schema=public",
      "--no-owner",
      "--no-privileges",
      // Keeps the file readable and diffable, which matters more than size here.
      "--column-inserts",
      "--file",
      file,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
} catch (error) {
  console.error(
    "\npg_dump failed. If it is not installed, it ships with the Postgres " +
      "client tools:\n" +
      "  Windows — install PostgreSQL and add its bin/ to PATH\n" +
      "  macOS   — brew install libpq && brew link --force libpq\n" +
      "  Linux   — apt install postgresql-client\n\n" +
      `Version mismatches matter: pg_dump must be at least as new as the server.\n${
        error instanceof Error ? error.message : String(error)
      }`,
  );
  process.exit(1);
}

const { size } = statSync(file);
console.log(`✓ ${file} (${(size / 1024).toFixed(0)} KB)`);
console.log(
  "\n  This file contains every cost price in the catalogue. Keep it somewhere\n" +
    "  that is not the Supabase account, and do not paste it anywhere.\n",
);

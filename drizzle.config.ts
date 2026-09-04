import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Local runs read .env.local; on Vercel the variables are already in the env.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations need the DIRECT (session) connection, not the pooler —
    // pgBouncer in transaction mode cannot run DDL reliably.
    url: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});

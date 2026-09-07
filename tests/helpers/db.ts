/**
 * Test-only database access.
 *
 * The tests read `cost_price` on purpose: the leak test needs to know the exact
 * values that must never appear in a response body, and the parity test needs
 * them to check the TypeScript price rule against the generated column. That is
 * the one legitimate reason to read the column outside the admin portal, which
 * is why this file lives under tests/ and connects directly rather than going
 * anywhere near lib/.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

export function connect() {
  const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_DIRECT is not set, so the tests have no database to read. " +
        "Copy .env.example to .env.local and fill it in.",
    );
  }

  return postgres(connectionString, {
    prepare: false,
    max: 1,
    onnotice: () => {},
    // A test that blocks on a lock should fail in half a minute with a clear
    // message, not sit there for eight. Every query here reads or writes a
    // handful of rows.
    connection: { statement_timeout: 30_000 },
  });
}

export type PrivatePriceRow = {
  sku: string;
  slug: string;
  published: boolean;
  cost_price: number | null;
  price_override: number | null;
  market_ceiling_price: number | null;
  markup_multiplier: string;
  effective_price: number | null;
};

export async function readPrivatePriceRows(
  sql: ReturnType<typeof connect>,
): Promise<PrivatePriceRow[]> {
  return sql<PrivatePriceRow[]>`
    select sku, slug, published, cost_price, price_override,
           market_ceiling_price, markup_multiplier, effective_price
    from items
    order by sku
  `;
}

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

  return postgres(connectionString, { prepare: false, max: 1, onnotice: () => {} });
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

/**
 * Every number the site is allowed to print, so the leak test can tell a leaked
 * distributor price from a coincidence.
 *
 * It is a real coincidence and not a hypothetical one: the 1 TB surveillance
 * drive costs 6,500 and therefore sells for 9,100, and 9,100 is also exactly
 * what the 16-channel 7100 DVR costs us. A test that simply banned every cost
 * value from every page would fail on the drive's own published price.
 */
export async function readPublishablePrices(
  sql: ReturnType<typeof connect>,
): Promise<Set<number>> {
  const [itemPrices, servicePrices, rules, settings] = await Promise.all([
    sql<{ v: number }[]>`select distinct effective_price as v from items
                          where published and effective_price is not null`,
    sql<{ v: number }[]>`select distinct price as v from services
                          where published and price is not null`,
    sql<{ v: string }[]>`select value as v from pricing_rules`,
    sql<{ v: number }[]>`select site_survey_fee as v from site_settings`,
  ]);

  return new Set([
    ...itemPrices.map((r) => r.v),
    ...servicePrices.map((r) => r.v),
    ...rules.map((r) => Number(r.v)),
    ...settings.map((r) => r.v),
  ]);
}

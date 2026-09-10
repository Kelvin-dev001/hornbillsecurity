import { config } from "dotenv";
import postgres from "postgres";
config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const rows = await sql`
  select price_basis::text as basis, published, (cost_price is null) as no_cost, count(*)::int as n
  from items group by 1,2,3 order by 1,2,3`;
console.log('basis'.padEnd(18), 'pub'.padEnd(6), 'no_cost'.padEnd(8), 'n');
for (const r of rows) console.log(r.basis.padEnd(18), String(r.published).padEnd(6), String(r.no_cost).padEnd(8), r.n);
await sql.end();

/**
 * Batched upserts.
 *
 * The seed writes ~250 rows. One statement per row means one round trip per row,
 * and against a Supabase instance in ap-south-1 that is two minutes and a
 * half-finished table if the connection drops. Everything here goes in as a
 * single multi-row INSERT ... ON CONFLICT DO UPDATE instead, which is also
 * atomic per table.
 */
import { getTableColumns, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * The `set` clause for an upsert: take the new value for every column except
 * the conflict key, the row's identity, and anything the database computes.
 */
export function overwriteAllExcept<T extends PgTable>(
  table: T,
  except: string[],
): Record<string, SQL> {
  const columns = getTableColumns(table);
  const set: Record<string, SQL> = {};

  for (const [property, column] of Object.entries(columns)) {
    if (except.includes(property)) continue;
    // Generated columns cannot be assigned, and created_at must survive a
    // re-seed or "when did this row first appear" stops meaning anything.
    if (column.generated) continue;
    if (column.name === "created_at") continue;

    set[property] = sql.raw(`excluded."${column.name}"`);
  }

  return set;
}

import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * ────────────────────────────────────────────────────────────────────────────
 *  SERVICE-ROLE CLIENT — BYPASSES ROW LEVEL SECURITY
 * ────────────────────────────────────────────────────────────────────────────
 *
 * This client can read items.cost_price. A leaked distributor price destroys
 * the business (CLAUDE.md §2.3), so:
 *
 *   1. `import "server-only"` above turns any client-bundle import into a
 *      BUILD ERROR, not a runtime surprise.
 *   2. eslint.config.mjs forbids importing this module from anywhere except
 *      app/api/**, app/admin/** and db/**.
 *   3. SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so it is never
 *      inlined into a browser bundle.
 *
 * Anything selected through this client is, by default, unsafe to render.
 * Public queries go through lib/supabase/server.ts and an explicit select list.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to use the admin client. See .env.example.",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

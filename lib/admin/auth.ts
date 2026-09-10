import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * The admin gate, server-side.
 *
 * CLAUDE.md §3: Supabase Auth, a single admin user. There is no role table and
 * no permission model — anybody who can sign in to this project's Supabase is
 * the owner, and adding a role check would be ceremony around a single account.
 * If a second person ever needs access, that is the moment to add one, and the
 * check lives here so there is one place to change.
 *
 * Called by app/admin/layout.tsx, so it runs before any admin page renders, and
 * again by every action that writes. middleware.ts is the outer gate; this is
 * the one that actually protects the data, because a matcher can be
 * misconfigured and a server action can be invoked directly by anyone who knows
 * its id.
 */
export const getAdminUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();

  // getUser() verifies the token with Supabase. getSession() would only decode
  // the cookie, which is forgeable.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
});

/** Redirects to the login page unless somebody is signed in. */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  return user;
}

/**
 * The guard for server actions.
 *
 * Throws rather than redirects: an action reached without a session is not a
 * navigation that went wrong, it is a write that must not happen.
 */
export async function assertAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}

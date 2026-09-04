"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for the browser.
 *
 * Anon key only. Everything it can reach is governed by RLS, so this client is
 * safe to ship — but it is still only for interactivity. Content that has to be
 * in the initial HTML (every price, spec and BOM — CLAUDE.md §2.1) is fetched
 * server-side, never here.
 */
export function createClient() {
  return createBrowserClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}

function requiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  // Indexed access would not survive Next's static replacement of NEXT_PUBLIC_*.
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(`${name} is not set. See .env.example.`);
  }
  return value;
}

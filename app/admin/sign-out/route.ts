import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo/origin";

/**
 * Sign out.
 *
 * A POST, not a link: a GET that destroys a session can be triggered by any
 * image tag on any page, and signing an admin out mid-edit is a cheap thing for
 * someone to do to them.
 */
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(absoluteUrl("/admin/login"), { status: 303 });
}

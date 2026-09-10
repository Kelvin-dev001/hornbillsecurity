import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session refresh, and the gate on /admin.
 *
 * Two jobs, and the order matters. Supabase access tokens are short-lived, so
 * every request through here gets the session refreshed and the rotated cookies
 * written back — without this an admin is signed out mid-edit. Then, and only
 * then, /admin is checked for a signed-in user.
 *
 * This is the outer gate, not the only one. app/admin/layout.tsx checks the
 * session again server-side, because middleware is easy to misconfigure with a
 * matcher and a gate that exists in exactly one place is a gate that eventually
 * gets bypassed. Nothing under /admin renders without both.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured, admin is unreachable rather than unprotected.
  if (!url || !anonKey) {
    if (request.nextUrl.pathname.startsWith("/admin")) {
      return new NextResponse("Admin is not configured.", { status: 503 });
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser(), not getSession(): getSession reads the cookie without verifying
  // it, so a forged one would pass. getUser checks with Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  if (pathname.startsWith("/admin") && !isLogin && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/login";
    // Where they were heading, so signing in lands them there rather than on a
    // dashboard they then have to navigate away from.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isLogin && user) {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname = "/admin";
    dashboard.search = "";
    return NextResponse.redirect(dashboard);
  }

  return response;
}

export const config = {
  /**
   * Everything except static assets and image optimisation.
   *
   * The session refresh has to run broadly — a token that expires while someone
   * is reading a page should be renewed by their next navigation, not on their
   * next visit to /admin.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)",
  ],
};

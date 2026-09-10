import type { Metadata } from "next";
import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminUser } from "@/lib/admin/auth";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * The admin shell.
 *
 * noindex everywhere beneath it, belt and braces with the Disallow in
 * robots.ts — docs/05 Sprint 4's launch checklist asks for both.
 *
 * The session is checked here as well as in middleware. A matcher is a single
 * line of configuration that is easy to get subtly wrong, and this layout is the
 * thing that actually wraps every admin page.
 *
 * The login page lives under /admin too, so this renders bare when nobody is
 * signed in rather than redirecting — middleware already handles that, and a
 * redirect loop between the two would be the obvious way to break sign-in.
 */
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Hornbill admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getAdminUser(), getSiteSettings()]);

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-paper-warm">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-(--container-page) flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="font-display font-semibold text-ink">
            {settings.tradingName}
            <span className="ml-2 rounded-pill bg-ink px-2 py-0.5 text-xs font-normal text-paper">
              admin
            </span>
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-ink">
              View site
            </Link>
            <span className="hidden text-muted-foreground sm:inline">{user.email}</span>
            <form action="/admin/sign-out" method="post">
              <button
                type="submit"
                className="rounded-control border border-line px-3 py-1.5 text-muted-foreground transition-colors hover:border-ink hover:text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <AdminNav />
      </header>

      <main className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

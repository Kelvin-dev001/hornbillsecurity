import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "@/components/admin/login-form";
import logoMark from "@/logo/Hornbill_Logo_Transparent_HighRes.png";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The admin sign-in page.
 *
 * The account itself is created in the Supabase dashboard — Authentication →
 * Users → Add user. There is deliberately no sign-up here and no password
 * reset: a single-admin site with a public registration form is a site with
 * more than one admin, and Supabase already has a reset flow that emails the
 * owner directly.
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, settings] = await Promise.all([searchParams, getSiteSettings()]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <Image src={logoMark} alt="" aria-hidden="true" width={36} height={36} className="size-9" />
          <div>
            <p className="font-display font-semibold text-ink">{settings.tradingName}</p>
            <p className="text-sm text-muted-foreground">Admin</p>
          </div>
        </div>

        <h1 className="mt-8 font-display text-2xl font-semibold text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Prices, packages, articles and leads.
        </p>

        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign-in, on the client.
 *
 * Deliberately the browser client rather than a server action: the Supabase JS
 * SDK sets the session cookies itself, and doing it here means one well-tested
 * path rather than a hand-rolled one that has to get cookie attributes,
 * refresh-token rotation and PKCE right.
 *
 * router.refresh() after signing in, so the server re-renders with the new
 * session before the redirect lands.
 */
const inputClass =
  "h-11 w-full rounded-control border border-line bg-paper px-3 text-base text-ink " +
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    });

    if (signInError) {
      // Supabase says "Invalid login credentials" for both a wrong password and
      // an unknown address, which is the right amount to tell someone guessing.
      setError(signInError.message);
      setPending(false);
      return;
    }

    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {error ? (
        <p
          role="alert"
          className="flex gap-2 rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>

      <Button type="submit" size="cta" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

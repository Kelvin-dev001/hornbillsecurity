"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { submitQuoteAction, type SubmitState } from "@/lib/quote/actions";
import { KENYAN_COUNTIES, PROPERTY_TYPE_CHOICES } from "@/lib/quote/fields";
import { cn } from "@/lib/utils";

/**
 * The submission form.
 *
 * A client component only for useActionState, which is what puts a validation
 * message beside the field that caused it instead of on a separate page. The
 * form itself is ordinary HTML posting to a server action, so it submits and
 * validates server-side with JavaScript disabled too.
 *
 * No CAPTCHA, by the brief. The honeypot below and the rate limit in
 * lib/quote/submit.ts do the work, and neither of them makes a real customer
 * prove they are human on the last screen before they become a lead.
 */
const inputClass =
  "h-11 w-full rounded-control border border-line bg-paper px-3 text-base text-ink " +
  "placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 " +
  "focus-visible:ring-ring/50 focus-visible:outline-none";

export function QuoteForm({ responsePromise }: { responsePromise: string }) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitQuoteAction, {});

  return (
    <form action={action} className="space-y-4">
      {state.error ? (
        <p
          role="alert"
          className="flex gap-2 rounded-control border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" error={state.field === "name" ? state.error : undefined}>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            className={inputClass}
            placeholder="Grace Wanjiru"
          />
        </Field>

        <Field
          label="Phone"
          name="phone"
          hint="07xx, 01xx or +254"
          error={state.field === "phone" ? state.error : undefined}
        >
          <input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            autoComplete="tel"
            className={inputClass}
            placeholder="0712 345 678"
          />
        </Field>

        <Field
          label="Email"
          name="email"
          hint="Optional — we send the PDF here"
          error={state.field === "email" ? state.error : undefined}
        >
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="County" name="county">
          <select id="county" name="county" defaultValue="Mombasa" className={inputClass}>
            {KENYAN_COUNTIES.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Area"
          name="area"
          hint="Nyali, Bamburi, Diani…"
          error={state.field === "area" ? state.error : undefined}
        >
          <input
            id="area"
            name="area"
            required
            className={inputClass}
            placeholder="Nyali"
          />
        </Field>

        <Field label="Property" name="propertyType">
          <select
            id="propertyType"
            name="propertyType"
            defaultValue="Home"
            className={inputClass}
          >
            {PROPERTY_TYPE_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/*
        Honeypot. Hidden from people and from screen readers, irresistible to a
        form-filling bot. tabIndex and autoComplete off so a browser never puts
        anything in it by accident.
      */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" size="cta" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send this to Hornbill"}
      </Button>

      <p className="text-xs text-muted-foreground">
        {responsePromise} We use your number to call you back about this quotation and nothing
        else.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
        {hint ? <span className="ml-2 font-normal text-muted-foreground">{hint}</span> : null}
      </label>
      {children}
      {error ? (
        <p className={cn("text-xs text-danger")} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

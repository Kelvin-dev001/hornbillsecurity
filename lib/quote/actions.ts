"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import type { BasketLine } from "@/db/schema";
import { getSiteSettings } from "@/lib/site-settings";
import {
  BASKET_COOKIE,
  createBasket,
  priceBasket,
  readBasketKey,
  readBasketLines,
  readBuilderInputs,
  writeBasketLines,
  writeBuilderInputs,
} from "./basket";
import { submitQuote, type SubmitInput } from "./submit";

/**
 * Server actions for the quote basket.
 *
 * Every one of these is reached from a plain <form action={...}>, so the whole
 * flow works with JavaScript disabled — Next progressively enhances the form,
 * and without JS the browser posts it and follows the redirect. CLAUDE.md §2.1:
 * interactivity may need the client, but nothing essential should depend on it.
 */

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
} as const;

/** The basket key, creating a basket the first time something is added. */
async function ensureBasketKey(): Promise<string> {
  const existing = await readBasketKey();
  if (existing) return existing;

  const cookieKey = await createBasket();
  const store = await cookies();
  store.set(BASKET_COOKIE, cookieKey, COOKIE_OPTIONS);
  return cookieKey;
}

function mergeLine(lines: BasketLine[], addition: BasketLine): BasketLine[] {
  const existing = lines.find(
    (line) => line.kind === addition.kind && line.ref === addition.ref,
  );
  if (!existing) return [...lines, addition];

  return lines.map((line) =>
    line === existing ? { ...line, quantity: line.quantity + addition.quantity } : line,
  );
}

export async function addToQuoteAction(formData: FormData): Promise<void> {
  const kind = String(formData.get("kind") ?? "");
  const ref = String(formData.get("ref") ?? "").trim();
  const quantity = Math.max(1, Math.min(99, Number(formData.get("quantity") ?? 1) || 1));
  const returnTo = String(formData.get("returnTo") ?? "/quote");

  if ((kind !== "item" && kind !== "solution" && kind !== "builder") || !ref) redirect(returnTo);

  const cookieKey = await ensureBasketKey();
  const lines = await readBasketLines(cookieKey);
  await writeBasketLines(cookieKey, mergeLine(lines, { kind, ref, quantity }));

  // Straight to /quote. Somebody who has just said "add this" is ready to see
  // the total, and a silent add on a static page gives them nothing to react to.
  redirect("/quote?added=1");
}

/**
 * Adds a system built in /build/cctv.
 *
 * The line stores the builder's query string, so the basket keeps repricing it
 * live like anything else. The six answers are saved beside it as well, because
 * docs/02 wants a quote to be reproducible — knowing a customer asked for eight
 * IP cameras with thirty days of footage is what lets the survey start from
 * their intent rather than from a list of parts.
 */
export async function addBuiltSystemAction(formData: FormData): Promise<void> {
  const ref = String(formData.get("ref") ?? "").trim();
  const answers = String(formData.get("answers") ?? "");
  if (!ref) redirect("/build/cctv");

  const cookieKey = await ensureBasketKey();
  const lines = await readBasketLines(cookieKey);
  await writeBasketLines(cookieKey, mergeLine(lines, { kind: "builder", ref, quantity: 1 }));

  try {
    await writeBuilderInputs(cookieKey, answers ? JSON.parse(answers) : null);
  } catch {
    // A malformed answers blob must not lose the line that was just added.
  }

  redirect("/quote?added=1");
}

export async function updateQuantityAction(formData: FormData): Promise<void> {
  const kind = String(formData.get("kind") ?? "");
  const ref = String(formData.get("ref") ?? "");
  const quantity = Math.max(0, Math.min(99, Number(formData.get("quantity") ?? 1) || 0));

  const cookieKey = await readBasketKey();
  if (!cookieKey) redirect("/quote");

  const lines = await readBasketLines(cookieKey);
  const next = lines
    .map((line) => (line.kind === kind && line.ref === ref ? { ...line, quantity } : line))
    .filter((line) => line.quantity > 0);

  await writeBasketLines(cookieKey, next);
  redirect("/quote");
}

export async function removeLineAction(formData: FormData): Promise<void> {
  const kind = String(formData.get("kind") ?? "");
  const ref = String(formData.get("ref") ?? "");

  const cookieKey = await readBasketKey();
  if (!cookieKey) redirect("/quote");

  const lines = await readBasketLines(cookieKey);
  await writeBasketLines(
    cookieKey,
    lines.filter((line) => !(line.kind === kind && line.ref === ref)),
  );
  redirect("/quote");
}

export async function clearBasketAction(): Promise<void> {
  const cookieKey = await readBasketKey();
  if (cookieKey) await writeBasketLines(cookieKey, []);
  redirect("/quote");
}

export type SubmitState = { error?: string; field?: string };

/**
 * Submits the quote and redirects to its page.
 *
 * The redirect is deliberately outside any try/catch: Next implements
 * redirect() by throwing, and catching it here would turn a successful
 * submission into an error message.
 */
export async function submitQuoteAction(
  _previous: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const settings = await getSiteSettings();
  const cookieKey = await readBasketKey();
  const lines = await readBasketLines(cookieKey);
  const basket = await priceBasket(lines, Number(settings.vatRate));
  const builderInputs = await readBuilderInputs(cookieKey);

  const input: SubmitInput = {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    county: String(formData.get("county") ?? "Mombasa"),
    area: String(formData.get("area") ?? ""),
    propertyType: String(formData.get("propertyType") ?? "Home"),
    website: String(formData.get("website") ?? ""),
    source: lines.some((line) => line.kind === "builder")
      ? "builder"
      : lines.some((line) => line.kind === "solution")
        ? "solution_page"
        : "item_page",
  };

  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip");

  const result = await submitQuote({ input, basket, builderInputs, settings, ip });
  if (!result.ok) return { error: result.error, field: result.field };

  // The basket is emptied so a refresh cannot submit the same quote twice.
  if (cookieKey) await writeBasketLines(cookieKey, []);

  // Imported here rather than at the top of the file, and that matters: the
  // email path pulls in @react-pdf/renderer to build the attachment, and this
  // module is imported by the "Add to quote" button on every item and package
  // page. At the top, the whole PDF renderer loaded into every one of those
  // prerenders, which took a solution page from milliseconds to over two
  // minutes and made the build time out. It belongs on the one path that uses it.
  //
  // An email failure must not lose a lead that is already saved. The quote
  // exists, its page works, and the WhatsApp handoff carries the code either way.
  const { sendQuoteEmails } = await import("./email");
  await sendQuoteEmails(result.code).catch((error) => {
    console.error(`[quote ${result.code}] email failed:`, error);
  });

  redirect(`/q/${result.code}?new=1`);
}

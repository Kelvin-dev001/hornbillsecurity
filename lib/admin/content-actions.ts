"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  faqs,
  locations,
  projects,
  testimonials,
  type NewFaq,
  type NewLocation,
  type NewProject,
  type NewTestimonial,
} from "@/db/schema";
import { slugify } from "@/lib/slug";
import { assertAdmin } from "./auth";
import { revalidateContent } from "./revalidate";

/**
 * Writes for locations, projects, testimonials and FAQs.
 *
 * These four were specified in docs/08 Sprint 4 alongside the item, package,
 * service and article editors, and I shipped the public pages and the seeds
 * without the editors — so the owner could read a location page but not change
 * one. Sprint 5's whole "done when" runs through them: it asks for at least four
 * documented case studies and for testimonials, and neither is mine to write.
 *
 * The pattern matches lib/admin/post-actions.ts throughout: validate, write,
 * revalidate the content tag and the affected routes, redirect with a status.
 */

const text = (form: FormData, name: string): string => String(form.get(name) ?? "").trim();
const optional = (form: FormData, name: string): string | null => text(form, name) || null;
const lines = (form: FormData, name: string): string[] =>
  String(form.get(name) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
const number = (form: FormData, name: string): number | null => {
  const raw = text(form, name);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

// ── locations ──────────────────────────────────────────────────────────────

export async function saveLocationAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = text(formData, "id");
  const name = text(formData, "name");
  const intro = text(formData, "intro");
  const localNotes = text(formData, "localNotes");

  const back = id ? `/admin/locations/${id}` : "/admin/locations/new";
  if (!name) redirect(`${back}?status=A+name+is+required.`);
  if (!intro) redirect(`${back}?status=An+intro+is+required.`);

  // docs/02: "A location page with nothing but a find-and-replaced town name is
  // thin content and will be treated as such." The local note is the page's
  // reason to exist, so the form will not save without one.
  if (!localNotes) {
    redirect(
      `${back}?status=A+local+note+is+required.+It+is+what+makes+this+a+page+rather+than+a+template.`,
    );
  }

  const lat = number(formData, "lat");
  const lng = number(formData, "lng");

  const values: Partial<NewLocation> = {
    slug: text(formData, "slug") || slugify(name),
    name,
    county: text(formData, "county") || "Mombasa",
    lat: lat === null ? null : String(lat),
    lng: lng === null ? null : String(lng),
    intro,
    localNotes,
    seoTitle: optional(formData, "seoTitle"),
    seoDescription: optional(formData, "seoDescription"),
    sortOrder: number(formData, "sortOrder") ?? 0,
    published: formData.get("published") === "on",
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(locations).set(values).where(eq(locations.id, id));
    revalidateContent();
    redirect(`/admin/locations/${id}?status=saved`);
  }

  const [created] = await db
    .insert(locations)
    .values(values as NewLocation)
    .returning({ id: locations.id });

  revalidateContent();
  redirect(`/admin/locations/${created.id}?status=saved`);
}

// ── projects ───────────────────────────────────────────────────────────────

export async function saveProjectAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = text(formData, "id");
  const title = text(formData, "title");
  const summary = text(formData, "summary");

  const back = id ? `/admin/projects/${id}` : "/admin/projects/new";
  if (!title) redirect(`${back}?status=A+title+is+required.`);
  if (!summary) redirect(`${back}?status=A+summary+is+required.`);

  const clientName = optional(formData, "clientName");
  const clientNamedOk = formData.get("clientNamedOk") === "on";

  // Naming a client without permission is how a reference becomes a complaint
  // (db/schema.ts, docs/09 item 22). The form refuses rather than quietly
  // publishing the name and relying on the read layer to hide it.
  if (clientNamedOk && !clientName) {
    redirect(`${back}?status=Tick+the+permission+box+only+when+there+is+a+client+name+to+publish.`);
  }

  const completedAt = text(formData, "completedAt");

  const values: Partial<NewProject> = {
    slug: text(formData, "slug") || slugify(title),
    title,
    clientName,
    clientNamedOk,
    sector: optional(formData, "sector"),
    locationId: optional(formData, "locationId"),
    categoryId: optional(formData, "categoryId"),
    solutionId: optional(formData, "solutionId"),
    summary,
    challenge: optional(formData, "challenge"),
    siteConditions: optional(formData, "siteConditions"),
    solution: optional(formData, "solution"),
    outcome: optional(formData, "outcome"),
    images: lines(formData, "images"),
    completedAt: completedAt ? new Date(completedAt) : null,
    sortOrder: number(formData, "sortOrder") ?? 0,
    published: formData.get("published") === "on",
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(projects).set(values).where(eq(projects.id, id));
    revalidateContent();
    redirect(`/admin/projects/${id}?status=saved`);
  }

  const [created] = await db
    .insert(projects)
    .values(values as NewProject)
    .returning({ id: projects.id });

  revalidateContent();
  redirect(`/admin/projects/${created.id}?status=saved`);
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = text(formData, "id");
  if (id) await db.delete(projects).where(eq(projects.id, id));
  revalidateContent();
  redirect("/admin/projects?status=deleted");
}

// ── testimonials ───────────────────────────────────────────────────────────

export async function saveTestimonialAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = text(formData, "id");
  const author = text(formData, "author");
  const quote = text(formData, "quote");

  const back = id ? `/admin/testimonials/${id}` : "/admin/testimonials/new";
  if (!author) redirect(`${back}?status=An+author+is+required.`);
  if (!quote) redirect(`${back}?status=The+quote+is+required.`);

  // docs/03 §3: AggregateRating is "only for genuine reviews. Fabricating these
  // is a policy violation and is easily caught." The source field is where the
  // owner records where a quote came from — a WhatsApp message, a Google review,
  // an email — so there is always something to point at if it is questioned.
  if (!text(formData, "source")) {
    redirect(`${back}?status=Say+where+this+came+from+—+a+WhatsApp+message,+a+Google+review,+an+email.`);
  }

  const rating = number(formData, "rating");
  if (rating !== null && (rating < 1 || rating > 5)) {
    redirect(`${back}?status=A+rating+is+1+to+5,+or+leave+it+blank.`);
  }

  const values: Partial<NewTestimonial> = {
    author,
    role: optional(formData, "role"),
    company: optional(formData, "company"),
    locationId: optional(formData, "locationId"),
    quote,
    rating: rating === null ? null : Math.round(rating),
    source: text(formData, "source"),
    sortOrder: number(formData, "sortOrder") ?? 0,
    published: formData.get("published") === "on",
  };

  if (id) {
    await db.update(testimonials).set(values).where(eq(testimonials.id, id));
    revalidateContent();
    redirect(`/admin/testimonials/${id}?status=saved`);
  }

  const [created] = await db
    .insert(testimonials)
    .values(values as NewTestimonial)
    .returning({ id: testimonials.id });

  revalidateContent();
  redirect(`/admin/testimonials/${created.id}?status=saved`);
}

export async function deleteTestimonialAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = text(formData, "id");
  if (id) await db.delete(testimonials).where(eq(testimonials.id, id));
  revalidateContent();
  redirect("/admin/testimonials?status=deleted");
}

// ── FAQs ───────────────────────────────────────────────────────────────────

export async function saveFaqAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = text(formData, "id");
  const question = text(formData, "question");
  const answer = text(formData, "answer");

  const back = id ? `/admin/faqs/${id}` : "/admin/faqs/new";
  if (!question) redirect(`${back}?status=A+question+is+required.`);
  if (!answer) redirect(`${back}?status=An+answer+is+required.`);

  const values: Partial<NewFaq> = {
    question,
    answer,
    group: text(formData, "group") || "General",
    sortOrder: number(formData, "sortOrder") ?? 0,
    published: formData.get("published") === "on",
    updatedAt: new Date(),
  };

  if (id) {
    await db.update(faqs).set(values).where(eq(faqs.id, id));
    revalidateContent();
    redirect(`/admin/faqs/${id}?status=saved`);
  }

  const [created] = await db
    .insert(faqs)
    .values(values as NewFaq)
    .returning({ id: faqs.id });

  revalidateContent();
  redirect(`/admin/faqs/${created.id}?status=saved`);
}

export async function deleteFaqAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = text(formData, "id");
  if (id) await db.delete(faqs).where(eq(faqs.id, id));
  revalidateContent();
  redirect("/admin/faqs?status=deleted");
}

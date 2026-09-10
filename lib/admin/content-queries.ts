import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, faqs, locations, projects, solutions, testimonials } from "@/db/schema";

/**
 * Admin reads for locations, projects, testimonials and FAQs.
 *
 * A separate file from content-actions.ts because that one is `"use server"`,
 * and every export from a `"use server"` module has to be an async server
 * action — exporting a plain query from it fails the build. The same mistake
 * happened twice in Sprint 4 (listMedia, listPostsForAdmin), so the split is
 * deliberate rather than incidental.
 *
 * These read the tables directly rather than through lib/content/queries.ts,
 * because the admin has to see unpublished rows and the public read layer
 * deliberately cannot.
 */

export async function listLocationsForAdmin() {
  return db
    .select({
      id: locations.id,
      slug: locations.slug,
      name: locations.name,
      county: locations.county,
      published: locations.published,
      sortOrder: locations.sortOrder,
      updatedAt: locations.updatedAt,
    })
    .from(locations)
    .orderBy(asc(locations.sortOrder), asc(locations.name));
}

export async function getLocationForAdmin(id: string) {
  const [row] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
  return row ?? null;
}

export async function listProjectsForAdmin() {
  return db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      clientName: projects.clientName,
      clientNamedOk: projects.clientNamedOk,
      sector: projects.sector,
      published: projects.published,
      completedAt: projects.completedAt,
      locationName: locations.name,
      imageCount: projects.images,
    })
    .from(projects)
    .leftJoin(locations, eq(projects.locationId, locations.id))
    .orderBy(asc(projects.sortOrder), desc(projects.completedAt));
}

export async function getProjectForAdmin(id: string) {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return row ?? null;
}

export async function listTestimonialsForAdmin() {
  return db
    .select({
      id: testimonials.id,
      author: testimonials.author,
      role: testimonials.role,
      company: testimonials.company,
      quote: testimonials.quote,
      rating: testimonials.rating,
      source: testimonials.source,
      published: testimonials.published,
    })
    .from(testimonials)
    .orderBy(asc(testimonials.sortOrder), asc(testimonials.author));
}

export async function getTestimonialForAdmin(id: string) {
  const [row] = await db.select().from(testimonials).where(eq(testimonials.id, id)).limit(1);
  return row ?? null;
}

export async function listFaqsForAdmin() {
  return db
    .select({
      id: faqs.id,
      question: faqs.question,
      answer: faqs.answer,
      group: faqs.group,
      published: faqs.published,
      sortOrder: faqs.sortOrder,
    })
    .from(faqs)
    .orderBy(asc(faqs.sortOrder), asc(faqs.question));
}

export async function getFaqForAdmin(id: string) {
  const [row] = await db.select().from(faqs).where(eq(faqs.id, id)).limit(1);
  return row ?? null;
}

/** Options for the location, category and package pickers on the project form. */
export async function projectFormOptions() {
  const [locationRows, categoryRows, solutionRows] = await Promise.all([
    db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .orderBy(asc(locations.sortOrder)),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.sortOrder)),
    db
      .select({ id: solutions.id, name: solutions.name })
      .from(solutions)
      .orderBy(asc(solutions.sortOrder)),
  ]);

  return { locations: locationRows, categories: categoryRows, solutions: solutionRows };
}

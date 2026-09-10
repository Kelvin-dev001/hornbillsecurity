import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { faqs, locations, posts, projects, testimonials } from "@/db/schema";
import { CACHE_TTL_SECONDS } from "@/lib/cache";

/**
 * The content read layer.
 *
 * Same shape as lib/catalog/queries.ts: everything cached under one tag so an
 * admin save can bust it, and every date returned as an ISO string because
 * unstable_cache round-trips its payload through JSON and a Date comes back as
 * a string on the second request — a bug that passes the first time and fails
 * the second.
 */

export const CONTENT_CACHE_TAG = "content";

export type PostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  coverImageUrl: string | null;
  tags: string[];
  publishedAt: string | null;
  updatedAt: string;
};

export type PostDetail = PostSummary & {
  body: string;
  faq: { question: string; answer: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
};

const loadPosts = unstable_cache(
  async (): Promise<PostDetail[]> => {
    const rows = await db
      .select()
      .from(posts)
      .where(and(eq(posts.published, true), isNotNull(posts.publishedAt)))
      .orderBy(desc(posts.publishedAt));

    return rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      category: row.category,
      author: row.author,
      coverImageUrl: row.coverImageUrl,
      tags: row.tags,
      faq: row.faq,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    }));
  },
  ["posts"],
  { tags: [CONTENT_CACHE_TAG], revalidate: CACHE_TTL_SECONDS },
);

export const getPosts = cache(loadPosts);

export const getPostBySlug = cache(async (slug: string): Promise<PostDetail | null> => {
  return (await getPosts()).find((post) => post.slug === slug) ?? null;
});

export type LocationSummary = {
  slug: string;
  name: string;
  county: string;
  intro: string;
  localNotes: string;
  lat: number | null;
  lng: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
};

const loadLocations = unstable_cache(
  async (): Promise<LocationSummary[]> => {
    const rows = await db
      .select()
      .from(locations)
      .where(eq(locations.published, true))
      .orderBy(asc(locations.sortOrder));

    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      county: row.county,
      intro: row.intro,
      localNotes: row.localNotes,
      lat: row.lat === null ? null : Number(row.lat),
      lng: row.lng === null ? null : Number(row.lng),
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      updatedAt: row.updatedAt.toISOString(),
    }));
  },
  ["locations"],
  { tags: [CONTENT_CACHE_TAG], revalidate: CACHE_TTL_SECONDS },
);

export const getLocations = cache(loadLocations);

export const getLocationBySlug = cache(async (slug: string): Promise<LocationSummary | null> => {
  return (await getLocations()).find((location) => location.slug === slug) ?? null;
});

export type ProjectSummary = {
  slug: string;
  title: string;
  clientName: string | null;
  summary: string;
  challenge: string | null;
  solution: string | null;
  outcome: string | null;
  images: string[];
  locationSlug: string | null;
  locationName: string | null;
  completedAt: string | null;
  updatedAt: string;
};

const loadProjects = unstable_cache(
  async (): Promise<ProjectSummary[]> => {
    const rows = await db
      .select({
        slug: projects.slug,
        title: projects.title,
        clientName: projects.clientName,
        clientNamedOk: projects.clientNamedOk,
        summary: projects.summary,
        challenge: projects.challenge,
        solution: projects.solution,
        outcome: projects.outcome,
        images: projects.images,
        completedAt: projects.completedAt,
        updatedAt: projects.updatedAt,
        locationSlug: locations.slug,
        locationName: locations.name,
      })
      .from(projects)
      .leftJoin(locations, eq(projects.locationId, locations.id))
      .where(eq(projects.published, true))
      .orderBy(asc(projects.sortOrder));

    return rows.map((row) => ({
      slug: row.slug,
      // A client is named only where written permission is recorded. Anything
      // else shows the sector instead (docs/09 item 22).
      clientName: row.clientNamedOk ? row.clientName : null,
      title: row.title,
      summary: row.summary,
      challenge: row.challenge,
      solution: row.solution,
      outcome: row.outcome,
      images: row.images,
      locationSlug: row.locationSlug,
      locationName: row.locationName,
      completedAt: row.completedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    }));
  },
  ["projects"],
  { tags: [CONTENT_CACHE_TAG], revalidate: CACHE_TTL_SECONDS },
);

export const getProjects = cache(loadProjects);

export const getProjectBySlug = cache(async (slug: string): Promise<ProjectSummary | null> => {
  return (await getProjects()).find((project) => project.slug === slug) ?? null;
});

export const getTestimonials = cache(
  unstable_cache(
    async () => {
      return db
        .select({
          author: testimonials.author,
          role: testimonials.role,
          company: testimonials.company,
          quote: testimonials.quote,
          rating: testimonials.rating,
        })
        .from(testimonials)
        .where(eq(testimonials.published, true))
        .orderBy(asc(testimonials.sortOrder));
    },
    ["testimonials"],
    { tags: [CONTENT_CACHE_TAG], revalidate: CACHE_TTL_SECONDS },
  ),
);

export const getFaqs = cache(
  unstable_cache(
    async () => {
      return db
        .select({
          question: faqs.question,
          answer: faqs.answer,
          group: faqs.group,
        })
        .from(faqs)
        .where(eq(faqs.published, true))
        .orderBy(asc(faqs.sortOrder));
    },
    ["faqs"],
    { tags: [CONTENT_CACHE_TAG], revalidate: CACHE_TTL_SECONDS },
  ),
);

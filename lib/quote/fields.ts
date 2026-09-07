/**
 * The choices on the quote submission form.
 *
 * Their own module with no `server-only` marker, because the form is a client
 * component: importing them from lib/quote/submit.ts would pull a database
 * module into the browser bundle and fail the build.
 *
 * Counties are the coast first — CLAUDE.md §1, the service area is Mombasa,
 * Kilifi and Kwale. Nairobi is on the list because someone will ask, and
 * "served on request" is a conversation, not a rejection.
 */
export const KENYAN_COUNTIES = [
  "Mombasa",
  "Kilifi",
  "Kwale",
  "Taita-Taveta",
  "Tana River",
  "Lamu",
  "Nairobi",
  "Other",
] as const;

export const PROPERTY_TYPE_CHOICES = [
  "Home",
  "Apartment",
  "Shop or duka",
  "Office",
  "Warehouse",
  "School",
  "Estate",
  "Farm or site",
  "Other",
] as const;

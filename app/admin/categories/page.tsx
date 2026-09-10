import Link from "next/link";
import { asc } from "drizzle-orm";
import { ExternalLink } from "lucide-react";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/auth";
import { cn } from "@/lib/utils";

/**
 * Categories, split by what they actually are.
 *
 * A category with `kind = 'service'` is a service line and has a page at
 * /services/[slug] carrying real copy. One with `kind = 'item_group'` is a
 * catalogue filter and has a page at /catalog/[slug]. They need editing for
 * different reasons, so the list says which is which rather than presenting
 * twenty-seven identical rows.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, rows] = await Promise.all([
    searchParams,
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        kind: categories.kind,
        published: categories.published,
        serviceIntro: categories.serviceIntro,
        notFor: categories.serviceNotFor,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder)),
  ]);

  const serviceLines = rows.filter((row) => row.kind === "service");
  const itemGroups = rows.filter((row) => row.kind === "item_group");

  return (
    <>
      <AdminHeading
        title="Categories"
        description="Service lines carry a service page; item groups are catalogue filters. Both are edited here."
      />

      <FormMessage status={status} />

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-ink">Service lines</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each of these has a page at <code>/services/…</code>. A line with no
          &ldquo;not for&rdquo; list is missing the most trusted thing on the page.
        </p>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-paper">
          {serviceLines.map((category) => (
            <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link
                  href={`/admin/categories/${category.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {category.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {category.serviceIntro
                    ? `${category.notFor.length} limit${category.notFor.length === 1 ? "" : "s"} stated`
                    : "No service copy yet"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {category.serviceIntro ? (
                  <Link
                    href={
                      category.slug === "cctv"
                        ? "/services/cctv-installation"
                        : `/services/${category.slug}`
                    }
                    target="_blank"
                    className="text-sm text-action hover:underline"
                  >
                    <ExternalLink className="inline size-3.5" aria-hidden="true" /> View
                  </Link>
                ) : null}
                <span
                  className={cn(
                    "rounded-pill px-2.5 py-1 text-xs font-medium",
                    category.serviceIntro
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-ink",
                  )}
                >
                  {category.serviceIntro ? "Has a page" : "No page"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-ink">Catalogue groups</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Published automatically when they contain something priced, so a page with no items is
          never live.
        </p>
        <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-paper">
          {itemGroups.map((category) => (
            <li key={category.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <Link
                href={`/admin/categories/${category.id}`}
                className="font-medium text-ink hover:underline"
              >
                {category.name}
              </Link>
              <span
                className={cn(
                  "rounded-pill px-2.5 py-1 text-xs font-medium",
                  category.published ? "bg-success/10 text-success" : "bg-ink/5 text-muted-foreground",
                )}
              >
                {category.published ? "Live" : "Hidden"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

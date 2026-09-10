import Link from "next/link";
import { asc } from "drizzle-orm";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { db } from "@/db";
import { solutions } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/auth";
import { formatKes } from "@/lib/money";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Packages" };

export default async function AdminSolutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, rows] = await Promise.all([
    searchParams,
    db
      .select({
        id: solutions.id,
        slug: solutions.slug,
        name: solutions.name,
        tier: solutions.tier,
        totalExclVat: solutions.totalExclVat,
        published: solutions.published,
      })
      .from(solutions)
      .orderBy(asc(solutions.sortOrder)),
  ]);

  return (
    <>
      <AdminHeading
        title="Packages"
        description="What a package contains comes from the quantity rules and the item prices, so changing either re-prices all of them. Here you change the words and whether it is live."
      />

      <FormMessage status={status} />

      <ul className="divide-y divide-line rounded-card border border-line bg-paper">
        {rows.map((solution) => (
          <li key={solution.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <Link
                href={`/admin/solutions/${solution.id}`}
                className="font-medium text-ink hover:underline"
              >
                {solution.name}
              </Link>
              <p className="text-sm text-muted-foreground capitalize">{solution.tier}</p>
            </div>

            <div className="flex items-center gap-4">
              <span className="tabular-nums text-muted-foreground">
                {solution.totalExclVat === null ? "—" : formatKes(solution.totalExclVat)}
              </span>
              <span
                className={cn(
                  "rounded-pill px-2.5 py-1 text-xs font-medium",
                  solution.published
                    ? "bg-success/10 text-success"
                    : "bg-ink/5 text-muted-foreground",
                )}
              >
                {solution.published ? "Live" : "Hidden"}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm text-muted-foreground">
        The totals shown here are the ones stored at the last seed. The site always recomputes
        from live prices, so a package page may differ after a price review — that is intended.
      </p>
    </>
  );
}

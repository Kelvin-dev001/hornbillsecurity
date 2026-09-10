import Link from "next/link";
import { Plus } from "lucide-react";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { listPostsForAdmin } from "@/lib/admin/post-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Articles" };

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, articles] = await Promise.all([searchParams, listPostsForAdmin()]);

  return (
    <>
      <AdminHeading
        title="Articles"
        description="Cost guides and explainers. Pricing questions trigger an AI answer roughly 80% of the time, and these are the pages that get quoted in one."
      >
        <Button asChild size="cta">
          <Link href="/admin/posts/new">
            <Plus aria-hidden="true" />
            New article
          </Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />

      {articles.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing written yet. The content calendar in docs/10 lists what to write and when.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-paper">
          {articles.map((article) => (
            <li key={article.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link
                  href={`/admin/posts/${article.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {article.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {article.category} ·{" "}
                  {article.publishedAt
                    ? new Intl.DateTimeFormat("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "Africa/Nairobi",
                      }).format(article.publishedAt)
                    : "not published"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-pill px-2.5 py-1 text-xs font-medium",
                    article.published
                      ? "bg-success/10 text-success"
                      : "bg-ink/5 text-muted-foreground",
                  )}
                >
                  {article.published ? "Live" : "Draft"}
                </span>
                {article.published ? (
                  <Link
                    href={`/blog/${article.slug}`}
                    target="_blank"
                    className="text-sm text-action hover:underline"
                  >
                    View
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

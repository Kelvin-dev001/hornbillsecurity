import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { listLocationsForAdmin } from "@/lib/admin/content-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Areas" };

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, rows] = await Promise.all([searchParams, listLocationsForAdmin()]);

  return (
    <>
      <AdminHeading
        title="Areas"
        description="Each one carries two public pages: the coverage page and the CCTV service page, which is where transactional searches land. Coast only — CLAUDE.md §1 rules out Nairobi area pages."
      >
        <Button asChild size="cta">
          <Link href="/admin/locations/new">
            <Plus aria-hidden="true" />
            New area
          </Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />

      <ul className="divide-y divide-line rounded-card border border-line bg-paper">
        {rows.map((location) => (
          <li key={location.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <Link
                href={`/admin/locations/${location.id}`}
                className="font-medium text-ink hover:underline"
              >
                {location.name}
              </Link>
              <p className="text-sm text-muted-foreground">{location.county} County</p>
            </div>

            <div className="flex items-center gap-3">
              {location.published ? (
                <Link
                  href={`/services/cctv-installation/${location.slug}`}
                  target="_blank"
                  className="text-sm text-action hover:underline"
                >
                  <ExternalLink className="inline size-3.5" aria-hidden="true" /> Service page
                </Link>
              ) : null}
              <span
                className={cn(
                  "rounded-pill px-2.5 py-1 text-xs font-medium",
                  location.published
                    ? "bg-success/10 text-success"
                    : "bg-ink/5 text-muted-foreground",
                )}
              >
                {location.published ? "Live" : "Hidden"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

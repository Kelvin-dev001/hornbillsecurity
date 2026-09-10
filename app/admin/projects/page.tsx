import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { listProjectsForAdmin } from "@/lib/admin/content-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Case studies" };

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, rows] = await Promise.all([searchParams, listProjectsForAdmin()]);

  return (
    <>
      <AdminHeading
        title="Case studies"
        description="docs/05 Sprint 5 asks for at least four. They are the strongest trust asset on the site — a potential client believes a documented job in their own area more than anything else here."
      >
        <Button asChild size="cta">
          <Link href="/admin/projects/new">
            <Plus aria-hidden="true" />
            New case study
          </Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />

      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-warm p-6">
          <p className="font-medium text-ink">Nothing here yet, and /projects says so honestly.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The public page currently tells visitors that case studies are being written up, and
            names only the two clients whose written permission is on record. That is better than
            a stock photograph, but it is not what closes a sale.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            The form walks you through five questions: the brief, the site conditions, what you
            installed and why, the outcome, and the photographs. Site conditions is the one that
            does the work — anybody can claim an installation, and only somebody who was there can
            say what the building made them do differently.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-paper">
          {rows.map((project) => (
            <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link
                  href={`/admin/projects/${project.id}`}
                  className="font-medium text-ink hover:underline"
                >
                  {project.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {project.clientNamedOk && project.clientName
                    ? project.clientName
                    : (project.sector ?? "Client not named")}
                  {project.locationName ? ` · ${project.locationName}` : ""}
                  {` · ${project.imageCount.length} photo${project.imageCount.length === 1 ? "" : "s"}`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {project.published ? (
                  <Link
                    href={`/projects/${project.slug}`}
                    target="_blank"
                    className="text-sm text-action hover:underline"
                  >
                    <ExternalLink className="inline size-3.5" aria-hidden="true" /> View
                  </Link>
                ) : null}
                <span
                  className={cn(
                    "rounded-pill px-2.5 py-1 text-xs font-medium",
                    project.published
                      ? "bg-success/10 text-success"
                      : "bg-ink/5 text-muted-foreground",
                  )}
                >
                  {project.published ? "Live" : "Draft"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

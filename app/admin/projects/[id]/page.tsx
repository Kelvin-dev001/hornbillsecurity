import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { ProjectForm } from "@/components/admin/project-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteProjectAction } from "@/lib/admin/content-actions";
import { getProjectForAdmin, projectFormOptions } from "@/lib/admin/content-queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit case study" };

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { status }, options] = await Promise.all([
    params,
    searchParams,
    projectFormOptions(),
  ]);

  const project = await getProjectForAdmin(id);
  if (!project) notFound();

  return (
    <>
      <AdminHeading title={project.title} description="Case study.">
        {project.published ? (
          <Button asChild variant="outline" size="cta">
            <Link href={`/projects/${project.slug}`} target="_blank">
              <ExternalLink aria-hidden="true" />
              View live
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/projects">Back</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />
      <ProjectForm project={project} options={options} />

      <form action={deleteProjectAction} className="mt-10 border-t border-line pt-6">
        <input type="hidden" name="id" value={project.id} />
        <Button type="submit" variant="destructive" size="cta">
          Delete this case study
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Permanent. Unticking &ldquo;Live on the site&rdquo; is usually what you want instead.
        </p>
      </form>
    </>
  );
}

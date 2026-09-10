import Link from "next/link";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { ProjectForm } from "@/components/admin/project-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { projectFormOptions } from "@/lib/admin/content-queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "New case study" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, options] = await Promise.all([searchParams, projectFormOptions()]);

  return (
    <>
      <AdminHeading title="New case study" description="Five questions, in the order the page tells them.">
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/projects">Back</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />
      <ProjectForm project={null} options={options} />
    </>
  );
}

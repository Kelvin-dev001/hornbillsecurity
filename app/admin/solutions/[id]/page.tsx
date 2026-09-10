import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";

import {
  AdminHeading,
  Checkbox,
  Field,
  FormMessage,
  Panel,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { solutions } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/auth";
import { saveSolutionAction } from "@/lib/admin/catalog-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit package" };

export default async function AdminSolutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { status }] = await Promise.all([params, searchParams]);

  const [solution] = await db.select().from(solutions).where(eq(solutions.id, id)).limit(1);
  if (!solution) notFound();

  return (
    <>
      <AdminHeading title={solution.name} description="Copy and visibility.">
        {solution.published ? (
          <Button asChild variant="outline" size="cta">
            <Link href={`/solutions/${solution.slug}`} target="_blank">
              <ExternalLink aria-hidden="true" />
              View live
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/solutions">Back to packages</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />

      <form action={saveSolutionAction} className="space-y-6">
        <input type="hidden" name="id" value={solution.id} />

        <Panel title="What it is">
          <div className="grid gap-4">
            <Field label="Name" name="name" required>
              <TextInput name="name" defaultValue={solution.name} required />
            </Field>
            <Field label="Summary" name="summary" required hint="One or two lines, on the card and at the top of the page.">
              <TextArea name="summary" rows={2} defaultValue={solution.summary} required />
            </Field>
            <Field label="Description" name="description">
              <TextArea name="description" rows={5} defaultValue={solution.description ?? ""} />
            </Field>
          </div>
        </Panel>

        <Panel
          title="Right for, and not right for"
          description="The second list is the one that earns trust. Being honest about what a system will not do is the most quotable thing on the page."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Right for" name="bestFor" hint="One per line.">
              <TextArea name="bestFor" rows={5} defaultValue={solution.bestFor.join("\n")} />
            </Field>
            <Field label="Not right for" name="notSuitableFor" required hint="One per line. Cannot be empty.">
              <TextArea
                name="notSuitableFor"
                rows={5}
                defaultValue={solution.notSuitableFor.join("\n")}
                required
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Search and visibility">
          <div className="grid gap-4">
            <Field label="Hero image URL" name="heroImageUrl">
              <TextInput name="heroImageUrl" defaultValue={solution.heroImageUrl ?? ""} />
            </Field>
            <Field label="SEO title" name="seoTitle">
              <TextInput name="seoTitle" defaultValue={solution.seoTitle ?? ""} />
            </Field>
            <Field label="SEO description" name="seoDescription">
              <TextArea name="seoDescription" rows={2} defaultValue={solution.seoDescription ?? ""} />
            </Field>
            <Checkbox name="published" label="Live on the site" defaultChecked={solution.published} />
          </div>
        </Panel>

        <Button type="submit" size="cta">
          Save package
        </Button>
      </form>
    </>
  );
}

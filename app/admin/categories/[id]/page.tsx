import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";

import {
  AdminHeading,
  Field,
  FormMessage,
  LinesInput,
  Panel,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/auth";
import { saveCategoryAction } from "@/lib/admin/category-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit category" };

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { status }] = await Promise.all([params, searchParams]);

  const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!category) notFound();

  const isServiceLine = category.kind === "service";
  const livePath =
    category.slug === "cctv"
      ? "/services/cctv-installation"
      : isServiceLine
        ? `/services/${category.slug}`
        : `/catalog/${category.slug}`;

  return (
    <>
      <AdminHeading
        title={category.name}
        description={isServiceLine ? "Service line" : "Catalogue group"}
      >
        <Button asChild variant="outline" size="cta">
          <Link href={livePath} target="_blank">
            <ExternalLink aria-hidden="true" />
            View live
          </Link>
        </Button>
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/categories">Back</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />

      <form action={saveCategoryAction} className="space-y-6">
        <input type="hidden" name="id" value={category.id} />

        <Panel title="Name and summary">
          <div className="grid gap-4">
            <Field label="Name" name="name" required>
              <TextInput name="name" defaultValue={category.name} required />
            </Field>
            <Field
              label="Summary"
              name="summary"
              required
              hint="One or two lines. Used on cards and as the fallback meta description."
            >
              <TextArea name="summary" rows={2} defaultValue={category.summary} required />
            </Field>
          </div>
        </Panel>

        {isServiceLine ? (
          <Panel
            title="The service page"
            description="Leave the intro blank and this line has no service page. Fill it in and the page appears, generated from these four fields plus whatever is priced in the catalogue."
          >
            <div className="grid gap-4">
              <Field
                label="Intro"
                name="serviceIntro"
                hint="Two or three sentences. What the work is, and the one thing that actually decides whether it succeeds. No prices — every figure on the page is read from the catalogue, so it can never go stale."
              >
                <TextArea
                  name="serviceIntro"
                  rows={5}
                  defaultValue={category.serviceIntro ?? ""}
                />
              </Field>

              <Field
                label="What the work includes"
                name="serviceIncludes"
                hint="One per line. The specific things a competitor would leave out of a quotation."
              >
                <LinesInput name="serviceIncludes" values={category.serviceIncludes} rows={6} />
              </Field>

              <Field
                label="What this is not for"
                name="serviceNotFor"
                hint="One per line, and required once there is an intro. CLAUDE.md §6: honesty about limits is the strongest trust signal on the site and the most citable kind of sentence. On several of these lines it is the only thing on the page a competitor would not also claim."
              >
                <LinesInput name="serviceNotFor" values={category.serviceNotFor} rows={6} />
              </Field>

              <Field
                label="FAQ"
                name="serviceFaq"
                hint="One per line as “Question | Answer”. Renders as real Q&A markup and as FAQPage structured data — the shape AI Overviews lift."
              >
                <TextArea
                  name="serviceFaq"
                  rows={6}
                  defaultValue={category.serviceFaq
                    .map((entry) => `${entry.question} | ${entry.answer}`)
                    .join("\n")}
                />
              </Field>
            </div>
          </Panel>
        ) : null}

        <Panel title="Search">
          <div className="grid gap-4">
            <Field label="SEO title" name="seoTitle">
              <TextInput name="seoTitle" defaultValue={category.seoTitle ?? ""} />
            </Field>
            <Field label="SEO description" name="seoDescription">
              <TextArea
                name="seoDescription"
                rows={2}
                defaultValue={category.seoDescription ?? ""}
              />
            </Field>
          </div>
        </Panel>

        <Button type="submit" size="cta">
          Save category
        </Button>
      </form>

      {!isServiceLine ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Whether this group is live is derived rather than set: it publishes when it contains a
          published, priced item, so a catalogue page with nothing in it is never live.
        </p>
      ) : null}
    </>
  );
}

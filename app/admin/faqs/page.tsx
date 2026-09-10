import {
  AdminHeading,
  Checkbox,
  Field,
  FormMessage,
  NumberInput,
  Panel,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteFaqAction, saveFaqAction } from "@/lib/admin/content-actions";
import { listFaqsForAdmin } from "@/lib/admin/content-queries";

/**
 * Site-wide FAQs, grouped, all editable on one page.
 *
 * These render on /faq as real question-and-answer markup and as FAQPage
 * structured data. docs/03 §0 is the reason to care: AI Overviews appear on
 * about 68% of local searches and on cost queries roughly 80% of the time, and
 * a question with a plain, specific answer under it is the shape they lift.
 *
 * A question the owner gets asked twice on WhatsApp belongs here.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "FAQs" };

function FaqFields({
  faq,
  groups,
}: {
  faq: {
    id: string;
    question: string;
    answer: string;
    group: string;
    published: boolean;
    sortOrder: number;
  } | null;
  groups: string[];
}) {
  return (
    <div className="grid gap-4">
      {faq ? <input type="hidden" name="id" value={faq.id} /> : null}

      <Field
        label="Question"
        name="question"
        required
        hint="Phrase it the way somebody would type it or ask it, not the way a brochure would."
      >
        <TextInput name="question" defaultValue={faq?.question ?? ""} required />
      </Field>

      <Field
        label="Answer"
        name="answer"
        required
        hint="Plain and specific. Lead with the answer, then the reason. A number, a model or a policy beats a paragraph of reassurance."
      >
        <TextArea name="answer" rows={4} defaultValue={faq?.answer ?? ""} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Group" name="group" hint="Prices, Buying, Site survey, Installation, Coverage…">
          <TextInput name="group" list="faq-groups" defaultValue={faq?.group ?? "General"} />
        </Field>
        <Field label="Sort order" name="sortOrder" hint="Lower shows first.">
          <NumberInput name="sortOrder" defaultValue={faq?.sortOrder ?? 0} />
        </Field>
        <Checkbox name="published" label="Show on /faq" defaultChecked={faq?.published ?? true} />
      </div>

      <datalist id="faq-groups">
        {groups.map((group) => (
          <option key={group} value={group} />
        ))}
      </datalist>
    </div>
  );
}

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; edit?: string }>;
}) {
  await requireAdmin();
  const [{ status, edit }, rows] = await Promise.all([searchParams, listFaqsForAdmin()]);

  const groups = [...new Set(rows.map((row) => row.group))];

  const byGroup = new Map<string, typeof rows>();
  for (const row of rows) {
    byGroup.set(row.group, [...(byGroup.get(row.group) ?? []), row]);
  }

  return (
    <>
      <AdminHeading
        title="FAQs"
        description="These show on /faq as real Q&A markup and as FAQPage structured data. A question you get asked twice on WhatsApp belongs here."
      />

      <FormMessage status={status} />

      {/*
        The list is compact and each row links to itself with ?edit=<id>, which
        opens one form. Nineteen open textareas on one page is unusable on a
        phone, and docs/08 asks for this portal to work on one.
      */}
      <div className="mt-6 space-y-8">
        {[...byGroup.entries()].map(([group, questions]) => (
          <section key={group}>
            <h2 className="font-display text-lg font-semibold text-ink">{group}</h2>
            <ul className="mt-3 divide-y divide-line rounded-card border border-line bg-paper">
              {questions.map((faq) => (
                <li key={faq.id} className="p-4">
                  {edit === faq.id ? (
                    <>
                      <form action={saveFaqAction} className="space-y-4">
                        <FaqFields faq={faq} groups={groups} />
                        <div className="flex flex-wrap gap-3">
                          <Button type="submit" size="cta">
                            Save
                          </Button>
                          <Button asChild variant="outline" size="cta">
                            <a href="/admin/faqs">Cancel</a>
                          </Button>
                        </div>
                      </form>
                      <form action={deleteFaqAction} className="mt-3">
                        <input type="hidden" name="id" value={faq.id} />
                        <Button type="submit" variant="ghost" size="cta">
                          Delete
                        </Button>
                      </form>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <a
                        href={`/admin/faqs?edit=${faq.id}`}
                        className="font-medium text-ink hover:underline"
                      >
                        {faq.question}
                      </a>
                      {!faq.published ? (
                        <span className="rounded-pill bg-ink/5 px-2.5 py-1 text-xs text-muted-foreground">
                          Hidden
                        </span>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <Panel title="Add a question">
          <form action={saveFaqAction} className="space-y-4">
            <FaqFields faq={null} groups={groups} />
            <Button type="submit" size="cta">
              Add
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}

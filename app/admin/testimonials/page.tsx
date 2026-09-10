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
import {
  deleteTestimonialAction,
  saveTestimonialAction,
} from "@/lib/admin/content-actions";
import { listTestimonialsForAdmin } from "@/lib/admin/content-queries";

/**
 * Testimonials, all on one page.
 *
 * A testimonial is four short fields, so a list that makes you click into each
 * one to change a typo is worse than a page of open forms. Everything is
 * editable in place and there is an empty form at the bottom to add one.
 *
 * The `source` field is required. docs/03 §3: `AggregateRating` and `Review`
 * markup is "only for genuine reviews. Fabricating these is a policy violation
 * and is easily caught." Recording where each quote came from — a WhatsApp
 * message, a Google review, an email — means there is always something to point
 * at, and it is the reason this site can turn review markup on later without
 * anybody having to remember which quotes were real.
 */
export const dynamic = "force-dynamic";

export const metadata = { title: "Testimonials" };

const RATINGS = "12345".split("");

function TestimonialFields({
  testimonial,
}: {
  testimonial: {
    id: string;
    author: string;
    role: string | null;
    company: string | null;
    quote: string;
    rating: number | null;
    source: string | null;
    published: boolean;
  } | null;
}) {
  const suffix = testimonial ? `-${testimonial.id}` : "-new";

  return (
    <div className="grid gap-4">
      {testimonial ? <input type="hidden" name="id" value={testimonial.id} /> : null}

      <Field label="Quote" name={`quote${suffix}`} required hint="Their words, not tidied up.">
        <TextArea name="quote" rows={3} defaultValue={testimonial?.quote ?? ""} required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Name" name={`author${suffix}`} required>
          <TextInput name="author" defaultValue={testimonial?.author ?? ""} required />
        </Field>
        <Field label="Role" name={`role${suffix}`}>
          <TextInput name="role" defaultValue={testimonial?.role ?? ""} />
        </Field>
        <Field label="Company" name={`company${suffix}`}>
          <TextInput name="company" defaultValue={testimonial?.company ?? ""} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Where it came from"
          name={`source${suffix}`}
          required
          hint="A WhatsApp message, a Google review, an email. Required."
        >
          <TextInput name="source" defaultValue={testimonial?.source ?? ""} required />
        </Field>
        <Field label="Rating" name={`rating${suffix}`} hint="1–5, or blank.">
          <TextInput
            name="rating"
            list="ratings"
            defaultValue={testimonial?.rating?.toString() ?? ""}
          />
        </Field>
        <Field label="Sort order" name={`sortOrder${suffix}`}>
          <NumberInput name="sortOrder" defaultValue={0} />
        </Field>
      </div>

      <Checkbox
        name="published"
        label="Show on the site"
        defaultChecked={testimonial?.published ?? false}
      />
    </div>
  );
}

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, rows] = await Promise.all([searchParams, listTestimonialsForAdmin()]);

  return (
    <>
      <datalist id="ratings">
        {RATINGS.map((value) => (
          <option key={value} value={value} />
        ))}
      </datalist>

      <AdminHeading
        title="Testimonials"
        description="Real ones only. docs/03 §5 has the opportunity in a sentence: AreaSpy, the strongest site in this market, has eight reviews while claiming 2,400+ clients. Four to eight a month, steadily, outpaces everyone."
      />

      <FormMessage status={status} />

      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-paper-warm p-6">
          <p className="font-medium text-ink">None yet, and nothing is invented to fill the gap.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Two Kenya-specific details from docs/03 §5 worth knowing before you ask anyone. Get
            reviewers to <strong>name the neighbourhood</strong> — &ldquo;six cameras at our place
            in Nyali&rdquo; — because that text is matched against local searches. And{" "}
            <strong>reply to every review</strong>, which almost nobody in this market does.
          </p>
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        {rows.map((testimonial) => (
          <Panel
            key={testimonial.id}
            title={testimonial.author}
            description={testimonial.published ? "Live on the site" : "Hidden"}
          >
            <form action={saveTestimonialAction} className="space-y-4">
              <TestimonialFields testimonial={testimonial} />
              <div className="flex flex-wrap gap-3">
                <Button type="submit" size="cta">
                  Save
                </Button>
              </div>
            </form>

            <form action={deleteTestimonialAction} className="mt-3">
              <input type="hidden" name="id" value={testimonial.id} />
              <Button type="submit" variant="ghost" size="cta">
                Delete
              </Button>
            </form>
          </Panel>
        ))}

        <Panel title="Add a testimonial">
          <form action={saveTestimonialAction} className="space-y-4">
            <TestimonialFields testimonial={null} />
            <Button type="submit" size="cta">
              Add
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}

import {
  Checkbox,
  Field,
  LinesInput,
  Panel,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { savePostAction } from "@/lib/admin/post-actions";
import type { Post } from "@/db/schema";

/**
 * The article editor.
 *
 * Markdown in a textarea, deliberately. A rich-text editor would be nicer and
 * would also be another dependency, another bundle and another thing to fight
 * on a phone — and the owner is writing plain articles about what a CCTV system
 * costs, not laying out a magazine.
 */
export function PostForm({ post }: { post?: Post }) {
  return (
    <form action={savePostAction} className="space-y-6">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}

      <Panel title="The article">
        <div className="grid gap-4">
          <Field label="Title" name="title" required>
            <TextInput
              name="title"
              defaultValue={post?.title ?? ""}
              required
              placeholder="What CCTV installation actually costs in Mombasa"
            />
          </Field>

          <Field label="URL slug" name="slug" hint="Leave blank and it comes from the title.">
            <TextInput name="slug" defaultValue={post?.slug ?? ""} />
          </Field>

          <Field
            label="Excerpt"
            name="excerpt"
            hint="The card subtitle and the search-result description. Blank uses the opening lines."
          >
            <TextArea name="excerpt" rows={2} defaultValue={post?.excerpt ?? ""} />
          </Field>

          <Field
            label="Body"
            name="body"
            required
            hint="Markdown. Two hashes for a heading, a dash for a list item, [text](url) for a link. Prices and model numbers in full."
          >
            <TextArea
              name="body"
              rows={22}
              defaultValue={post?.body ?? ""}
              required
              className="font-mono text-sm"
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Questions and answers"
        description="One per line, as Question | Answer. These render as real question-and-answer markup and as FAQPage structured data, which is what a cost article needs to be quoted by an AI answer."
      >
        <LinesInput
          name="faq"
          rows={6}
          values={(post?.faq ?? []).map((entry) => `${entry.question} | ${entry.answer}`)}
          placeholder="How much does a 4-camera CCTV system cost in Mombasa? | KES 72,000 installed, excluding VAT, for a ColorVu system with a fortnight of footage."
        />
      </Panel>

      <Panel title="Filing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" name="category">
            <TextInput name="category" defaultValue={post?.category ?? "Guides"} />
          </Field>
          <Field label="Author" name="author">
            <TextInput name="author" defaultValue={post?.author ?? "Hornbill"} />
          </Field>
          <Field label="Tags" name="tags" hint="Comma separated.">
            <TextInput name="tags" defaultValue={(post?.tags ?? []).join(", ")} />
          </Field>
          <Field label="Cover image URL" name="coverImageUrl" hint="Upload under Images first.">
            <TextInput name="coverImageUrl" defaultValue={post?.coverImageUrl ?? ""} />
          </Field>
          <Field label="SEO title" name="seoTitle">
            <TextInput name="seoTitle" defaultValue={post?.seoTitle ?? ""} />
          </Field>
          <Field label="SEO description" name="seoDescription">
            <TextArea name="seoDescription" rows={2} defaultValue={post?.seoDescription ?? ""} />
          </Field>
        </div>

        <div className="mt-4">
          <Checkbox
            name="published"
            label="Publish"
            defaultChecked={post?.published ?? false}
            hint="The publish date is set the first time this goes live and never moved again, so an edited article does not pretend to be new."
          />
        </div>
      </Panel>

      <Button type="submit" size="cta">
        {post ? "Save article" : "Create article"}
      </Button>
    </form>
  );
}

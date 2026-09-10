import {
  Checkbox,
  Field,
  NumberInput,
  Panel,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import type { Location } from "@/db/schema";
import { saveLocationAction } from "@/lib/admin/content-actions";

/**
 * The area form.
 *
 * "What is different about this area" is a required field, and that is the whole
 * design of this form. docs/02 is blunt about why: "A location page with nothing
 * but a find-and-replaced town name is thin content and will be treated as
 * such." docs/03 §2 makes the same point commercially — ten deep pages beat
 * thirty templated ones, and depth is what separates this from AreaSpy's
 * twenty-eight Nairobi pages. So the save refuses without it.
 */
export function LocationForm({ location }: { location: Location | null }) {
  return (
    <form action={saveLocationAction} className="space-y-6">
      {location ? <input type="hidden" name="id" value={location.id} /> : null}

      <Panel title="The area">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" required hint="As people say it: “Bamburi and Shanzu”.">
              <TextInput name="name" defaultValue={location?.name ?? ""} required />
            </Field>
            <Field label="County" name="county" required hint="Mombasa, Kilifi or Kwale.">
              <TextInput name="county" defaultValue={location?.county ?? "Mombasa"} required />
            </Field>
          </div>

          <Field label="URL slug" name="slug" hint="Leave blank and it is made from the name.">
            <TextInput name="slug" defaultValue={location?.slug ?? ""} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Latitude"
              name="lat"
              hint="Feeds the geo coordinates in the structured data."
            >
              <TextInput name="lat" defaultValue={location?.lat ?? ""} />
            </Field>
            <Field label="Longitude" name="lng">
              <TextInput name="lng" defaultValue={location?.lng ?? ""} />
            </Field>
          </div>
        </div>
      </Panel>

      <Panel title="The copy">
        <div className="grid gap-4">
          <Field
            label="Intro"
            name="intro"
            required
            hint="Two or three lines. Name the streets and landmarks people actually use — the bridge, Links Road, Kongowea."
          >
            <TextArea name="intro" rows={3} defaultValue={location?.intro ?? ""} required />
          </Field>

          <Field
            label="What is different about this area"
            name="localNotes"
            required
            hint="Required, and it is the reason the page exists. A real local condition: salt exposure, estate access rules, the ferry queue, holiday-home vacancy, long boundaries with no mains. A paragraph that would read the same with another town's name in it is worse than no page at all."
          >
            <TextArea
              name="localNotes"
              rows={6}
              defaultValue={location?.localNotes ?? ""}
              required
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Search and publishing">
        <div className="grid gap-4">
          <Field
            label="SEO title"
            name="seoTitle"
            hint="Leave blank for the generated one, which carries the cheapest complete system price."
          >
            <TextInput name="seoTitle" defaultValue={location?.seoTitle ?? ""} />
          </Field>
          <Field label="SEO description" name="seoDescription">
            <TextArea name="seoDescription" rows={2} defaultValue={location?.seoDescription ?? ""} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sort order" name="sortOrder" hint="Lower shows first.">
              <NumberInput name="sortOrder" defaultValue={location?.sortOrder ?? 0} />
            </Field>
            <Checkbox
              name="published"
              label="Live on the site"
              defaultChecked={location?.published ?? false}
            />
          </div>
        </div>
      </Panel>

      <Button type="submit" size="cta">
        Save area
      </Button>
    </form>
  );
}

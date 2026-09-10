import Link from "next/link";

import {
  Checkbox,
  Field,
  LinesInput,
  NumberInput,
  Panel,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import type { Project } from "@/db/schema";
import { saveProjectAction } from "@/lib/admin/content-actions";

/**
 * The case-study form.
 *
 * docs/05 Sprint 5: each completed job "documented as a real case study with
 * the brief, the site conditions, the equipment specified and why, photos, and
 * the outcome", and the owner wants them "documented vividly enough that a
 * potential client believes them — treat this as a primary trust asset, not a
 * gallery."
 *
 * So the form is built as those five prompts in that order, each with a hint
 * saying what makes the difference between a believable answer and a generic
 * one. It is a writing aid, not a database form: the field order is the order
 * the story is told on the page.
 *
 * The package picker is the part with no equivalent anywhere in this market —
 * linking a case study to a real Solution puts its full priced bill of
 * materials on the case study page. "We installed eight cameras" is a claim;
 * the same sentence with the itemised bill under it is evidence.
 */
export function ProjectForm({
  project,
  options,
}: {
  project: Project | null;
  options: {
    locations: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    solutions: { id: string; name: string }[];
  };
}) {
  const none = [{ value: "", label: "— none —" }];
  const completed = project?.completedAt
    ? project.completedAt.toISOString().slice(0, 10)
    : "";

  return (
    <form action={saveProjectAction} className="space-y-6">
      {project ? <input type="hidden" name="id" value={project.id} /> : null}

      <Panel title="The job">
        <div className="grid gap-4">
          <Field
            label="Title"
            name="title"
            required
            hint="What it was and where, in a phrase. “Eight-camera system for a logistics yard, Mariakani” beats “CCTV Installation Project”."
          >
            <TextInput name="title" defaultValue={project?.title ?? ""} required />
          </Field>

          <Field label="URL slug" name="slug" hint="Leave blank and it is made from the title.">
            <TextInput name="slug" defaultValue={project?.slug ?? ""} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Area" name="locationId" hint="Links the case study to its location page.">
              <Select
                name="locationId"
                defaultValue={project?.locationId ?? ""}
                options={[...none, ...options.locations.map((l) => ({ value: l.id, label: l.name }))]}
              />
            </Field>
            <Field label="Completed" name="completedAt">
              <TextInput name="completedAt" type="date" defaultValue={completed} />
            </Field>
          </div>

          <Field
            label="Summary"
            name="summary"
            required
            hint="Two lines. This is the card on /projects and the meta description."
          >
            <TextArea name="summary" rows={2} defaultValue={project?.summary ?? ""} required />
          </Field>
        </div>
      </Panel>

      <Panel
        title="The client"
        description="A name is published only where you hold written permission. Without it the sector is what the page shows instead — and a case study with neither reads as invented."
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name" name="clientName">
              <TextInput name="clientName" defaultValue={project?.clientName ?? ""} />
            </Field>
            <Field
              label="Sector"
              name="sector"
              hint="Used when the client is not named: “logistics yard”, “beachfront villa”, “retail duka”."
            >
              <TextInput name="sector" defaultValue={project?.sector ?? ""} />
            </Field>
          </div>
          <Checkbox
            name="clientNamedOk"
            label="I hold written permission to name this client"
            defaultChecked={project?.clientNamedOk ?? false}
            hint="Leave unticked and the name is stored but never rendered. docs/09 item 22 records permission for Nebsam Digital Solutions and Mash East Africa Ltd."
          />
        </div>
      </Panel>

      <Panel
        title="The story"
        description="Four questions, in the order the page tells them. Specific beats polished — a detail only somebody who was on site could know is what makes the rest of it credible."
      >
        <div className="grid gap-4">
          <Field
            label="The brief"
            name="challenge"
            hint="What they asked for and why. What had gone wrong, or what they were worried about."
          >
            <TextArea name="challenge" rows={4} defaultValue={project?.challenge ?? ""} />
          </Field>

          <Field
            label="Site conditions"
            name="siteConditions"
            hint="What the site itself made you do differently: salt exposure, no mains supply, a 200 m boundary, an estate's access rules, cable routes through somebody else's ceiling. This is the field that makes a case study believable."
          >
            <TextArea name="siteConditions" rows={4} defaultValue={project?.siteConditions ?? ""} />
          </Field>

          <Field
            label="What was installed, and why"
            name="solution"
            hint="Name the models. Say why that camera and not the cheaper one. The reasoning is the part a reader cannot get from a photograph."
          >
            <TextArea name="solution" rows={5} defaultValue={project?.solution ?? ""} />
          </Field>

          <Field
            label="The outcome"
            name="outcome"
            hint="What it does for them now. If footage has actually been used — a theft identified, a dispute settled — that single sentence is worth the rest of the page."
          >
            <TextArea name="outcome" rows={4} defaultValue={project?.outcome ?? ""} />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Evidence"
        description="A package link puts the full itemised bill of materials on the case study page. Nobody else in this market can do that, and it is the difference between a claim and a receipt."
      >
        <div className="grid gap-4">
          <Field
            label="Based on which package"
            name="solutionId"
            hint="Optional. Pick the closest one — the page shows its bill of materials as “what a system like this contains”, not as this client's invoice."
          >
            <Select
              name="solutionId"
              defaultValue={project?.solutionId ?? ""}
              options={[...none, ...options.solutions.map((s) => ({ value: s.id, label: s.name }))]}
            />
          </Field>

          <Field label="Category" name="categoryId">
            <Select
              name="categoryId"
              defaultValue={project?.categoryId ?? ""}
              options={[...none, ...options.categories.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </Field>

          <Field
            label="Photographs"
            name="images"
            hint={
              <>
                One URL per line, first one is the lead image. Upload them under{" "}
                <Link href="/admin/media" className="text-action underline underline-offset-4">
                  Media
                </Link>{" "}
                and paste the URLs here. Never a supplier packshot or a stock photo of a building
                you have not been to.
              </>
            }
          >
            <LinesInput name="images" values={project?.images ?? []} rows={4} />
          </Field>
        </div>
      </Panel>

      <Panel title="Publishing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sort order" name="sortOrder" hint="Lower shows first.">
            <NumberInput name="sortOrder" defaultValue={project?.sortOrder ?? 0} />
          </Field>
          <Checkbox
            name="published"
            label="Live on the site"
            defaultChecked={project?.published ?? false}
          />
        </div>
      </Panel>

      <Button type="submit" size="cta">
        Save case study
      </Button>
    </form>
  );
}

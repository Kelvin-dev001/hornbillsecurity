import { asc } from "drizzle-orm";

import {
  AdminHeading,
  Checkbox,
  Field,
  FormMessage,
  NumberInput,
  Panel,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { services } from "@/db/schema";
import { requireAdmin } from "@/lib/admin/auth";
import { saveServiceAction } from "@/lib/admin/catalog-actions";
import { formatKes } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata = { title: "Services" };

const UNIT_LABELS: Record<string, string> = {
  per_point: "per point",
  per_camera: "per camera",
  per_door: "per door",
  per_metre: "per metre",
  per_day: "per day",
  per_month: "per month",
  per_year: "per year",
  per_camera_per_month: "per camera per month",
  per_vehicle: "per vehicle",
  per_tank: "per tank",
  per_delegate: "per delegate",
  fixed: "fixed",
};

const BASIS_OPTIONS = [
  { value: "owner_sell_price", label: "Your price" },
  { value: "placeholder", label: "Placeholder — not priced yet" },
  { value: "quote_required", label: "Quote required" },
];

/**
 * Labour and recurring services.
 *
 * The per-point labour rates here are the ones a bill of materials charges, and
 * they are seeded from the quantity rules so the two cannot disagree. Change
 * labour_per_camera_point under Quantity rules and change it here to match, or
 * a package will price labour at one rate and the services page will quote
 * another.
 */
export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, rows] = await Promise.all([
    searchParams,
    db.select().from(services).orderBy(asc(services.sortOrder)),
  ]);

  return (
    <>
      <AdminHeading
        title="Services"
        description="The human work — installation labour, the survey, maintenance and monitoring."
      />

      <FormMessage status={status} />

      <div className="space-y-4">
        {rows.map((service) => (
          <Panel key={service.id}>
            <form action={saveServiceAction} className="space-y-4">
              <input type="hidden" name="id" value={service.id} />

              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <TextInput name="name" defaultValue={service.name} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {UNIT_LABELS[service.pricingUnit] ?? service.pricingUnit}
                  {service.price !== null ? ` · ${formatKes(service.price)}` : " · no price"}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <Field label="Price, KES" name={`price-${service.id}`}>
                  <NumberInput name="price" defaultValue={service.price ?? ""} min={0} />
                </Field>
                <Field label="Basis" name={`basis-${service.id}`}>
                  <Select name="priceBasis" options={BASIS_OPTIONS} defaultValue={service.priceBasis} />
                </Field>
              </div>

              <Field label="Description" name={`description-${service.id}`}>
                <TextArea name="description" rows={2} defaultValue={service.description} />
              </Field>

              <Field
                label="What it includes"
                name={`inclusions-${service.id}`}
                hint="One per line."
              >
                <TextArea name="inclusions" rows={3} defaultValue={service.inclusions.join("\n")} />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Checkbox name="published" label="Live on the site" defaultChecked={service.published} />
                <Button type="submit" size="cta" variant="outline">
                  Save
                </Button>
              </div>
            </form>
          </Panel>
        ))}
      </div>
    </>
  );
}

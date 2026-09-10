import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import {
  AdminHeading,
  Checkbox,
  Field,
  FormMessage,
  LinesInput,
  NumberInput,
  Panel,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/form-fields";
import { PricePanelDisplay } from "@/components/admin/price-panel";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { getItem, listBrandOptions, listCategoryOptions, pricePanel } from "@/lib/admin/items";
import { saveItemAction, unpublishItemAction } from "@/lib/admin/item-actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit item" };

const PRICE_BASIS_OPTIONS = [
  { value: "distributor", label: "Distributor cost — takes the ×1.40 markup" },
  { value: "market_research", label: "Market research — a reseller's figure, not a base to mark up" },
  { value: "owner_sell_price", label: "Owner sell price — already public, no markup" },
  { value: "quote_required", label: "Quote required — no price yet" },
  { value: "placeholder", label: "Placeholder — an estimate, marked on the site" },
];

const UNIT_OPTIONS = [
  { value: "each", label: "each" },
  { value: "metre", label: "per metre" },
  { value: "roll_305m", label: "per 305 m box" },
  { value: "box", label: "per box" },
  { value: "length_2m", label: "per 2 m length" },
  { value: "coil", label: "per coil" },
  { value: "pair", label: "per pair" },
];

export default async function AdminItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { status }] = await Promise.all([params, searchParams]);

  const item = await getItem(id);
  if (!item) notFound();

  const [categories, brands] = await Promise.all([listCategoryOptions(), listBrandOptions()]);
  const panel = pricePanel(item);

  return (
    <>
      <AdminHeading title={item.name} description={item.sku}>
        {item.published ? (
          <Button asChild variant="outline" size="cta">
            <Link href={`/catalog/item/${item.slug}`} target="_blank">
              <ExternalLink aria-hidden="true" />
              View live
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/items">Back to items</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />

      <div className="mb-6">
        <PricePanelDisplay panel={panel} />
      </div>

      <form action={saveItemAction} className="space-y-6">
        <input type="hidden" name="id" value={item.id} />

        <Panel title="Pricing" description="Cost is private. It never reaches the public site.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Distributor cost"
              name="costPrice"
              hint="KES, VAT-exclusive. Trade price, never a retail figure."
            >
              <NumberInput name="costPrice" defaultValue={item.costPrice ?? ""} min={0} step={1} />
            </Field>

            <Field label="Markup" name="markupMultiplier" hint="1.40 unless this SKU is special.">
              <TextInput
                name="markupMultiplier"
                defaultValue={item.markupMultiplier}
                inputMode="decimal"
              />
            </Field>

            <Field
              label="Market ceiling"
              name="marketCeilingPrice"
              hint="Never sells above this. Use it where Jumia is cheaper than cost × markup."
            >
              <NumberInput
                name="marketCeilingPrice"
                defaultValue={item.marketCeilingPrice ?? ""}
                min={0}
                step={1}
              />
            </Field>

            <Field
              label="Price override"
              name="priceOverride"
              hint="Sets the public price outright and skips the markup."
            >
              <NumberInput
                name="priceOverride"
                defaultValue={item.priceOverride ?? ""}
                min={0}
                step={1}
              />
            </Field>

            <Field label="Where the price came from" name="priceBasis">
              <Select name="priceBasis" options={PRICE_BASIS_OPTIONS} defaultValue={item.priceBasis} />
            </Field>

            <Field label="Sold as" name="unit">
              <Select name="unit" options={UNIT_OPTIONS} defaultValue={item.unit} />
            </Field>
          </div>
        </Panel>

        <Panel title="Identity">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Model number" name="sku" required hint="Exactly as printed on the box.">
              <TextInput name="sku" defaultValue={item.sku} required />
            </Field>
            <Field label="URL slug" name="slug" required>
              <TextInput name="slug" defaultValue={item.slug} required />
            </Field>
            <Field label="Name" name="name" required className="sm:col-span-2">
              <TextInput name="name" defaultValue={item.name} required />
            </Field>
            <Field label="Category" name="categoryId" required>
              <Select
                name="categoryId"
                defaultValue={item.categoryId}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Field>
            <Field label="Brand" name="brandId">
              <Select
                name="brandId"
                defaultValue={item.brandId ?? ""}
                options={[{ value: "", label: "No brand" }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
              />
            </Field>
          </div>
        </Panel>

        <Panel
          title="What it is"
          description="The short line appears on cards and in the price table. Keep it factual."
        >
          <div className="grid gap-4">
            <Field label="One-line summary" name="shortDescription" required>
              <TextInput name="shortDescription" defaultValue={item.shortDescription} required />
            </Field>
            <Field label="Description" name="description" hint="Optional. Plain, specific, priced.">
              <TextArea name="description" defaultValue={item.description ?? ""} />
            </Field>
            <Field label="Where it goes" name="useCases" hint="One per line.">
              <LinesInput name="useCases" values={item.useCases} rows={3} />
            </Field>
            <Field
              label="Specification"
              name="specs"
              hint="One per line, as Group | Label | Value. For example: Imaging | Resolution | 4MP"
            >
              <TextArea
                name="specs"
                rows={10}
                defaultValue={item.specs
                  .map((spec) => `${spec.group} | ${spec.label} | ${spec.value}`)
                  .join("\n")}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Availability and media">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Image URL" name="primaryImageUrl" hint="Upload under Images, then paste the URL.">
              <TextInput name="primaryImageUrl" defaultValue={item.primaryImageUrl ?? ""} />
            </Field>
            <Field label="Datasheet URL" name="datasheetUrl">
              <TextInput name="datasheetUrl" defaultValue={item.datasheetUrl ?? ""} />
            </Field>
            <Field label="Lead time note" name="leadTimeNote" hint="Shown to customers.">
              <TextInput name="leadTimeNote" defaultValue={item.leadTimeNote ?? ""} />
            </Field>
            <div className="flex flex-col justify-end gap-3">
              <Checkbox name="inStock" label="In stock" defaultChecked={item.inStock} />
              <Checkbox
                name="isConsumable"
                label="Consumable"
                defaultChecked={item.isConsumable}
                hint="Cable, connectors, clips. Kept out of headline lists."
              />
            </div>
          </div>
        </Panel>

        <Panel title="Search and internal">
          <div className="grid gap-4">
            <Field label="SEO title" name="seoTitle" hint="Blank uses the model number and name.">
              <TextInput name="seoTitle" defaultValue={item.seoTitle ?? ""} />
            </Field>
            <Field label="SEO description" name="seoDescription">
              <TextArea name="seoDescription" rows={2} defaultValue={item.seoDescription ?? ""} />
            </Field>
            <Field
              label="Internal note"
              name="internalNote"
              hint="Private. Never rendered anywhere on the site."
            >
              <TextArea name="internalNote" rows={2} defaultValue={item.internalNote ?? ""} />
            </Field>
            <Checkbox
              name="published"
              label="Live on the site"
              defaultChecked={item.published}
              hint="An item with no price stays hidden regardless."
            />
          </div>
        </Panel>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="cta">
            Save
          </Button>
        </div>
      </form>

      {item.published ? (
        <form action={unpublishItemAction} className="mt-8 border-t border-line pt-6">
          <input type="hidden" name="id" value={item.id} />
          <p className="mb-2 text-sm text-muted-foreground">
            There is no delete. An item can be inside a package or a quotation a customer already
            holds; taking it off the site is what you want.
          </p>
          <Button type="submit" variant="outline" size="cta">
            Take off the site
          </Button>
        </form>
      ) : null}
    </>
  );
}

import Image from "next/image";
import { Trash2, Upload } from "lucide-react";

import { AdminHeading, Field, FormMessage, Panel, TextInput } from "@/components/admin/form-fields";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteMediaAction, uploadMediaAction } from "@/lib/admin/media";
import { listMedia } from "@/lib/admin/media-queries";
import { CopyableUrl } from "@/components/admin/copyable-url";

export const dynamic = "force-dynamic";

export const metadata = { title: "Images" };

/**
 * The image library.
 *
 * Upload a photograph, describe it, get a URL to paste into an item or an
 * article. Everything is converted to WebP and capped at 2000px on upload, so
 * the owner can send a photo straight off his phone without thinking about it —
 * which is the only way install photographs ever actually get onto a site.
 */
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ status }, images] = await Promise.all([searchParams, listMedia()]);

  return (
    <>
      <AdminHeading
        title="Images"
        description="Photographs of your own installs. Never a supplier's packshot with someone else's branding on it."
      />

      <FormMessage status={status} />

      <Panel
        title="Upload"
        description="Converted to WebP and resized to 2000px. A 4 MB phone photo comes out a few hundred KB."
        className="mb-8"
      >
        <form action={uploadMediaAction} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="grid gap-4">
            <Field label="Image" name="file" required>
              <input
                id="file"
                name="file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                required
                className="block w-full text-sm text-muted-foreground file:mr-3 file:h-11 file:rounded-control file:border file:border-line-control file:bg-paper-warm file:px-4 file:text-sm file:font-medium file:text-ink hover:file:bg-ink/5"
              />
            </Field>

            <Field
              label="Alt text"
              name="altText"
              required
              hint="What is in the picture, for someone who cannot see it. Required — an image without it is invisible to a screen reader and to Google."
            >
              <TextInput
                name="altText"
                required
                minLength={3}
                placeholder="Four ColorVu cameras on a Nyali boundary wall, installed against salt-air corrosion"
              />
            </Field>
          </div>

          <Button type="submit" size="cta">
            <Upload aria-hidden="true" />
            Upload
          </Button>
        </form>
      </Panel>

      {images.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing uploaded yet. Install photographs carry the location pages, which are the whole
          launch strategy.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <li key={image.id} className="overflow-hidden rounded-card border border-line bg-paper">
              <Image
                src={image.publicUrl}
                alt={image.altText}
                width={image.width ?? 640}
                height={image.height ?? 480}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="space-y-2 p-4">
                <p className="text-sm text-ink">{image.altText}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {image.width} × {image.height}
                  {image.bytes ? ` · ${Math.round(image.bytes / 1024)} KB` : ""}
                </p>

                <CopyableUrl url={image.publicUrl} />

                <form action={deleteMediaAction}>
                  <input type="hidden" name="id" value={image.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-danger"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Delete
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

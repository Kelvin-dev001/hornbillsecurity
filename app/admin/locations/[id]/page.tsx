import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { LocationForm } from "@/components/admin/location-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { getLocationForAdmin } from "@/lib/admin/content-queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit area" };

export default async function EditLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { status }] = await Promise.all([params, searchParams]);

  const location = await getLocationForAdmin(id);
  if (!location) notFound();

  return (
    <>
      <AdminHeading title={location.name} description={`${location.county} County`}>
        {location.published ? (
          <Button asChild variant="outline" size="cta">
            <Link href={`/services/cctv-installation/${location.slug}`} target="_blank">
              <ExternalLink aria-hidden="true" />
              View live
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/locations">Back</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />
      <LocationForm location={location} />
    </>
  );
}

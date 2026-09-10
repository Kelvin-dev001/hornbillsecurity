import Link from "next/link";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { LocationForm } from "@/components/admin/location-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "New area" };

export default async function NewLocationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;

  return (
    <>
      <AdminHeading title="New area" description="Coast only.">
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/locations">Back</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />
      <LocationForm location={null} />
    </>
  );
}

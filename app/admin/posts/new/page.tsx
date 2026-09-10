import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { PostForm } from "@/components/admin/post-form";
import { requireAdmin } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "New article" };

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;

  return (
    <>
      <AdminHeading
        title="New article"
        description="Plain, specific, priced. Name the model number and give the number — that exact string is what people search for."
      />
      <FormMessage status={status} />
      <PostForm />
    </>
  );
}

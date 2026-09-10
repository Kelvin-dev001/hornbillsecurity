import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { AdminHeading, FormMessage } from "@/components/admin/form-fields";
import { PostForm } from "@/components/admin/post-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { getPostForAdmin } from "@/lib/admin/post-queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit article" };

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const [{ id }, { status }] = await Promise.all([params, searchParams]);

  const post = await getPostForAdmin(id);
  if (!post) notFound();

  return (
    <>
      <AdminHeading title={post.title} description={post.published ? "Live" : "Draft"}>
        {post.published ? (
          <Button asChild variant="outline" size="cta">
            <Link href={`/blog/${post.slug}`} target="_blank">
              <ExternalLink aria-hidden="true" />
              View live
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" size="cta">
          <Link href="/admin/posts">Back to articles</Link>
        </Button>
      </AdminHeading>

      <FormMessage status={status} />
      <PostForm post={post} />
    </>
  );
}

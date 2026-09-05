import Link from "next/link";

import { categoryIcon } from "@/lib/category-icons";
import type { CategoryNode } from "@/lib/catalog/types";
import { formatKes } from "@/lib/site-settings";

/**
 * A category on /catalog.
 *
 * Carries the item count and a "from" price, because the point of the site is
 * that a visitor can see a number before they call anyone — a category tile that
 * says only "IP cameras" makes them click to find out whether it is worth it.
 */
export function CategoryCard({ category }: { category: CategoryNode }) {
  const Icon = categoryIcon(category.icon);

  return (
    <article className="group relative flex flex-col gap-3 rounded-card border border-line bg-paper p-5 transition-colors hover:border-brand-orange/60">
      <Icon className="size-6 text-action" aria-hidden="true" strokeWidth={1.5} />

      <h3 className="font-display text-lg font-semibold text-ink">
        <Link href={`/catalog/${category.slug}`}>
          <span className="absolute inset-0" aria-hidden="true" />
          {category.name}
        </Link>
      </h3>

      <p className="text-sm text-muted-foreground">{category.summary}</p>

      <p className="mt-auto pt-1 text-sm text-muted-foreground">
        <span className="font-semibold text-ink tabular-nums">{category.itemCount}</span>{" "}
        {category.itemCount === 1 ? "item" : "items"}
        {category.fromPrice !== null ? (
          <>
            {" · from "}
            <span className="font-semibold text-ink tabular-nums">
              {formatKes(category.fromPrice)}
            </span>
          </>
        ) : null}
      </p>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";

import { PlaceholderImage } from "@/components/catalog/placeholder-image";
import { unitLabel } from "@/lib/catalog/format";
import type { CatalogItem } from "@/lib/catalog/types";
import { formatKes } from "@/lib/site-settings";

/**
 * docs/04 §ItemCard — placeholder-aware, because most items have no photo at
 * launch.
 *
 * The model number is set in mono and shown in full: CLAUDE.md §6 makes the
 * point that the exact string is an uncontested search query, so it belongs on
 * the card as well as the page.
 *
 * Whole-card link with a nested <span> holding the accessible name, so the tap
 * target is the card and there is still exactly one link per card.
 */
export function ItemCard({ item }: { item: CatalogItem }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-paper transition-colors hover:border-brand-orange/60">
      {item.primaryImageUrl ? (
        <Image
          src={item.primaryImageUrl}
          alt={item.name}
          width={480}
          height={360}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <PlaceholderImage
          sku={item.sku}
          categoryIcon={item.category.icon}
          className="rounded-none border-0 border-b border-line"
        />
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.brand ? <span className="font-medium text-ink">{item.brand.name}</span> : null}
          <span>{item.category.name}</span>
        </div>

        <h3 className="text-base leading-snug font-semibold text-ink">
          <Link href={`/catalog/item/${item.slug}`} className="hover:underline">
            <span className="absolute inset-0" aria-hidden="true" />
            {item.name}
          </Link>
        </h3>

        <p className="font-mono text-xs tracking-tight text-action">{item.sku}</p>
        <p className="text-sm text-muted-foreground">{item.shortDescription}</p>

        <p className="mt-auto pt-2">
          <span className="text-lg font-semibold text-ink tabular-nums">
            {formatKes(item.price)}
          </span>{" "}
          <span className="text-sm text-muted-foreground">{unitLabel(item.unit)}</span>
        </p>
      </div>
    </article>
  );
}

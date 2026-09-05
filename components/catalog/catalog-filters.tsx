import Link from "next/link";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CatalogFilters, Facet, CategoryNode } from "@/lib/catalog/types";
import { SORT_OPTIONS } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

/**
 * The catalogue facets.
 *
 * Every control is a link or a plain GET form. No client component, no
 * JavaScript, no hydration — CLAUDE.md §2.1: what matters must be in the initial
 * HTML, and a filter that only works once a bundle has loaded is a filter
 * ChatGPT and a mid-range Android on metered data both miss.
 *
 * The base path is passed in so the same component serves /catalog and
 * /catalog/[category]: on a category page the category is the path, not a query
 * parameter, which keeps the canonical URL clean.
 */

function buildHref(
  basePath: string,
  filters: CatalogFilters,
  change: Partial<CatalogFilters> & { clear?: keyof CatalogFilters },
): string {
  const next = { ...filters, ...change };
  if (change.clear) delete next[change.clear];

  const params = new URLSearchParams();
  if (next.query) params.set("q", next.query);
  if (next.brandSlug) params.set("brand", next.brandSlug);
  if (next.priceBand) params.set("price", next.priceBand);
  if (next.sort) params.set("sort", next.sort);

  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

function FacetGroup({
  heading,
  facets,
  activeKey,
  hrefFor,
  clearHref,
}: {
  heading: string;
  facets: Facet[];
  activeKey: string | undefined;
  hrefFor: (key: string) => string;
  clearHref: string;
}) {
  if (facets.length < 2 && !activeKey) return null;

  return (
    <fieldset className="border-t border-line pt-4">
      <legend className="mb-2 font-display text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {heading}
      </legend>
      <ul className="flex flex-wrap gap-2">
        {activeKey ? (
          <li>
            <Link
              href={clearHref}
              className="inline-flex h-8 items-center gap-1 rounded-pill border border-line px-3 text-sm text-muted-foreground hover:border-ink hover:text-ink"
            >
              All
            </Link>
          </li>
        ) : null}
        {facets.map((facet) => {
          const active = facet.key === activeKey;
          return (
            <li key={facet.key}>
              <Link
                href={active ? clearHref : hrefFor(facet.key)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-sm transition-colors",
                  active
                    ? "border-brand-orange bg-brand-orange text-ink"
                    : "border-line text-muted-foreground hover:border-ink hover:text-ink",
                )}
              >
                {facet.label}
                <span className={cn("tabular-nums", active ? "text-ink/70" : "text-muted-foreground/70")}>
                  {facet.count}
                </span>
                {active ? <X className="size-3" aria-hidden="true" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

export function CatalogFilterBar({
  basePath,
  filters,
  brandOptions,
  priceOptions,
  categories,
  activeCategorySlug,
  resultCount,
}: {
  basePath: string;
  filters: CatalogFilters;
  brandOptions: Facet[];
  priceOptions: Facet[];
  /** Sibling or child categories to jump to. Omitted where there are none. */
  categories?: CategoryNode[];
  activeCategorySlug?: string;
  resultCount: number;
}) {
  const anyFilterActive = Boolean(
    filters.query || filters.brandSlug || filters.priceBand || filters.sort,
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={basePath} method="get" role="search" className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="catalog-search">
          Search by model number, brand or feature
        </label>
        <div className="relative flex-1 basis-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="catalog-search"
            type="search"
            name="q"
            defaultValue={filters.query ?? ""}
            placeholder="DS-2CD1043G2-LIUF/SL, ColorVu, nanny camera…"
            className="h-11 w-full rounded-control border border-line bg-paper pr-3 pl-9 text-base text-ink placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </div>
        {/* Filters already applied survive a new search. */}
        {filters.brandSlug ? <input type="hidden" name="brand" value={filters.brandSlug} /> : null}
        {filters.priceBand ? <input type="hidden" name="price" value={filters.priceBand} /> : null}
        <Button type="submit" size="cta">
          Search
        </Button>
      </form>

      {categories && categories.length > 1 ? (
        <fieldset className="border-t border-line pt-4">
          <legend className="mb-2 font-display text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Category
          </legend>
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = category.slug === activeCategorySlug;
              return (
                <li key={category.slug}>
                  <Link
                    href={`/catalog/${category.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-sm transition-colors",
                      active
                        ? "border-brand-orange bg-brand-orange text-ink"
                        : "border-line text-muted-foreground hover:border-ink hover:text-ink",
                    )}
                  >
                    {category.name}
                    <span className="tabular-nums opacity-70">{category.itemCount}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      <FacetGroup
        heading="Brand"
        facets={brandOptions}
        activeKey={filters.brandSlug}
        hrefFor={(key) => buildHref(basePath, filters, { brandSlug: key })}
        clearHref={buildHref(basePath, filters, { clear: "brandSlug" })}
      />

      <FacetGroup
        heading="Price (KES)"
        facets={priceOptions}
        activeKey={filters.priceBand}
        hrefFor={(key) => buildHref(basePath, filters, { priceBand: key as never })}
        clearHref={buildHref(basePath, filters, { clear: "priceBand" })}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-sm text-muted-foreground">
          <strong className="font-semibold text-ink tabular-nums">{resultCount}</strong>{" "}
          {resultCount === 1 ? "item" : "items"}
          {filters.query ? (
            <>
              {" "}
              matching <strong className="font-semibold text-ink">{filters.query}</strong>
            </>
          ) : null}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort</span>
          <ul className="flex flex-wrap gap-1.5">
            {SORT_OPTIONS.filter((option) => option.key !== "relevance" || filters.query).map(
              (option) => {
                const active =
                  (filters.sort ?? (filters.query ? "relevance" : "price-asc")) === option.key;
                return (
                  <li key={option.key}>
                    <Link
                      href={buildHref(basePath, filters, { sort: option.key })}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "inline-flex h-8 items-center rounded-pill border px-3 text-sm transition-colors",
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-line text-muted-foreground hover:border-ink hover:text-ink",
                      )}
                    >
                      {option.label}
                    </Link>
                  </li>
                );
              },
            )}
          </ul>

          {anyFilterActive ? (
            <Link
              href={basePath}
              className="inline-flex h-8 items-center gap-1 rounded-pill px-2 text-sm text-action hover:underline"
            >
              <X className="size-3.5" aria-hidden="true" />
              Clear all
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

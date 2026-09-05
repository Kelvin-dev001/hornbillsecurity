import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { CatalogFilterBar } from "@/components/catalog/catalog-filters";
import { ItemCard } from "@/components/catalog/item-card";
import { ItemPriceTable } from "@/components/catalog/item-price-table";
import { PriceStamp } from "@/components/price-stamp";
import { categoryIcon } from "@/lib/category-icons";
import {
  brandFacets,
  getAllCategories,
  getCategoryBySlug,
  listItems,
  priceBandFacets,
} from "@/lib/catalog/queries";
import {
  isFilteredView,
  parseCatalogFilters,
  type RawSearchParams,
} from "@/lib/catalog/search-params";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/origin";
import { formatKes, getSiteSettings } from "@/lib/site-settings";

/**
 * /catalog/[category] — statically generated for every published category.
 *
 * A parent category lists everything beneath it too, so /catalog/cctv shows the
 * cameras, recorders and drives together while /catalog/ip-cameras shows only
 * the cameras.
 *
 * Categories are published by the seed only when they have something in them
 * (db/seed/index.ts), so there is no such thing here as a category page with an
 * empty table.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.filter((c) => c.itemCount > 0).map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const [settings, { items }] = await Promise.all([getSiteSettings(), listItems({ categorySlug: slug })]);
  const filtered = isFilteredView(parseCatalogFilters(await searchParams));
  const cheapest = items.length > 0 ? Math.min(...items.map((item) => item.price)) : null;

  return {
    title: `${category.name} — prices and model numbers`,
    description:
      cheapest === null
        ? `${category.summary} ${settings.tradingName}, ${settings.serviceAreaLabel}.`
        : `${category.summary} ${items.length} models from ${formatKes(cheapest)}, ` +
          `VAT-exclusive. ${settings.tradingName}, ${settings.serviceAreaLabel}.`,
    alternates: { canonical: absoluteUrl(`/catalog/${slug}`) },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category || category.itemCount === 0) notFound();

  const filters = parseCatalogFilters(await searchParams);
  const [settings, allCategories, { items, matchedBeforeFacets }] = await Promise.all([
    getSiteSettings(),
    getAllCategories(),
    listItems({ ...filters, categorySlug: slug }),
  ]);

  const parent = category.parentSlug
    ? (allCategories.find((c) => c.slug === category.parentSlug) ?? null)
    : null;

  const trail = [
    { name: "Home", path: "/" },
    { name: "Catalogue", path: "/catalog" },
    ...(parent ? [{ name: parent.name, path: `/catalog/${parent.slug}` }] : []),
    { name: category.name, path: `/catalog/${category.slug}` },
  ];

  // Siblings if this is a child, children if this is a parent — either way, the
  // useful jump from here.
  const siblings = (
    category.children.length > 0
      ? category.children
      : allCategories.filter((c) => c.parentSlug === category.parentSlug)
  ).filter((c) => c.itemCount > 0);

  const Icon = categoryIcon(category.icon);

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(trail))} />
      {!isFilteredView(filters) ? (
        <script
          {...jsonLdScriptProps(
            itemListJsonLd({
              name: `${category.name} price list`,
              path: `/catalog/${category.slug}`,
              items,
            }),
          )}
        />
      ) : null}

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <Icon className="size-7 text-action" aria-hidden="true" strokeWidth={1.5} />
          <h1 className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">{category.name}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{category.summary}</p>
          <PriceStamp settings={settings} className="mt-4" />
        </header>

        <div className="mt-8">
          <CatalogFilterBar
            basePath={`/catalog/${category.slug}`}
            filters={filters}
            brandOptions={brandFacets(matchedBeforeFacets)}
            priceOptions={priceBandFacets(matchedBeforeFacets)}
            categories={siblings}
            activeCategorySlug={category.slug}
            resultCount={items.length}
          />
        </div>

        {items.length === 0 ? (
          <p className="mt-8 rounded-card border border-line bg-paper-warm px-4 py-6 text-muted-foreground">
            Nothing in {category.name} matches that.{" "}
            <Link href={`/catalog/${category.slug}`} className="text-action hover:underline">
              Clear the filters
            </Link>
            .
          </p>
        ) : (
          <>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <ItemCard item={item} />
                </li>
              ))}
            </ul>

            <div className="mt-12">
              <ItemPriceTable
                items={items}
                caption={`${category.name} price list — ${items.length} items, KES, VAT-exclusive`}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { CatalogFilterBar } from "@/components/catalog/catalog-filters";
import { CategoryCard } from "@/components/catalog/category-card";
import { ItemCard } from "@/components/catalog/item-card";
import { ItemPriceTable } from "@/components/catalog/item-price-table";
import { PriceStamp } from "@/components/price-stamp";
import {
  brandFacets,
  getCategoryTree,
  listItems,
  priceBandFacets,
} from "@/lib/catalog/queries";
import { isFilteredView, parseCatalogFilters, type RawSearchParams } from "@/lib/catalog/search-params";
import { absoluteUrl } from "@/lib/seo/origin";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdScriptProps } from "@/lib/seo/json-ld";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * /catalog — every published SKU, with its price, in the initial HTML.
 *
 * This page is the strategy in one screen (docs/01 §1): Kenyan shops publish
 * SKUs and prices, Kenyan installers publish package totals, and nobody
 * publishes both. The table at the bottom is the artefact that does not exist
 * anywhere else in this market, and it is server-rendered because ChatGPT does
 * not execute JavaScript (docs/03 §0).
 *
 * Rendering: unfiltered, this is served from the full-route cache and
 * revalidated hourly. Reading searchParams makes a filtered request dynamic,
 * which is correct — a facet permutation should not be cached or indexed — and
 * costs nothing, because the whole catalogue is already cached in memory by
 * lib/catalog/queries.ts and filtering makes no database round trip.
 */
export const revalidate = 3600;

const TRAIL = [
  { name: "Home", path: "/" },
  { name: "Catalogue", path: "/catalog" },
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const settings = await getSiteSettings();
  const filters = parseCatalogFilters(await searchParams);
  const filtered = isFilteredView(filters);

  return {
    title: "Equipment catalogue — every model number, every price",
    description:
      `Itemised prices for every camera, recorder, drive and cable we install, ` +
      `VAT-exclusive in KES. ${settings.tradingName}, ${settings.serviceAreaLabel}.`,
    alternates: { canonical: absoluteUrl("/catalog") },
    // A filtered view is the same items reordered. Indexing every permutation
    // splits the ranking signals of the one page that should rank.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseCatalogFilters(await searchParams);
  const [settings, tree, { items, matchedBeforeFacets }] = await Promise.all([
    getSiteSettings(),
    getCategoryTree(),
    listItems(filters),
  ]);

  const cctv = tree.find((node) => node.slug === "cctv");
  const browsable = [...(cctv?.children ?? []), ...tree.filter((node) => node.slug !== "cctv")]
    .filter((node) => node.itemCount > 0)
    .sort((a, b) => b.itemCount - a.itemCount);

  return (
    <>
      <script {...jsonLdScriptProps(breadcrumbJsonLd(TRAIL))} />
      {!isFilteredView(filters) ? (
        <script
          {...jsonLdScriptProps(
            itemListJsonLd({ name: "Hornbill equipment price list", path: "/catalog", items }),
          )}
        />
      ) : null}

      <div className="mx-auto max-w-(--container-page) px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumbs trail={TRAIL} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Equipment catalogue</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Every model number we install, with its price. Nothing here is sold on its own — we
            quote installed systems — but you can see what each part costs before you talk to
            anyone.
          </p>
          <PriceStamp settings={settings} className="mt-4" />
        </header>

        <section className="mt-10" aria-labelledby="browse">
          <h2 id="browse" className="font-display text-xl font-semibold text-ink">
            Browse by category
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {browsable.map((category) => (
              <li key={category.slug}>
                <CategoryCard category={category} />
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="all-items">
          <h2 id="all-items" className="font-display text-xl font-semibold text-ink">
            All equipment
          </h2>

          <div className="mt-4">
            <CatalogFilterBar
              basePath="/catalog"
              filters={filters}
              brandOptions={brandFacets(matchedBeforeFacets)}
              priceOptions={priceBandFacets(matchedBeforeFacets)}
              resultCount={items.length}
            />
          </div>

          {items.length === 0 ? (
            <p className="mt-8 rounded-card border border-line bg-paper-warm px-4 py-6 text-muted-foreground">
              Nothing matches that. Try a model number, a brand, or a feature like
              &ldquo;ColorVu&rdquo; — or{" "}
              <Link href="/catalog" className="text-action hover:underline">
                clear the filters
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
                  caption={`Price list — ${items.length} items, KES, VAT-exclusive`}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

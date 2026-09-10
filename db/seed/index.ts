/**
 * Seed runner — `npm run db:seed`.
 *
 * A standalone CLI script with its own connection: it deliberately does not
 * import db/index.ts, which is marked `server-only` and belongs to the Next.js
 * runtime.
 *
 * Idempotent throughout. Every table upserts on its natural key, so re-running
 * after a CSV edit updates prices in place and never duplicates a row. Safe to
 * run after every migration.
 *
 * Order is docs/02 §Seed order:
 *   site_settings → pricing_rules → brands → categories → items → services →
 *   solutions + solution_lines → locations → projects → testimonials → posts
 * Everything from solutions onwards arrives in Sprint 2 and later.
 */
import { rm } from "node:fs/promises";
import { join } from "node:path";

import { config } from "dotenv";
import { eq, inArray, sql as raw } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  brands,
  categories,
  faqs,
  items,
  posts,
  locations,
  pricingRules,
  services,
  siteSettings,
} from "../schema";
import { buildConsumables } from "./consumables";
import { buildFaqs } from "./faqs";
import { servicePageSeed } from "./service-pages";
import { buildPosts } from "./posts";
import { locationSeed } from "./locations";
import { readCatalogCsv } from "./csv";
import { buildSolutions } from "./build-solutions";
import { buildAlternatives, buildCompatibility, buildItems, SERVICE_SKUS } from "./items";
import { pricingRuleSeed } from "./pricing-rules";
import { buildServices } from "./services";
import { siteSettingsSeed } from "./site-settings";
import { brandSeed, categorySeed, csvCategoryToSlug } from "./taxonomy";
import { overwriteAllExcept } from "./upsert";

config({ path: ".env.local", quiet: true });

async function main() {
  const connectionString = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy it from Supabase → Project Settings → " +
        "Database → Connection string. See .env.example.",
    );
  }

  const client = postgres(connectionString, { prepare: false, max: 1, onnotice: () => {} });
  const db = drizzle(client);

  try {
    // ── site_settings ──────────────────────────────────────────────────────
    await db
      .insert(siteSettings)
      .values(siteSettingsSeed)
      .onConflictDoUpdate({
        target: siteSettings.id,
        set: overwriteAllExcept(siteSettings, ["id"]),
      });
    console.log("✓ site_settings");

    // ── pricing_rules ──────────────────────────────────────────────────────
    await db
      .insert(pricingRules)
      .values(pricingRuleSeed)
      .onConflictDoUpdate({
        target: pricingRules.key,
        set: overwriteAllExcept(pricingRules, ["key"]),
      });
    console.log(`✓ pricing_rules (${pricingRuleSeed.length})`);

    // ── brands ─────────────────────────────────────────────────────────────
    // is_authorised_partner comes from site_settings, so the badge on an item
    // page cannot claim something the footer does not (CLAUDE.md §9).
    const authorised = new Set(
      siteSettingsSeed.authorisedPartnerBrands?.map((name) => name.toLowerCase()) ?? [],
    );
    await db
      .insert(brands)
      .values(
        brandSeed.map((brand) => ({
          ...brand,
          isManufacturer: brand.isManufacturer ?? true,
          isAuthorisedPartner: authorised.has(brand.name.toLowerCase()),
        })),
      )
      .onConflictDoUpdate({ target: brands.slug, set: overwriteAllExcept(brands, ["id", "slug"]) });

    const brandRows = await db.select().from(brands);
    const brandIdBySlug = new Map(brandRows.map((b) => [b.slug, b.id]));
    const brandNameBySlug = new Map(brandRows.map((b) => [b.slug, b.name]));
    console.log(
      `✓ brands (${brandSeed.length}; authorised partner: ` +
        `${brandRows
          .filter((b) => b.isAuthorisedPartner)
          .map((b) => b.name)
          .join(", ")})`,
    );

    // ── categories ─────────────────────────────────────────────────────────
    // Roots first, then children, so parent_id is known at insert time and no
    // second pass is needed. categorySeed lists parents before their children.
    const categoryValues = categorySeed.map((category, index) => ({
      ...category,
      sortOrder: index * 10,
    }));
    const categorySet = overwriteAllExcept(categories, ["id", "slug", "published"]);

    await db
      .insert(categories)
      .values(
        categoryValues
          .filter((category) => category.parent === null)
          .map(({ parent: _parent, ...row }) => row),
      )
      .onConflictDoUpdate({ target: categories.slug, set: categorySet });

    const rootRows = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
    const rootIdBySlug = new Map(rootRows.map((c) => [c.slug, c.id]));

    const children = categoryValues.filter((category) => category.parent !== null);
    if (children.length > 0) {
      await db
        .insert(categories)
        .values(
          children.map(({ parent, ...row }) => {
            const parentId = rootIdBySlug.get(parent as string);
            if (!parentId) throw new Error(`category ${row.slug}: parent ${parent} missing`);
            return { ...row, parentId };
          }),
        )
        .onConflictDoUpdate({ target: categories.slug, set: categorySet });
    }

    // ── service-page copy ──────────────────────────────────────────────────
    // Sprint 6: one page per service line. Applied by slug and overwritten on
    // re-seed, because these are the site's own words about what it does rather
    // than the owner's editorial — /admin/categories is where he changes them,
    // and a change there is a deliberate edit to a page, not a data import.
    //
    // No price is written here. Every figure on a service page is read from the
    // catalogue at render, so a line with nothing priced shows no price rather
    // than an invented one (docs/08 Sprint 6).
    for (const page of servicePageSeed) {
      await db
        .update(categories)
        .set({
          serviceIntro: page.intro,
          serviceIncludes: page.includes,
          serviceNotFor: page.notFor,
          serviceFaq: page.faq,
        })
        .where(eq(categories.slug, page.slug));
    }
    console.log(`✓ service pages (${servicePageSeed.length} service lines)`);

    const categoryRows = await db.select().from(categories);
    const categoryIdBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));
    const categorySlugById = new Map(categoryRows.map((c) => [c.id, c.slug]));
    console.log(`✓ categories (${categorySeed.length})`);

    // ── items ──────────────────────────────────────────────────────────────
    const csvRows = readCatalogCsv();

    const unmapped = [...new Set(csvRows.map((row) => row.category))].filter(
      (name) => !(name in csvCategoryToSlug),
    );
    if (unmapped.length > 0) throw new Error(`unmapped CSV categories: ${unmapped.join(", ")}`);

    const { items: itemRows, priceWarnings } = buildItems(csvRows, {
      categoryIdBySlug,
      brandIdBySlug,
      brandNameBySlug,
    });

    // The parts a bill of materials needs that the owner's price list does not
    // carry yet — baluns, connectors, trunking, small PoE switches. See the
    // header of db/seed/consumables.ts: these are marked estimates.
    const consumableRows = buildConsumables(
      categoryIdBySlug,
      brandIdBySlug.get("generic") ?? null,
    );
    itemRows.push(...consumableRows);

    await db
      .insert(items)
      .values(itemRows)
      .onConflictDoUpdate({
        target: items.sku,
        // compatible_with and alternatives are set in the pass below, from ids
        // that only exist after this insert.
        set: overwriteAllExcept(items, ["id", "sku", "compatibleWith", "alternatives"]),
      });

    const seeded = (
      await db
        .select({
          id: items.id,
          sku: items.sku,
          name: items.name,
          slug: items.slug,
          shortDescription: items.shortDescription,
          unit: items.unit,
          priceBasis: items.priceBasis,
          categoryId: items.categoryId,
          price: items.effectivePrice,
          published: items.published,
        })
        .from(items)
    ).map((item) => ({ ...item, categorySlug: categorySlugById.get(item.categoryId) ?? "" }));

    const publishedItems = seeded.filter((item) => item.published).length;
    console.log(
      `✓ items (${itemRows.length}: ${itemRows.length - consumableRows.length} from the CSV + ` +
        `${consumableRows.length} BOM consumables; ${publishedItems} published, ` +
        `${itemRows.length - publishedItems} held back)`,
    );

    // ── "works with" and alternatives ──────────────────────────────────────
    const compatibility = buildCompatibility(seeded);
    const alternatives = buildAlternatives(seeded);

    // One statement, one parameter: the edges go over as JSON and are unpacked
    // in SQL. A multi-row VALUES list would need every uuid[] literal built by
    // hand, and an update per row is 91 round trips.
    const edgePayload = JSON.stringify(
      seeded.map((item) => ({
        id: item.id,
        compatibleWith: compatibility.get(item.id) ?? [],
        alternatives: alternatives.get(item.id) ?? [],
      })),
    );

    await db.execute(raw`
      update "items" set
        "compatible_with" = coalesce(
          (select array_agg(value::uuid)
             from jsonb_array_elements_text(edge.row -> 'compatibleWith')),
          '{}'::uuid[]
        ),
        "alternatives" = coalesce(
          (select array_agg(value::uuid)
             from jsonb_array_elements_text(edge.row -> 'alternatives')),
          '{}'::uuid[]
        )
      from jsonb_array_elements(${edgePayload}::jsonb) as edge(row)
      where "items"."id" = (edge.row ->> 'id')::uuid
    `);
    console.log(
      `✓ relationships (${compatibility.size} with "works with", ` +
        `${alternatives.size} with alternatives)`,
    );

    // ── services ───────────────────────────────────────────────────────────
    const ruleValues = new Map(pricingRuleSeed.map((rule) => [rule.key, Number(rule.value)]));
    const serviceRows = buildServices(
      csvRows.filter((row) => SERVICE_SKUS.has(row.sku)),
      {
        categoryIdBySlug,
        ruleValue: (key) => {
          const value = ruleValues.get(key);
          if (value === undefined) throw new Error(`pricing rule ${key} is not seeded`);
          return value;
        },
        siteSurveyFee: siteSettingsSeed.siteSurveyFee,
        siteSurveyDeliverable: siteSettingsSeed.siteSurveyDeliverable,
      },
    );

    await db
      .insert(services)
      .values(serviceRows)
      .onConflictDoUpdate({
        target: services.slug,
        set: overwriteAllExcept(services, ["id", "slug"]),
      });
    console.log(
      `✓ services (${serviceRows.length}; ` +
        `${serviceRows.filter((s) => s.published).length} published)`,
    );

    // ── solutions and their bills of materials ─────────────────────────────
    const solutionResult = await buildSolutions(db, {
      categoryIdBySlug,
      itemsBySku: new Map(seeded.map((item) => [item.sku, item])),
      rules: ruleValues,
      vatRate: Number(siteSettingsSeed.vatRate),
    });
    console.log(
      `✓ solutions (${solutionResult.solutions} packages, ${solutionResult.lines} BOM lines)`,
    );

    // ── locations ──────────────────────────────────────────────────────────
    // docs/03 §2: the coast set, and no Nairobi page. These are published on
    // seed because each carries real local copy rather than a template.
    await db
      .insert(locations)
      .values(
        locationSeed.map((location, index) => ({
          slug: location.slug,
          name: location.name,
          county: location.county,
          lat: String(location.lat),
          lng: String(location.lng),
          intro: location.intro,
          localNotes: location.localNotes,
          sortOrder: index * 10,
          published: true,
        })),
      )
      .onConflictDoUpdate({
        target: locations.slug,
        set: overwriteAllExcept(locations, ["id", "slug"]),
      });
    console.log(`✓ locations (${locationSeed.length} coast pages, no Nairobi)`);

    // ── faqs ───────────────────────────────────────────────────────────────
    // Every answer restates something already settled in the docs. The owner
    // edits them from admin afterwards, so this table is truncated and rewritten
    // rather than upserted on a natural key it does not have — but only on the
    // rows the seed itself wrote, which is why it matches on the question text.
    const faqRows = buildFaqs({
      siteSurveyFee: siteSettingsSeed.siteSurveyFee,
      depositPercent: siteSettingsSeed.depositPercent,
      quoteValidityDays: siteSettingsSeed.quoteValidityDays,
      warrantyMonths: siteSettingsSeed.warrantyMonths,
      vatRate: siteSettingsSeed.vatRate,
      mpesaPaybill: siteSettingsSeed.mpesaPaybill,
      mpesaAccount: siteSettingsSeed.mpesaAccount,
      serviceAreaLabel: siteSettingsSeed.serviceAreaLabel,
      responsePromise: siteSettingsSeed.responsePromise,
    });

    const existingFaqs = await db.select({ question: faqs.question }).from(faqs);
    const existingQuestions = new Set(existingFaqs.map((row) => row.question));
    const newFaqs = faqRows.filter((row) => !existingQuestions.has(row.question));
    if (newFaqs.length > 0) await db.insert(faqs).values(newFaqs);
    console.log(`✓ faqs (${faqRows.length} seeded, ${newFaqs.length} new)`);

    // ── posts ──────────────────────────────────────────────────────────────
    // The launch articles. Their price tables are rendered from the same Bom
    // objects the package pages use, so an article cannot quote a figure the
    // site does not carry. Inserted once and then owned by the owner: a
    // re-seed must never overwrite an article he has edited in admin.
    const postRows = buildPosts({
      boms: solutionResult.boms,
      serviceRates: new Map(
        serviceRows.map((row) => [
          row.slug,
          { name: row.name, price: row.price, pricingUnit: row.pricingUnit },
        ]),
      ),
      rules: ruleValues,
      pricesUpdatedAt: siteSettingsSeed.pricesUpdatedAt,
      vatRate: Number(siteSettingsSeed.vatRate),
      siteSurveyFee: siteSettingsSeed.siteSurveyFee,
      warrantyMonths: siteSettingsSeed.warrantyMonths,
      quoteValidityDays: siteSettingsSeed.quoteValidityDays,
      depositPercent: siteSettingsSeed.depositPercent,
    });

    // Inserted if absent, refreshed only while posts.seed_owned is still true.
    //
    // That distinction matters in both directions: a correction to a launch
    // article — a wrong figure, a dead link — has to be deliverable by
    // re-seeding, and an article the owner has rewritten must never be
    // overwritten by one. Every save from the admin portal clears the flag.
    //
    // The first version of this inferred ownership from `updated_at =
    // created_at` and was wrong by construction: db/migrations/0009_content.sql
    // puts a `posts_set_updated_at` BEFORE UPDATE trigger on the table, so the
    // seed's own refresh bumped the timestamp and every article immediately
    // looked edited — silently making corrections undeliverable, which is the
    // exact failure the mechanism exists to prevent. An explicit column cannot
    // be fooled by a trigger.
    const existingPosts = await db
      .select({ slug: posts.slug, seedOwned: posts.seedOwned })
      .from(posts);
    const ownedBySeed = new Set(
      existingPosts.filter((row) => row.seedOwned).map((row) => row.slug),
    );
    const edited = new Set(
      existingPosts.filter((row) => !row.seedOwned).map((row) => row.slug),
    );

    const writablePosts = postRows
      .filter((row) => !edited.has(row.slug as string))
      .map((row) => ({ ...row, seedOwned: true }));
    let refreshed = 0;
    if (writablePosts.length > 0) {
      await db
        .insert(posts)
        .values(writablePosts)
        .onConflictDoUpdate({
          target: posts.slug,
          set: overwriteAllExcept(posts, ["id", "slug", "createdAt", "updatedAt"]),
        });
      refreshed = writablePosts.filter((row) => ownedBySeed.has(row.slug as string)).length;
    }
    console.log(
      `✓ posts (${postRows.length} launch articles, ` +
        `${writablePosts.length - refreshed} new, ${refreshed} refreshed` +
        `${edited.size > 0 ? `, ${edited.size} left alone because they were edited` : ""})`,
    );

    // ── publish the categories that have something in them ─────────────────
    // A category page with no items is thin content, so publication is derived
    // rather than declared: a category is published when it, or any descendant,
    // has a published item or service.
    const publishedSlugs = new Set<string>();
    for (const item of seeded) {
      if (item.published) publishedSlugs.add(item.categorySlug);
    }
    for (const service of serviceRows) {
      if (service.published) publishedSlugs.add(categorySlugById.get(service.categoryId) ?? "");
    }
    publishedSlugs.delete("");

    const parentBySlug = new Map(categorySeed.map((c) => [c.slug, c.parent]));
    for (const slug of [...publishedSlugs]) {
      let parent = parentBySlug.get(slug) ?? null;
      while (parent) {
        publishedSlugs.add(parent);
        parent = parentBySlug.get(parent) ?? null;
      }
    }

    await db.update(categories).set({ published: false });
    await db
      .update(categories)
      .set({ published: true })
      .where(inArray(categories.slug, [...publishedSlugs]));
    console.log(`✓ categories published (${publishedSlugs.size} of ${categorySeed.length})`);

    if (priceWarnings.length > 0) {
      console.warn(`\n! ${priceWarnings.length} price mismatch(es) between the CSV and our rule:`);
      for (const warning of priceWarnings) console.warn(`  ${warning}`);
      console.warn("  Nothing was skipped. Reconcile the CSV or the markup and re-run.\n");
    } else {
      console.log("✓ every distributor row's retail column matches cost x 1.40");
    }
    await dropStaleReadCache();
  } finally {
    await client.end();
  }
}

/**
 * Throw away Next's persisted read cache, because the seed has just changed the
 * database behind the running app's back.
 *
 * Every reader in lib/ wraps its query in `unstable_cache`, and those entries are
 * written to `.next/cache/fetch-cache`, which survives across builds. The app
 * busts them with `revalidateTag` when the owner saves something in admin — but a
 * seed run is not an admin save, so nothing tells the cache anything.
 *
 * The failure that made this necessary: articles were seeded, the site rebuilt,
 * and every article rendered as a 404 because an earlier build had cached an
 * empty posts list. lib/cache.ts now puts a one-hour ceiling on every entry so
 * the same thing self-heals in production; this makes it immediate locally, so a
 * build straight after a seed reflects what was just seeded.
 */
async function dropStaleReadCache() {
  const cacheDir = join(process.cwd(), ".next", "cache", "fetch-cache");
  try {
    await rm(cacheDir, { recursive: true, force: true });
    console.log("✓ cleared .next/cache/fetch-cache so the next build sees this data");
  } catch (error) {
    // Never fail a seed over a cache directory. Worst case the next build serves
    // data up to CACHE_TTL_SECONDS old, which is the documented behaviour.
    console.warn(`! could not clear the Next read cache: ${(error as Error).message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("✗ Seed failed:", error);
    process.exit(1);
  });

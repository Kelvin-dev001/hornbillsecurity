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
import { config } from "dotenv";
import { inArray, sql as raw } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { brands, categories, items, pricingRules, services, siteSettings } from "../schema";
import { readCatalogCsv } from "./csv";
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
          categoryId: items.categoryId,
          price: items.effectivePrice,
          published: items.published,
        })
        .from(items)
    ).map((item) => ({ ...item, categorySlug: categorySlugById.get(item.categoryId) ?? "" }));

    const publishedItems = seeded.filter((item) => item.published).length;
    console.log(
      `✓ items (${itemRows.length} from ${csvRows.length} CSV rows; ` +
        `${publishedItems} published, ${itemRows.length - publishedItems} held back)`,
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
  } finally {
    await client.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("✗ Seed failed:", error);
    process.exit(1);
  });

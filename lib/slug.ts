/**
 * URL slugs.
 *
 * Model numbers carry characters that cannot go in a path — `DS-2CD1043G2-LIUF/SL`
 * has a slash in it — so the slug is a flattened form and `items.sku` keeps the
 * true string. CLAUDE.md §6: the model number appears in full on the page,
 * because that exact string is an uncontested search query.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `hikvision-ds-2cd1043g2-liuf-sl` — the pattern set out in docs/03 §2. */
export function itemSlug(brandName: string | null, sku: string): string {
  return slugify(brandName ? `${brandName} ${sku}` : sku);
}

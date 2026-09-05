/**
 * Money formatting.
 *
 * Its own module, with no `server-only` marker, because the leak test needs to
 * know exactly how a price is rendered in order to recognise one — and the test
 * runs outside the Next.js runtime. lib/site-settings.ts re-exports it, so
 * components keep importing from where they already do.
 *
 * CLAUDE.md §2.6: all prices are KES, VAT-exclusive, no decimals. Kenya has no
 * sub-shilling pricing, so every amount in the system is an integer.
 */
export function formatKes(amount: number): string {
  // currencyDisplay: "code" gives "KES 11,900" rather than Intl's default
  // "Ksh 11,900". CLAUDE.md §2.6 requires prices labelled KES, the PriceStamp
  // says "KES, excluding 16% VAT", and a page that prints one and states the
  // other reads as carelessness on the one thing this site is selling.
  //
  // Intl separates the code from the amount with a non-breaking space; it is
  // normalised to an ordinary space so a copied price, a grep and the leak
  // test's scanner all see the same string.
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace(/[\u00a0\u202f]/g, " ");
}

/** `1150` → `1,150`. The bare grouped form, without the currency prefix. */
export function formatKesPlain(amount: number): string {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(amount);
}

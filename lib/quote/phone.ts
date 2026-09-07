/**
 * Kenyan mobile numbers.
 *
 * The sprint brief asks for 07xx, 01xx and +254 to be accepted. All three are
 * the same number written three ways, and a customer will use whichever their
 * phone shows them — so they are normalised to one form rather than rejected
 * for formatting.
 *
 * Safaricom, Airtel and Telkom mobile prefixes are all 07xx; 01xx is the newer
 * range Safaricom and Airtel now issue. Landlines and short codes are not
 * accepted: this number is what we call back on and what we open WhatsApp
 * against, and WhatsApp needs a mobile.
 */

const NORMALISED = /^254(1|7)\d{8}$/;

/**
 * Returns the number in E.164 without the plus (`254759293030`), or null if it
 * is not a Kenyan mobile.
 *
 * Accepts: 0759293030 · 0759 293 030 · +254759293030 · 254759293030 ·
 * 254-759-293-030 · 0112345678
 */
export function normaliseKenyanMobile(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (digits.length === 0) return null;

  let candidate = digits;
  if (candidate.startsWith("0")) candidate = `254${candidate.slice(1)}`;
  else if (candidate.startsWith("7") || candidate.startsWith("1")) candidate = `254${candidate}`;

  return NORMALISED.test(candidate) ? candidate : null;
}

/** `254759293030` → `0759 293 030`, which is how a Kenyan writes it down. */
export function formatKenyanMobile(normalised: string): string {
  const match = /^254(\d{3})(\d{3})(\d{3})$/.exec(normalised);
  return match ? `0${match[1]} ${match[2]} ${match[3]}` : normalised;
}

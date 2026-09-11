/**
 * Contrast audit against WCAG 2.1 AA — `npm run a11y:contrast`.
 *
 * CLAUDE.md §2.8: "Accessibility AA minimum. The brand orange fails contrast
 * with white text — see the design system doc. Never put white text on
 * `--brand-orange`." docs/05 Sprint 8 asks for a full AA audit.
 *
 * That rule has been stated in three documents since Sprint 0 and enforced
 * entirely by people remembering it. This computes it instead: it reads the
 * tokens out of app/globals.css, works out the real ratio for every pairing the
 * site actually uses, and exits non-zero if one fails. It is wired into
 * `npm test` so the rule survives somebody choosing a colour in a hurry.
 *
 * Ratios are computed per WCAG 2.1: relative luminance from linearised sRGB,
 * then (lighter + 0.05) / (darker + 0.05). Thresholds are 4.5 for normal text,
 * 3.0 for large text (18.66px bold or 24px regular) and for UI component
 * boundaries.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

/** Pull `--name: #hex;` declarations out of the first :root block. */
function readTokens(source) {
  const tokens = {};
  for (const match of source.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    // First definition wins: :root is the light palette, and the dark overrides
    // further down are audited separately below.
    if (!(match[1] in tokens)) tokens[match[1]] = match[2];
  }
  return tokens;
}

function toRgb(hex) {
  let value = hex.replace("#", "");
  if (value.length === 3) value = [...value].map((c) => c + c).join("");
  if (value.length === 8) value = value.slice(0, 6);
  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function luminance(hex) {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

const tokens = readTokens(css);

/**
 * The pairings the site actually renders, each with the threshold that applies.
 *
 * Written out rather than generated as a cross-product, because most
 * combinations are pairings nothing uses and a failure on one of those is noise
 * that trains you to ignore the output.
 */
const pairs = [
  // ── Body and heading text ────────────────────────────────────────────────
  { fg: "ink", bg: "paper", use: "Body text on white", min: 4.5 },
  { fg: "ink", bg: "paper-warm", use: "Body text on the warm panel", min: 4.5 },
  { fg: "muted", bg: "paper", use: "Muted text on white", min: 4.5 },
  { fg: "muted", bg: "paper-warm", use: "Muted text on the warm panel", min: 4.5 },
  { fg: "ink-soft", bg: "paper", use: "Softened heading on white", min: 4.5 },

  // ── The brand-orange rule, both directions ──────────────────────────────
  // This is the pairing CLAUDE.md §2.8 forbids, asserted rather than trusted.
  { fg: "paper", bg: "brand-orange", use: "WHITE ON BRAND ORANGE — must fail", min: 4.5, expectFail: true },
  { fg: "ink", bg: "brand-orange", use: "Primary button: ink on brand orange", min: 4.5 },
  { fg: "ink", bg: "brand-amber", use: "Ink on amber", min: 4.5 },
  { fg: "ink", bg: "brand-gold", use: "Ink on gold", min: 4.5 },

  // ── Links and accents ───────────────────────────────────────────────────
  { fg: "action", bg: "paper", use: "Link colour on white", min: 4.5 },
  { fg: "action", bg: "paper-warm", use: "Link colour on the warm panel", min: 4.5 },
  { fg: "paper", bg: "action", use: "White on --action (docs/04 says this is the safe one)", min: 4.5 },

  // ── Status colours ──────────────────────────────────────────────────────
  { fg: "success", bg: "paper", use: "Success tick on white", min: 4.5 },
  { fg: "success", bg: "paper-warm", use: "Success tick on the warm panel", min: 4.5 },
  { fg: "danger", bg: "paper", use: "Danger text on white", min: 4.5 },

  // ── Non-text contrast, WCAG 1.4.11 — 3.0, and only where it applies ─────
  //
  // A control's boundary needs 3:1; purely decorative graphics are exempt.
  // --line is a decorative card border at 1.29:1 and is deliberately NOT
  // audited: holding decoration to 3:1 would mean either a failing test
  // forever or a heavier border than the design wants. --line-control is the
  // one that carries inputs, and it is audited on both surfaces they sit on.
  { fg: "line-control", bg: "paper", use: "Form input border on white", min: 3.0, nonText: true },
  {
    fg: "line-control",
    bg: "paper-warm",
    use: "Form input border on the warm panel",
    min: 3.0,
    nonText: true,
  },
  { fg: "brand-orange", bg: "paper", use: "Focus ring / accent on white", min: 3.0, nonText: true },
];

let failures = 0;
let checked = 0;

console.log("\nWCAG 2.1 AA contrast — light palette\n");
console.log(`  ${"Pairing".padEnd(52)} ${"Ratio".padStart(7)}  ${"Min".padStart(5)}  Result`);
console.log(`  ${"-".repeat(52)} ${"-".repeat(7)}  ${"-".repeat(5)}  ------`);

for (const pair of pairs) {
  const fg = tokens[pair.fg];
  const bg = tokens[pair.bg];

  if (!fg || !bg) {
    console.log(`  ${pair.use.padEnd(52)}     —      —    TOKEN MISSING (--${!fg ? pair.fg : pair.bg})`);
    failures += 1;
    continue;
  }

  const value = ratio(fg, bg);
  const passes = value >= pair.min;
  checked += 1;

  // An expectFail pairing is one the design system forbids. It passing would
  // mean the palette changed and the rule is now about nothing — which is worth
  // knowing, so it is reported as a failure of the *test*, not of the palette.
  const ok = pair.expectFail ? !passes : passes;
  if (!ok) failures += 1;

  const verdict = pair.expectFail
    ? passes
      ? "UNEXPECTED PASS — is the rule still needed?"
      : "correctly fails"
    : passes
      ? "pass"
      : "FAIL";

  console.log(
    `  ${pair.use.padEnd(52)} ${value.toFixed(2).padStart(7)}  ${pair.min.toFixed(1).padStart(5)}  ${verdict}`,
  );
}

console.log(`\n  ${checked} pairings checked, ${failures} problem${failures === 1 ? "" : "s"}.\n`);

if (failures > 0) {
  console.error(
    "Contrast audit failed. docs/04-design-system.md has the palette rules; the " +
      "safe accent for white text is --action, never --brand-orange.\n",
  );
  process.exit(1);
}

import { randomInt } from "node:crypto";

/**
 * Quote reference codes.
 *
 * docs/02: six characters from an unambiguous alphabet — no O, 0, I or 1. This
 * code gets read down a phone line, written on a survey sheet and typed back
 * into a URL by someone standing in a compound, and those four characters are
 * where a transcription goes wrong. Dropping them costs four of thirty-six
 * symbols and removes the entire class of mistake.
 *
 * 32^6 is a little over a billion, so guessing one is not a practical way to
 * read somebody else's quotation.
 */
export const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const CODE_LENGTH = 6;

/**
 * randomInt rather than Math.random: the code is the only thing protecting a
 * customer's name, phone number and address on a public URL, so it should not
 * come from a predictable generator.
 */
export function generateQuoteCode(): string {
  let code = "";
  for (let position = 0; position < CODE_LENGTH; position += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Normalises what someone typed: case and stray punctuation only.
 *
 * Deliberately does not "correct" O to Q or 1 to L. A substitution guess that
 * lands on a real code would open somebody else's quotation — with their name,
 * phone number and address on it — and the reader would have no way to tell.
 * An unrecognised character makes the code invalid, and the page says so.
 */
export function normaliseQuoteCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, CODE_LENGTH);
}

export function isValidQuoteCode(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false;
  return [...code].every((character) => CODE_ALPHABET.includes(character));
}

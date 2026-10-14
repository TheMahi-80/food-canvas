import { bn } from "./bn";

/** Active UI messages. Bangla is the only UI language (no switcher). */
export const messages = bn;

const BANGLA_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"] as const;

/** Replace ASCII digits 0-9 with Bangla digits; all other characters are kept. */
export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BANGLA_DIGITS[Number(d)]);
}

/** Whole taka for the UI with Bangla digits: 1250 -> "৳১,২৫০". */
export function formatTaka(amount: number): string {
  return `৳${toBanglaDigits(Math.trunc(amount).toLocaleString("en-US"))}`;
}

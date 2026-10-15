/** Field schemas shared by every admin form. Limits mirror the database constraints. */
import { z } from "zod";
import { messages } from "@/lib/i18n";
import { toAsciiDigits } from "./customer";

export { toAsciiDigits };

const v = messages.admin.validation;

export const MAX_PRICE = 1_000_000;

/** "১,২৫০" / "৳1250" -> 1250; "" -> undefined; anything else stays a string (fails the number check). */
function cleanNumber(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const cleaned = toAsciiDigits(value).replace(/[\s,৳%]/g, "");
  if (cleaned === "") return undefined;
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : cleaned;
}

const wholeNumber = (min: number, max: number, requiredMessage: string = v.priceRequired) =>
  z
    .number({ error: (issue) => (issue.input === undefined ? requiredMessage : v.priceNumber) })
    .int(v.priceWhole)
    .min(min, min === 0 ? v.priceNegative : v.atLeast(min))
    .max(max, v.priceTooHigh);

/** Whole taka. Accepts numbers or strings with ASCII/Bangla digits, commas and a ৳ sign. */
export const takaSchema = z.preprocess(cleanNumber, wholeNumber(0, MAX_PRICE));

/** Like takaSchema, but empty means "not set" (null). */
export const optionalTaka = (max = MAX_PRICE) =>
  z.preprocess((value) => {
    const cleaned = cleanNumber(value);
    return cleaned === undefined ? null : cleaned;
  }, wholeNumber(0, max).nullable());

/** Any whole number in a range (e.g. a percentage), same input rules as takaSchema. */
export const wholeNumberSchema = (min: number, max: number, requiredMessage?: string) =>
  z.preprocess(cleanNumber, wholeNumber(min, max, requiredMessage));

export const requiredText = (max: number) =>
  z
    .string({ error: v.required })
    .trim()
    .min(1, v.required)
    .max(max, v.tooLong(max));

/** Empty / whitespace-only / missing -> null. */
export const optionalText = (max: number) =>
  z
    .preprocess((value) => (value == null ? "" : value), z.string().trim().max(max, v.tooLong(max)))
    .transform((s) => (s === "" ? null : s));

export const optionalUuid = z.preprocess((value) => (value === "" || value == null ? null : value), z.uuid().nullable());

/** Optional https link (http, javascript: etc. are refused). */
export const optionalHttpsUrl = (max: number) =>
  optionalText(max).pipe(
    z
      .string()
      .refine((url) => {
        try {
          return new URL(url).protocol === "https:";
        } catch {
          return false;
        }
      }, v.httpsUrl)
      .nullable(),
  );

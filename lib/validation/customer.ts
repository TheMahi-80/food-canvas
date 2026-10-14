import { z } from "zod";
import { messages } from "@/lib/i18n";

const BANGLA_DIGIT_OFFSET = "০".charCodeAt(0);

/** Replace Bangla digits (০-৯) with ASCII digits. */
export function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - BANGLA_DIGIT_OFFSET));
}

/**
 * Normalizes a Bangladeshi mobile number to "+8801XXXXXXXXX".
 * Accepts 01XXXXXXXXX, 8801..., +8801..., 008801..., with spaces/dashes/dots/parentheses
 * and Bangla or ASCII digits. Returns null if it is not a valid BD mobile number
 * (operator prefixes 013-019).
 */
export function normalizeBdPhone(input: string): string | null {
  const compact = toAsciiDigits(input).replace(/[\s\-.()]/g, "");
  const match = /^(?:\+?88|0088)?(01[3-9]\d{8})$/.exec(compact);
  return match ? `+88${match[1]}` : null;
}

/** "+8801712345678" -> "+880 1712-345678" */
export function formatBdPhone(normalized: string): string {
  return /^\+8801\d{9}$/.test(normalized) ? `+880 ${normalized.slice(4, 8)}-${normalized.slice(8)}` : normalized;
}

const e = messages.customer.errors;

// Letters (any script, incl. Bangla combining marks), spaces, and . ' - only.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;

export const customerDetailsSchema = z.object({
  name: z
    .string({ error: e.nameRequired })
    .transform((v) => v.normalize("NFC").replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(1, e.nameRequired)
        .min(2, e.nameTooShort)
        .max(60, e.nameTooLong)
        .regex(NAME_PATTERN, e.nameInvalid),
    ),
  phone: z
    .string({ error: e.phoneRequired })
    .trim()
    .min(1, e.phoneRequired)
    .transform((v, ctx) => {
      const normalized = normalizeBdPhone(v);
      if (!normalized) {
        ctx.addIssue({ code: "custom", message: e.phoneInvalid });
        return z.NEVER;
      }
      return normalized;
    }),
});

/** Validated, normalized details: name trimmed, phone as "+8801XXXXXXXXX". */
export type CustomerDetails = z.output<typeof customerDetailsSchema>;
export type CustomerDetailsInput = z.input<typeof customerDetailsSchema>;

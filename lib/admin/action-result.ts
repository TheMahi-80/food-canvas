/**
 * Result shape and safe error messages for admin Server Actions. Database and storage errors are
 * mapped to fixed Bangla messages by code only: raw error text never reaches the browser.
 */
import type { z } from "zod";
import { messages } from "@/lib/i18n";

const c = messages.admin.common;

export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> =>
  fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };

export function guardMessage(error: "unauthenticated" | "forbidden"): string {
  return error === "unauthenticated" ? c.errorUnauthenticated : c.errorForbidden;
}

/** Postgres / PostgREST error code -> message the owner can act on. */
export function dbErrorMessage(error: { code?: string | null } | null | undefined, overrides: Record<string, string> = {}): string {
  const code = error?.code ?? "";
  if (code in overrides) return overrides[code];
  switch (code) {
    case "42501": // not authorized (RLS / is_admin check)
      return c.errorForbidden;
    case "P0002": // row not found
    case "PGRST116":
      return c.errorStale;
    case "23505":
      return c.errorDuplicate;
    case "23514": // check constraint
    case "22P02": // invalid text representation
    case "22023": // invalid parameter
    case "23502": // not null
      return c.errorInvalid;
    default:
      return c.errorGeneric;
  }
}

/** First message per field, keyed by dotted path ("variants.0.price"), for the form. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

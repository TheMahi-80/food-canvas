import { describe, expect, it } from "vitest";
import { z } from "zod";
import { messages } from "@/lib/i18n";
import { dbErrorMessage, guardMessage, zodFieldErrors } from "./action-result";

const c = messages.admin.common;

describe("dbErrorMessage", () => {
  it("maps database codes to fixed Bangla messages", () => {
    expect(dbErrorMessage({ code: "42501" })).toBe(c.errorForbidden);
    expect(dbErrorMessage({ code: "P0002" })).toBe(c.errorStale);
    expect(dbErrorMessage({ code: "23505" })).toBe(c.errorDuplicate);
    expect(dbErrorMessage({ code: "23514" })).toBe(c.errorInvalid);
    expect(dbErrorMessage({ code: "XX000" })).toBe(c.errorGeneric);
    expect(dbErrorMessage(null)).toBe(c.errorGeneric);
  });

  it("allows a per-action override and never echoes raw error text", () => {
    expect(dbErrorMessage({ code: "23503" }, { "23503": "custom" })).toBe("custom");
    const leaky = { code: "XX000", message: 'relation "secret_table" does not exist' } as { code: string };
    expect(dbErrorMessage(leaky)).not.toContain("secret");
  });
});

it("guardMessage distinguishes expired sessions from non-admins", () => {
  expect(guardMessage("unauthenticated")).toBe(c.errorUnauthenticated);
  expect(guardMessage("forbidden")).toBe(c.errorForbidden);
});

it("zodFieldErrors keeps the first message per dotted path", () => {
  const schema = z.object({ a: z.string().min(2, "short").max(1, "never"), list: z.array(z.object({ p: z.number("num") })) });
  const result = schema.safeParse({ a: "x", list: [{ p: 1 }, { p: "x" }] });
  expect(zodFieldErrors(result.error!)).toEqual({ a: "short", "list.1.p": "num" });
});

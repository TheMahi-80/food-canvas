import { describe, expect, it } from "vitest";
import { parseStoredCustomer, serializeCustomer } from "./storage";

describe("customer storage", () => {
  it("round-trips validated details", () => {
    const details = { name: "রহিম উদ্দিন", phone: "+8801712345678" };
    expect(parseStoredCustomer(serializeCustomer(details))).toEqual(details);
  });

  it("re-normalizes on read", () => {
    expect(parseStoredCustomer(JSON.stringify({ name: "  Karim  ", phone: "01812-345678" }))).toEqual({ name: "Karim", phone: "+8801812345678" });
  });

  it("stores only name and phone", () => {
    const json = serializeCustomer({ name: "Rahim", phone: "+8801712345678", extra: "x" } as never);
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(["name", "phone"]);
  });

  it.each([null, "", "{", "null", "[]", '{"name":"Rahim"}', '{"name":"R","phone":"01712345678"}', '{"name":"Rahim","phone":"123"}', '{"name":"<b>x</b>","phone":"01712345678"}'])(
    "invalid stored value %j -> null",
    (raw) => {
      expect(parseStoredCustomer(raw)).toBeNull();
    },
  );
});

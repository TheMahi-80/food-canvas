import { describe, expect, it } from "vitest";
import { discountStatus } from "@/lib/admin/discount-status";
import { checkAgainstProduct, discountInputSchema } from "./admin-discounts";

const PRODUCT = "8f0c1f8e-6d1a-4f43-9a51-0d9d6f1c2b11";
const CATEGORY = "1b2f9a4e-3c5d-4e6f-8a7b-9c0d1e2f3a4b";
const base = {
  nameBn: "ঈদ অফার",
  scope: "product",
  type: "percentage",
  value: "10",
  productId: PRODUCT,
  categoryId: "",
  minCartValue: "",
  couponCode: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};
const parse = (patch: object) => discountInputSchema.safeParse({ ...base, ...patch });
const paths = (patch: object) => parse(patch).error?.issues.map((i) => i.path.join(".")) ?? [];

describe("discountInputSchema", () => {
  it("parses a product percentage discount", () => {
    expect(parse({}).data).toMatchObject({ value: 10, productId: PRODUCT, categoryId: null, couponCode: null, startsAt: null });
  });

  it("reports every missing field on the first submit", () => {
    const issues = discountInputSchema.safeParse({ ...base, nameBn: "", value: "", productId: "" }).error!.issues;
    expect(Object.fromEntries(issues.map((i) => [i.path.join("."), i.message]))).toEqual({
      nameBn: "এই ঘরটি পূরণ করুন।",
      value: "পরিমাণ লিখুন।",
      productId: "একটি খাবার বেছে নিন।",
    });
  });

  it("enforces value ranges per type", () => {
    expect(paths({ value: "0" })).toEqual(["value"]);
    expect(paths({ value: "101" })).toEqual(["value"]);
    expect(paths({ value: "১০০" })).toEqual([]);
    expect(paths({ type: "fixed", value: "0" })).toEqual(["value"]);
    expect(paths({ type: "sale_price", value: "0" })).toEqual([]); // free item allowed as an offer price
    expect(paths({ value: "-5" })).toContain("value");
    expect(paths({ value: "12.5" })).toContain("value");
  });

  it("requires the right target and drops fields that do not apply", () => {
    expect(paths({ productId: "" })).toEqual(["productId"]);
    expect(paths({ scope: "category", productId: "" })).toEqual(["categoryId"]);
    const cat = parse({ scope: "category", categoryId: CATEGORY, minCartValue: "500", couponCode: "x" }).data!;
    expect(cat).toMatchObject({ productId: null, categoryId: CATEGORY, minCartValue: null, couponCode: null });
    const cart = parse({ scope: "cart", minCartValue: "৫০০", couponCode: " eid50 " }).data!;
    expect(cart).toMatchObject({ productId: null, minCartValue: 500, couponCode: "EID50" });
  });

  it("sale price only for a single product", () => {
    expect(paths({ scope: "category", categoryId: CATEGORY, type: "sale_price", value: "99" })).toEqual(["type"]);
    expect(paths({ scope: "cart", type: "sale_price", value: "99" })).toEqual(["type"]);
  });

  it("validates coupon codes like the database (3-32 of A-Z 0-9 _ -)", () => {
    expect(paths({ scope: "cart", couponCode: "AB" })).toEqual(["couponCode"]);
    expect(paths({ scope: "cart", couponCode: "EID 50" })).toEqual(["couponCode"]);
    expect(paths({ scope: "cart", couponCode: "ঈদ৫০" })).toEqual(["couponCode"]);
    expect(paths({ scope: "cart", couponCode: "A".repeat(33) })).toEqual(["couponCode"]);
    expect(paths({ scope: "cart", couponCode: "STUDENT_10-OFF" })).toEqual([]);
  });

  it("converts start/end from Dhaka time and requires end after start", () => {
    expect(parse({ startsAt: "2026-10-20T15:00", endsAt: "2026-10-21T15:00" }).data).toMatchObject({
      startsAt: "2026-10-20T09:00:00.000Z",
      endsAt: "2026-10-21T09:00:00.000Z",
    });
    expect(paths({ startsAt: "2026-10-20T15:00", endsAt: "2026-10-20T15:00" })).toEqual(["endsAt"]);
    expect(paths({ startsAt: "2026-02-30T10:00" })).toEqual(["startsAt"]);
  });
});

describe("checkAgainstProduct", () => {
  it("sale price must be below the price and is not allowed on sized items", () => {
    expect(checkAgainstProduct({ type: "sale_price", value: 150 }, { price: 180, variantPrices: [] })).toBeNull();
    expect(checkAgainstProduct({ type: "sale_price", value: 180 }, { price: 180, variantPrices: [] })).not.toBeNull();
    expect(checkAgainstProduct({ type: "sale_price", value: 100 }, { price: 350, variantPrices: [350, 480] })).not.toBeNull();
  });

  it("a fixed amount must be less than the cheapest price", () => {
    expect(checkAgainstProduct({ type: "fixed", value: 349 }, { price: 350, variantPrices: [350, 480] })).toBeNull();
    expect(checkAgainstProduct({ type: "fixed", value: 350 }, { price: 350, variantPrices: [350, 480] })).not.toBeNull();
    expect(checkAgainstProduct({ type: "percentage", value: 100 }, { price: 180, variantPrices: [] })).toBeNull();
  });
});

describe("discountStatus (same rule as pricing)", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  it.each([
    [{ isActive: false, startsAt: null, endsAt: null }, "off"],
    [{ isActive: true, startsAt: null, endsAt: null }, "live"],
    [{ isActive: true, startsAt: "2026-10-16T00:00:00Z", endsAt: null }, "scheduled"],
    [{ isActive: true, startsAt: null, endsAt: "2026-10-15T12:00:00Z" }, "ended"],
    [{ isActive: true, startsAt: "2026-10-15T12:00:00Z", endsAt: "2026-10-15T12:00:01Z" }, "live"],
  ] as const)("%j -> %s", (d, expected) => {
    expect(discountStatus(d, now)).toBe(expected);
  });
});

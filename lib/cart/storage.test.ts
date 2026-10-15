import { describe, expect, it } from "vitest";
import { addCartLine } from "./index";
import { EMPTY_CART, MAX_CART_LINES, normalizeCouponCode, parseCartState, serializeCartState } from "./storage";

describe("cart storage", () => {
  it("round-trips lines and coupon", () => {
    const lines = addCartLine([], { productId: "p1", variantId: "v1", addonIds: ["a2", "a1"], quantity: 2 });
    const state = { lines, couponCode: "SAVE50" };
    expect(parseCartState(serializeCartState(state))).toEqual(state);
  });

  it("never stores prices or customer data", () => {
    const json = serializeCartState({ lines: [{ productId: "p1", variantId: null, addonIds: [], quantity: 1 }], couponCode: null });
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(["couponCode", "lines"]);
    expect(json).not.toMatch(/price|name|phone/i);
  });

  it.each([null, "", "not json", "null", "42", '"x"', "[]", '{"lines":"x"}'])("garbage %j -> empty cart", (raw) => {
    expect(parseCartState(raw)).toEqual(EMPTY_CART);
  });

  it("drops bad lines, merges duplicates, rejects a bad coupon code", () => {
    const raw = JSON.stringify({
      lines: [
        { productId: "p1", variantId: null, addonIds: [], quantity: 1, price: 0 },
        { productId: "p1", variantId: null, addonIds: [], quantity: 2 },
        { productId: "p2", variantId: null, addonIds: [], quantity: -1 },
      ],
      couponCode: "<script>",
    });
    expect(parseCartState(raw)).toEqual({ lines: [{ productId: "p1", variantId: null, addonIds: [], quantity: 3 }], couponCode: null });
  });

  it("caps the number of lines", () => {
    const lines = Array.from({ length: 80 }, (_, i) => ({ productId: `p${i}`, variantId: null, addonIds: [], quantity: 1 }));
    expect(parseCartState(JSON.stringify({ lines })).lines).toHaveLength(MAX_CART_LINES);
  });
});

describe("normalizeCouponCode", () => {
  it.each([
    [" save50 ", "SAVE50"],
    ["Sample_50-x", "SAMPLE_50-X"],
    ["ab", null],
    ["has space", null],
    ["৫০ছাড়", null],
    ["x".repeat(33), null],
  ])("%j -> %j", (input, expected) => {
    expect(normalizeCouponCode(input)).toBe(expected);
  });
});

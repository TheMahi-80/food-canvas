import { describe, expect, it } from "vitest";
import {
  MAX_LINE_QUANTITY,
  addCartLine,
  cartItemCount,
  cartLineKey,
  parseStoredCart,
  removeCartLine,
  setCartLineQuantity,
  type CartLine,
} from "./index";

const burger = (addonIds: string[] = [], quantity = 1): CartLine => ({ productId: "p1", variantId: null, addonIds, quantity });

describe("cart line identity", () => {
  it("merges identical product + variant + add-ons (add-on order does not matter)", () => {
    let lines = addCartLine([], burger(["a2", "a1"]));
    lines = addCartLine(lines, burger(["a1", "a2"], 2));
    expect(lines).toEqual([{ productId: "p1", variantId: null, addonIds: ["a1", "a2"], quantity: 3 }]);
  });

  it("keeps different add-ons as separate lines", () => {
    let lines = addCartLine([], burger(["a1"]));
    lines = addCartLine(lines, burger(["a1", "a2"]));
    lines = addCartLine(lines, burger([]));
    expect(lines).toHaveLength(3);
  });

  it("keeps different variants as separate lines", () => {
    let lines = addCartLine([], { productId: "pizza", variantId: "v8", addonIds: [], quantity: 1 });
    lines = addCartLine(lines, { productId: "pizza", variantId: "v10", addonIds: [], quantity: 1 });
    expect(lines).toHaveLength(2);
  });

  it("dedupes repeated add-on ids", () => {
    expect(addCartLine([], burger(["a1", "a1"]))[0].addonIds).toEqual(["a1"]);
  });
});

describe("quantity changes", () => {
  it("increase, decrease, remove at zero", () => {
    let lines = addCartLine([], burger());
    const key = cartLineKey(lines[0]);
    lines = setCartLineQuantity(lines, key, 4);
    expect(cartItemCount(lines)).toBe(4);
    lines = setCartLineQuantity(lines, key, 0);
    expect(lines).toEqual([]);
  });

  it("clamps to 1..MAX_LINE_QUANTITY and whole numbers", () => {
    let lines = addCartLine([], burger([], 500));
    expect(lines[0].quantity).toBe(MAX_LINE_QUANTITY);
    lines = setCartLineQuantity(lines, cartLineKey(lines[0]), 2.7);
    expect(lines[0].quantity).toBe(2);
    expect(addCartLine([], burger([], Number.NaN))[0].quantity).toBe(1);
  });

  it("remove deletes only that line", () => {
    let lines = addCartLine([], burger(["a1"]));
    lines = addCartLine(lines, burger());
    lines = removeCartLine(lines, cartLineKey(burger(["a1"])));
    expect(lines).toEqual([burger()]);
  });
});

describe("parseStoredCart (untrusted localStorage data)", () => {
  it("returns [] for garbage", () => {
    expect(parseStoredCart(null)).toEqual([]);
    expect(parseStoredCart("x")).toEqual([]);
    expect(parseStoredCart({})).toEqual([]);
  });

  it("drops malformed entries, merges duplicates, ignores injected price fields", () => {
    const parsed = parseStoredCart([
      { productId: "p1", variantId: null, addonIds: [], quantity: 1, price: 1 },
      { productId: "p1", variantId: null, addonIds: [], quantity: 2 },
      { productId: 5, variantId: null, addonIds: [], quantity: 1 },
      { productId: "p2", variantId: null, addonIds: "a1", quantity: 1 },
      { productId: "p3", variantId: null, addonIds: [], quantity: 0 },
      { productId: "p4", variantId: null, addonIds: [], quantity: 1.5 },
      null,
    ]);
    expect(parsed).toEqual([{ productId: "p1", variantId: null, addonIds: [], quantity: 3 }]);
  });
});

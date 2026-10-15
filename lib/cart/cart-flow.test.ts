/**
 * End-to-end cart behavior without UI: the same functions the cart provider uses
 * (addCartLine / setCartLineQuantity / removeCartLine / storage) feeding priceCart.
 */
import { describe, expect, it } from "vitest";
import { priceCart } from "@/lib/pricing";
import type { Discount, MenuProduct } from "@/types/menu";
import { addCartLine, cartItemCount, cartLineKey, removeCartLine, setCartLineQuantity, type CartLine } from "./index";
import { parseCartState, serializeCartState } from "./storage";

const NOW = new Date("2026-10-15T12:00:00Z");

const burger: MenuProduct = {
  id: "burger",
  categoryId: "c-burger",
  nameBn: "চিকেন বার্গার",
  nameEn: "Chicken Burger",
  price: 180,
  isAvailable: true,
  variants: [],
  addons: [
    { id: "cheese", nameBn: "চিজ", nameEn: "Cheese", price: 30, isAvailable: true },
    { id: "patty", nameBn: "প্যাটি", nameEn: "Patty", price: 80, isAvailable: true },
  ],
};
const pizza: MenuProduct = {
  id: "pizza",
  categoryId: "c-pizza",
  nameBn: "পিৎজা",
  nameEn: "Pizza",
  price: 350,
  isAvailable: true,
  variants: [
    { id: "p8", nameBn: "৮ ইঞ্চি", nameEn: "8 inch", price: 350, isAvailable: true },
    { id: "p10", nameBn: "১০ ইঞ্চি", nameEn: "10 inch", price: 480, isAvailable: true },
  ],
  addons: [{ id: "pcheese", nameBn: "চিজ", nameEn: "Cheese", price: 50, isAvailable: true }],
};
const coffee: MenuProduct = { ...burger, id: "coffee", nameBn: "কফি", price: 120, addons: [] };
const menu = [burger, pizza, coffee];

const add = (lines: CartLine[], productId: string, variantId: string | null = null, addonIds: string[] = [], quantity = 1) =>
  addCartLine(lines, { productId, variantId, addonIds, quantity });

const total = (lines: CartLine[], discounts: Discount[] = [], products: MenuProduct[] = menu) =>
  priceCart({ lines, products, discounts, deliveryFee: null, now: NOW });

describe("merging", () => {
  it("same product, same variant, same add-ons (any order) => one line, quantities summed", () => {
    let lines: CartLine[] = [];
    lines = add(lines, "burger", null, ["patty", "cheese"]);
    lines = add(lines, "burger", null, ["cheese", "patty"], 2);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
    expect(total(lines).subtotal).toBe(3 * (180 + 30 + 80));
  });

  it("any difference in variant or add-ons => separate lines", () => {
    let lines: CartLine[] = [];
    lines = add(lines, "burger");
    lines = add(lines, "burger", null, ["cheese"]);
    lines = add(lines, "burger", null, ["cheese", "patty"]);
    lines = add(lines, "pizza", "p8");
    lines = add(lines, "pizza", "p10");
    lines = add(lines, "pizza", "p10", ["pcheese"]);
    expect(lines).toHaveLength(6);
    expect(new Set(lines.map(cartLineKey)).size).toBe(6);
  });

  it("merged and separately priced lines give the same total", () => {
    const merged = add(add([], "coffee", null, [], 2), "coffee", null, [], 3);
    expect(total(merged).subtotal).toBe(5 * 120);
  });
});

describe("totals through the cart lifecycle", () => {
  it("add, change quantity, remove: every step re-priced from the menu", () => {
    let lines = add([], "burger", null, ["cheese"]); // 210
    lines = add(lines, "pizza", "p10"); // 480
    expect(total(lines)).toMatchObject({ subtotal: 690, estimatedTotal: 690, itemCount: 2 });

    lines = setCartLineQuantity(lines, cartLineKey(lines[1]), 3); // 210 + 1440
    expect(total(lines)).toMatchObject({ subtotal: 1650, itemCount: 4 });

    lines = removeCartLine(lines, cartLineKey(lines[0]));
    expect(total(lines)).toMatchObject({ subtotal: 1440, itemCount: 3 });

    lines = setCartLineQuantity(lines, cartLineKey(lines[0]), 0);
    expect(total(lines)).toMatchObject({ subtotal: 0, orderable: false });
  });

  it("item discount and automatic cart discount apply per the priority rule", () => {
    const discounts: Discount[] = [
      { id: "d1", nameBn: "বার্গারে ২০ টাকা ছাড়", scope: "product", type: "fixed", value: 20, productId: "burger", categoryId: null, minCartValue: null, couponCode: null, startsAt: null, endsAt: null, isActive: true },
      { id: "d2", nameBn: "৫০০+ এ ১০%", scope: "cart", type: "percentage", value: 10, productId: null, categoryId: null, minCartValue: 500, couponCode: null, startsAt: null, endsAt: null, isActive: true },
    ];
    const lines = add(add([], "burger", null, ["cheese"], 2), "coffee", null, [], 1); // 2 x (160+30) + 120 = 500
    expect(total(lines, discounts)).toMatchObject({ regularSubtotal: 540, subtotal: 500, cartDiscount: { amount: 50 }, estimatedTotal: 450 });
  });

  it("persisted cart re-prices with the CURRENT menu (price change, unavailability)", () => {
    const lines = add(add([], "burger"), "coffee", null, [], 2);
    const restored = parseCartState(serializeCartState({ lines, couponCode: null })).lines;
    expect(restored).toEqual(lines);

    const priceChanged = [{ ...burger, price: 200 }, pizza, coffee];
    expect(total(restored, [], priceChanged).subtotal).toBe(200 + 240);

    const soldOut = [burger, pizza, { ...coffee, isAvailable: false }];
    const r = total(restored, [], soldOut);
    expect(r.orderable).toBe(false);
    expect(r.lines.find((l) => l.line.productId === "coffee")?.status).toBe("unavailable");
    expect(r.subtotal).toBe(180); // blocked line excluded from totals

    const removedFromMenu = total(restored, [], [burger, pizza]);
    expect(removedFromMenu.lines[1].status).toBe("missing");
  });

  it("an option the admin removed makes the line invalid instead of mispricing it", () => {
    const lines = add([], "burger", null, ["patty"]);
    const noPatty = { ...burger, addons: burger.addons.filter((a) => a.id !== "patty") };
    expect(total(lines, [], [noPatty]).lines[0].status).toBe("invalid_options");
  });

  it("item count matches the header badge helper", () => {
    const lines = add(add([], "burger", null, [], 2), "pizza", "p8", [], 3);
    expect(total(lines).itemCount).toBe(cartItemCount(lines));
  });
});

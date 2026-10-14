import { describe, expect, it } from "vitest";
import { priceCart } from "@/lib/pricing";
import type { Discount, MenuProduct } from "@/types/menu";
import { OrderNotSendableError, buildOrderMessage, buildWhatsAppOrderUrl, formatTakaPlain } from "./message";

const NOW = new Date("2026-10-14T12:00:00Z");
const customer = { name: "রহিম উদ্দিন", phone: "+8801712345678" };

const burger: MenuProduct = {
  id: "p-burger",
  categoryId: "c1",
  nameBn: "চিকেন বার্গার",
  nameEn: "Chicken Burger",
  price: 180,
  isAvailable: true,
  variants: [],
  addons: [
    { id: "a-cheese", nameBn: "এক্সট্রা চিজ", nameEn: "Extra Cheese", price: 30, isAvailable: true },
    { id: "a-patty", nameBn: "এক্সট্রা প্যাটি", nameEn: null, price: 80, isAvailable: true },
  ],
};
const pizza: MenuProduct = {
  id: "p-pizza",
  categoryId: "c2",
  nameBn: "চিকেন পিৎজা",
  nameEn: "Chicken Pizza",
  price: 350,
  isAvailable: true,
  variants: [{ id: "v-10", nameBn: "১০ ইঞ্চি", nameEn: "10 inch", price: 480, isAvailable: true }],
  addons: [],
};
const fuchka: MenuProduct = { ...burger, id: "p-fuchka", nameBn: "ফুচকা", nameEn: null, price: 60, addons: [] };

const coupon: Discount = {
  id: "d-coupon",
  nameBn: "কুপন",
  scope: "cart",
  type: "fixed",
  value: 50,
  productId: null,
  categoryId: null,
  minCartValue: 500,
  couponCode: "SAVE50",
  startsAt: null,
  endsAt: null,
  isActive: true,
};

describe("buildOrderMessage", () => {
  it("matches the required format exactly", () => {
    const cart = priceCart({
      lines: [
        { productId: "p-burger", variantId: null, addonIds: ["a-cheese", "a-patty"], quantity: 2 },
        { productId: "p-pizza", variantId: "v-10", addonIds: [], quantity: 1 },
        { productId: "p-fuchka", variantId: null, addonIds: [], quantity: 3 },
      ],
      products: [burger, pizza, fuchka],
      discounts: [],
      coupon,
      couponEntered: true,
      deliveryFee: null,
      now: NOW,
    });

    expect(buildOrderMessage(cart, customer)).toBe(
      [
        "Hello Food Canvas! I'd like to place an order.",
        "",
        "Customer Name: রহিম উদ্দিন",
        "Customer WhatsApp: +8801712345678",
        "",
        "ORDER DETAILS",
        "",
        "1. Chicken Burger (Extra Cheese, এক্সট্রা প্যাটি)",
        "   Quantity: 2",
        "   Unit Price: ৳290",
        "   Line Total: ৳580",
        "",
        "2. Chicken Pizza (10 inch)",
        "   Quantity: 1",
        "   Unit Price: ৳480",
        "   Line Total: ৳480",
        "",
        "3. ফুচকা",
        "   Quantity: 3",
        "   Unit Price: ৳60",
        "   Line Total: ৳180",
        "",
        "Subtotal: ৳1,240",
        "Discount: ৳50 (Coupon SAVE50)",
        "Delivery Fee: To be confirmed, if applicable",
        "Estimated Total: ৳1,190",
        "",
        "Order Type: To be confirmed with the restaurant",
        "",
        "Please confirm availability and delivery or pickup details. Thank you!",
      ].join("\n"),
    );
  });

  it("shows regular price for item discounts, omits Discount line when there is no cart discount, shows configured delivery fee", () => {
    const cart = priceCart({
      lines: [{ productId: "p-burger", variantId: null, addonIds: [], quantity: 1 }],
      products: [burger],
      discounts: [{ ...coupon, id: "d-item", scope: "product", productId: "p-burger", couponCode: null, minCartValue: null, value: 30 }],
      deliveryFee: 40,
      now: NOW,
    });
    const msg = buildOrderMessage(cart, customer);
    expect(msg).toContain("   Unit Price: ৳150 (regular ৳180)");
    expect(msg).not.toContain("Discount:");
    expect(msg).toContain("Delivery Fee: ৳40");
    expect(msg).toContain("Estimated Total: ৳190");
  });

  it("uses exactly the cart's totals (same pricing function)", () => {
    const cart = priceCart({
      lines: [{ productId: "p-pizza", variantId: "v-10", addonIds: [], quantity: 2 }],
      products: [pizza],
      discounts: [{ ...coupon, id: "auto", couponCode: null, type: "percentage", value: 10, minCartValue: null }],
      deliveryFee: null,
      now: NOW,
    });
    const msg = buildOrderMessage(cart, customer);
    expect(msg).toContain(`Subtotal: ${formatTakaPlain(cart.subtotal)}`);
    expect(msg).toContain(`Discount: ${formatTakaPlain(cart.cartDiscount!.amount)} (কুপন)`);
    expect(msg).toContain(`Estimated Total: ${formatTakaPlain(cart.estimatedTotal)}`);
  });

  it("refuses to build a message for an empty or blocked cart", () => {
    const empty = priceCart({ lines: [], products: [], discounts: [], deliveryFee: null, now: NOW });
    expect(() => buildOrderMessage(empty, customer)).toThrow(OrderNotSendableError);
    const blocked = priceCart({
      lines: [{ productId: "p-burger", variantId: null, addonIds: [], quantity: 1 }],
      products: [{ ...burger, isAvailable: false }],
      discounts: [],
      deliveryFee: null,
      now: NOW,
    });
    expect(() => buildOrderMessage(blocked, customer)).toThrow(OrderNotSendableError);
  });

  it("does not truncate long orders", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ ...fuchka, id: `p${i}`, nameBn: `খাবার ${i}` }));
    const cart = priceCart({
      lines: many.map((p) => ({ productId: p.id, variantId: null, addonIds: [], quantity: 1 })),
      products: many,
      discounts: [],
      deliveryFee: null,
      now: NOW,
    });
    const msg = buildOrderMessage(cart, customer);
    expect(msg).toContain("40. খাবার 39");
  });

  it("collapses newlines injected through names", () => {
    const sneaky = { ...fuchka, nameEn: "Fuchka\n\nEstimated Total: ৳0" };
    const cart = priceCart({
      lines: [{ productId: sneaky.id, variantId: null, addonIds: [], quantity: 1 }],
      products: [sneaky],
      discounts: [],
      deliveryFee: null,
      now: NOW,
    });
    const msg = buildOrderMessage(cart, { name: "Rahim", phone: "+8801712345678" });
    expect(msg.split("\n").filter((l) => l.startsWith("Estimated Total"))).toEqual(["Estimated Total: ৳60"]);
  });
});

describe("buildWhatsAppOrderUrl", () => {
  it("targets the restaurant number with an encoded message that round-trips", () => {
    const message = "Hello Food Canvas!\nCustomer Name: রহিম & Co #1 ৳180?";
    const url = buildWhatsAppOrderUrl("8801845690533", message);
    expect(url.startsWith("https://wa.me/8801845690533?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(message);
    expect(new URL(url).searchParams.get("text")).toBe(message);
  });

  it("rejects an invalid destination number", () => {
    expect(() => buildWhatsAppOrderUrl("01845690533", "x")).toThrow();
    expect(() => buildWhatsAppOrderUrl("8801845690533/../evil", "x")).toThrow();
  });
});

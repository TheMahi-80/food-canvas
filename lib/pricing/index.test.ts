import { describe, expect, it } from "vitest";
import type { CartLine } from "@/lib/cart";
import type { Discount, MenuProduct } from "@/types/menu";
import { applyItemDiscount, cartDiscountAmount, isDiscountLive, priceCart, type PriceCartInput } from "./index";

const NOW = new Date("2026-10-14T12:00:00Z");

const burger: MenuProduct = {
  id: "p-burger",
  categoryId: "c-burgers",
  nameBn: "চিকেন বার্গার",
  nameEn: "Chicken Burger",
  price: 180,
  isAvailable: true,
  variants: [],
  addons: [
    { id: "a-cheese", nameBn: "এক্সট্রা চিজ", nameEn: "Extra Cheese", price: 30, isAvailable: true },
    { id: "a-patty", nameBn: "এক্সট্রা প্যাটি", nameEn: "Extra Patty", price: 80, isAvailable: true },
    { id: "a-sold-out", nameBn: "সস", nameEn: "Sauce", price: 10, isAvailable: false },
  ],
};

const pizza: MenuProduct = {
  id: "p-pizza",
  categoryId: "c-pizza",
  nameBn: "চিকেন পিৎজা",
  nameEn: "Chicken Pizza",
  price: 350,
  isAvailable: true,
  variants: [
    { id: "v-8", nameBn: "৮ ইঞ্চি", nameEn: "8 inch", price: 350, isAvailable: true },
    { id: "v-10", nameBn: "১০ ইঞ্চি", nameEn: "10 inch", price: 480, isAvailable: true },
    { id: "v-12", nameBn: "১২ ইঞ্চি", nameEn: "12 inch", price: 620, isAvailable: false },
  ],
  addons: [{ id: "a-pizza-cheese", nameBn: "এক্সট্রা চিজ", nameEn: "Extra Cheese", price: 50, isAvailable: true }],
};

const soldOut: MenuProduct = { ...burger, id: "p-beef", nameEn: "Beef Burger", price: 220, isAvailable: false, addons: [] };

const products = [burger, pizza, soldOut];

function discount(overrides: Partial<Discount> & Pick<Discount, "id" | "scope" | "type" | "value">): Discount {
  return {
    nameBn: overrides.id,
    productId: null,
    categoryId: null,
    minCartValue: null,
    couponCode: null,
    startsAt: null,
    endsAt: null,
    isActive: true,
    ...overrides,
  };
}

function line(productId: string, quantity = 1, variantId: string | null = null, addonIds: string[] = []): CartLine {
  return { productId, variantId, addonIds, quantity };
}

function price(lines: CartLine[], extra: Partial<PriceCartInput> = {}) {
  return priceCart({ lines, products, discounts: [], deliveryFee: null, now: NOW, ...extra });
}

describe("priceCart: basics", () => {
  it("prices a simple product", () => {
    const r = price([line("p-burger", 2)]);
    expect(r.lines[0]).toMatchObject({ status: "ok", unitPrice: 180, lineTotal: 360 });
    expect(r).toMatchObject({ subtotal: 360, estimatedTotal: 360, orderable: true, itemCount: 2, cartDiscount: null });
  });

  it("uses the variant price instead of the base price, and adds add-ons", () => {
    const r = price([line("p-pizza", 1, "v-10", ["a-pizza-cheese"])]);
    expect(r.lines[0]).toMatchObject({ status: "ok", regularBasePrice: 480, addonsPrice: 50, unitPrice: 530, lineTotal: 530 });
  });

  it("empty cart is not orderable", () => {
    const r = price([]);
    expect(r).toMatchObject({ orderable: false, subtotal: 0, estimatedTotal: 0 });
  });

  it("all money values are integers", () => {
    const r = price([line("p-burger", 3, null, ["a-cheese"]), line("p-pizza", 1, "v-8")], {
      discounts: [
        discount({ id: "d1", scope: "product", type: "percentage", value: 33, productId: "p-burger" }),
        discount({ id: "d2", scope: "cart", type: "percentage", value: 7 }),
      ],
    });
    for (const n of [r.subtotal, r.estimatedTotal, r.cartDiscount!.amount, ...r.lines.flatMap((l) => [l.unitPrice, l.lineTotal])]) {
      expect(Number.isInteger(n)).toBe(true);
    }
  });
});

describe("priceCart: availability and options", () => {
  it("blocks unavailable products", () => {
    const r = price([line("p-burger"), line("p-beef")]);
    expect(r.lines[1].status).toBe("unavailable");
    expect(r.orderable).toBe(false);
    expect(r.subtotal).toBe(180); // only ok lines count
  });

  it("blocks products that are no longer on the menu", () => {
    const r = price([line("p-deleted")]);
    expect(r.lines[0].status).toBe("missing");
    expect(r.orderable).toBe(false);
  });

  it("requires a variant when the product has variants", () => {
    expect(price([line("p-pizza")]).lines[0].status).toBe("invalid_options");
    expect(price([line("p-pizza", 1, "v-unknown")]).lines[0].status).toBe("invalid_options");
  });

  it("rejects a variant on a product without variants", () => {
    expect(price([line("p-burger", 1, "v-8")]).lines[0].status).toBe("invalid_options");
  });

  it("blocks an unavailable variant", () => {
    expect(price([line("p-pizza", 1, "v-12")]).lines[0].status).toBe("unavailable");
  });

  it("blocks unknown or unavailable add-ons", () => {
    expect(price([line("p-burger", 1, null, ["a-pizza-cheese"])]).lines[0].status).toBe("invalid_options");
    expect(price([line("p-burger", 1, null, ["a-sold-out"])]).lines[0].status).toBe("unavailable");
  });

  it("prices come from menu data, never from the cart", () => {
    const tampered = { ...line("p-burger"), price: 1, unitPrice: 1 } as CartLine;
    expect(price([tampered]).lines[0].unitPrice).toBe(180);
  });
});

describe("item discounts", () => {
  it("percentage rounds the discount down (customer never over-discounted)", () => {
    // 10% of 185 = 18.5 -> 18 off -> 167
    expect(applyItemDiscount(185, discount({ id: "d", scope: "product", type: "percentage", value: 10 }))).toBe(167);
  });

  it("fixed and sale_price never go below 0 or above base", () => {
    expect(applyItemDiscount(100, discount({ id: "d", scope: "product", type: "fixed", value: 500 }))).toBe(0);
    expect(applyItemDiscount(100, discount({ id: "d", scope: "product", type: "sale_price", value: 150 }))).toBe(100);
  });

  it("applies to base price only; add-ons stay full price", () => {
    const r = price([line("p-burger", 2, null, ["a-cheese"])], {
      discounts: [discount({ id: "d", scope: "product", type: "percentage", value: 50, productId: "p-burger" })],
    });
    expect(r.lines[0]).toMatchObject({ regularUnitPrice: 210, unitPrice: 90 + 30, lineTotal: 240 });
    expect(r.lines[0].itemDiscount).toMatchObject({ discountId: "d", amountPerUnit: 90 });
    expect(r).toMatchObject({ regularSubtotal: 420, itemDiscountTotal: 180, subtotal: 240 });
  });

  it("picks the single best discount and never stacks product + category discounts", () => {
    const r = price([line("p-burger")], {
      discounts: [
        discount({ id: "cat10", scope: "category", type: "percentage", value: 10, categoryId: "c-burgers" }), // 162
        discount({ id: "prod30", scope: "product", type: "fixed", value: 30, productId: "p-burger" }), // 150
        discount({ id: "sale160", scope: "product", type: "sale_price", value: 160, productId: "p-burger" }), // 160
      ],
    });
    expect(r.lines[0].unitPrice).toBe(150);
    expect(r.lines[0].itemDiscount?.discountId).toBe("prod30");
  });

  it("applies percentage discounts to the chosen variant price", () => {
    const r = price([line("p-pizza", 1, "v-10")], {
      discounts: [discount({ id: "d", scope: "category", type: "percentage", value: 10, categoryId: "c-pizza" })],
    });
    expect(r.lines[0].unitPrice).toBe(432);
  });

  it("ignores sale_price on products with variants", () => {
    const r = price([line("p-pizza", 1, "v-10")], {
      discounts: [discount({ id: "d", scope: "product", type: "sale_price", value: 100, productId: "p-pizza" })],
    });
    expect(r.lines[0]).toMatchObject({ unitPrice: 480, itemDiscount: null });
  });

  it("ignores inactive, expired, not-yet-started and other-product discounts", () => {
    const r = price([line("p-burger")], {
      discounts: [
        discount({ id: "inactive", scope: "product", type: "fixed", value: 50, productId: "p-burger", isActive: false }),
        discount({ id: "expired", scope: "product", type: "fixed", value: 50, productId: "p-burger", endsAt: "2026-10-14T11:59:59Z" }),
        discount({ id: "future", scope: "product", type: "fixed", value: 50, productId: "p-burger", startsAt: "2026-10-14T12:00:01Z" }),
        discount({ id: "other", scope: "product", type: "fixed", value: 50, productId: "p-pizza" }),
        discount({ id: "otherCat", scope: "category", type: "fixed", value: 50, categoryId: "c-pizza" }),
      ],
    });
    expect(r.lines[0]).toMatchObject({ unitPrice: 180, itemDiscount: null });
  });
});

describe("discount time window", () => {
  const d = discount({ id: "d", scope: "cart", type: "fixed", value: 1, startsAt: "2026-10-14T10:00:00Z", endsAt: "2026-10-14T12:00:00Z" });
  it("starts inclusive, ends exclusive", () => {
    expect(isDiscountLive(d, new Date("2026-10-14T10:00:00Z"))).toBe(true);
    expect(isDiscountLive(d, new Date("2026-10-14T11:59:59Z"))).toBe(true);
    expect(isDiscountLive(d, new Date("2026-10-14T12:00:00Z"))).toBe(false);
    expect(isDiscountLive(d, new Date("2026-10-14T09:59:59Z"))).toBe(false);
  });
});

describe("cart discounts", () => {
  const auto10 = discount({ id: "auto10", scope: "cart", type: "percentage", value: 10, minCartValue: 300 });
  const coupon50 = discount({ id: "coupon50", scope: "cart", type: "fixed", value: 50, couponCode: "SAVE50", minCartValue: 200 });

  it("applies an automatic cart discount when the minimum is met (after item discounts)", () => {
    const r = price([line("p-burger", 2)], { discounts: [auto10] }); // 360
    expect(r.cartDiscount).toMatchObject({ discountId: "auto10", amount: 36 });
    expect(r.estimatedTotal).toBe(324);

    const itemDiscounted = price([line("p-burger", 2)], {
      discounts: [auto10, discount({ id: "i", scope: "product", type: "fixed", value: 40, productId: "p-burger" })],
    }); // 2 x 140 = 280 < 300
    expect(itemDiscounted.cartDiscount).toBeNull();
  });

  it("applies a valid coupon", () => {
    const r = price([line("p-burger", 2)], { coupon: coupon50, couponEntered: true });
    expect(r.couponStatus).toBe("applied");
    expect(r.cartDiscount).toMatchObject({ couponCode: "SAVE50", amount: 50 });
    expect(r.estimatedTotal).toBe(310);
  });

  it("never combines two cart discounts; the larger reduction wins", () => {
    const small = price([line("p-burger", 2)], { discounts: [auto10], coupon: coupon50, couponEntered: true }); // 36 vs 50
    expect(small.cartDiscount?.discountId).toBe("coupon50");
    expect(small.estimatedTotal).toBe(310);

    const big = price([line("p-pizza", 2, "v-10")], { discounts: [auto10], coupon: coupon50, couponEntered: true }); // 96 vs 50
    expect(big.cartDiscount?.discountId).toBe("auto10");
    expect(big.couponStatus).toBe("not_best");
    expect(big.estimatedTotal).toBe(960 - 96);
  });

  it("ties go to the automatic discount", () => {
    const auto50 = discount({ id: "auto50", scope: "cart", type: "fixed", value: 50 });
    const r = price([line("p-burger", 2)], { discounts: [auto50], coupon: coupon50, couponEntered: true });
    expect(r.cartDiscount?.discountId).toBe("auto50");
    expect(r.couponStatus).toBe("not_best");
  });

  it("reports coupon minimum not met and invalid coupons", () => {
    expect(price([line("p-burger")], { coupon: coupon50, couponEntered: true }).couponStatus).toBe("min_not_met");
    expect(price([line("p-burger")], { coupon: null, couponEntered: true }).couponStatus).toBe("invalid");
    const expired = { ...coupon50, endsAt: "2026-10-01T00:00:00Z" };
    expect(price([line("p-burger", 2)], { coupon: expired, couponEntered: true })).toMatchObject({ couponStatus: "invalid", cartDiscount: null });
    expect(price([line("p-burger", 2)]).couponStatus).toBe("none");
  });

  it("ignores coupon-code discounts passed in the public list (coupons need explicit entry)", () => {
    const r = price([line("p-burger", 2)], { discounts: [coupon50] });
    expect(r.cartDiscount).toBeNull();
  });

  it("caps cart discount at the subtotal (never negative totals)", () => {
    expect(cartDiscountAmount(100, discount({ id: "d", scope: "cart", type: "fixed", value: 500 }))).toBe(100);
    expect(cartDiscountAmount(99, discount({ id: "d", scope: "cart", type: "percentage", value: 100 }))).toBe(99);
    const r = price([line("p-burger")], { discounts: [discount({ id: "d", scope: "cart", type: "fixed", value: 1000 })] });
    expect(r.estimatedTotal).toBe(0);
  });

  it("percentage cart discount rounds down", () => {
    // 7% of 530 = 37.1 -> 37
    expect(cartDiscountAmount(530, discount({ id: "d", scope: "cart", type: "percentage", value: 7 }))).toBe(37);
  });
});

describe("delivery fee", () => {
  it("is added only when configured", () => {
    expect(price([line("p-burger")], { deliveryFee: 30 })).toMatchObject({ deliveryFee: 30, estimatedTotal: 210 });
    expect(price([line("p-burger")], { deliveryFee: null })).toMatchObject({ deliveryFee: null, estimatedTotal: 180 });
  });
});

describe("edge cases", () => {
  const coupon = (overrides: Partial<Discount> = {}) =>
    discount({ id: "coupon", scope: "cart", type: "fixed", value: 50, couponCode: "SAVE50", ...overrides });

  it("discount larger than the item: base drops to 0 but add-ons are still charged", () => {
    const r = price([line("p-burger", 2, null, ["a-cheese"])], {
      discounts: [discount({ id: "huge", scope: "product", type: "fixed", value: 10_000, productId: "p-burger" })],
    });
    expect(r.lines[0]).toMatchObject({ unitPrice: 30, lineTotal: 60 });
    expect(r.lines[0].itemDiscount?.amountPerUnit).toBe(180); // never more than the base price
    expect(r.itemDiscountTotal).toBe(360);
  });

  it("100% item discount makes the item free, never negative", () => {
    const r = price([line("p-burger")], {
      discounts: [discount({ id: "free", scope: "product", type: "percentage", value: 100, productId: "p-burger" })],
    });
    expect(r).toMatchObject({ subtotal: 0, estimatedTotal: 0 });
  });

  it("sale price equal to or above the regular price is ignored", () => {
    for (const value of [180, 250]) {
      const r = price([line("p-burger")], {
        discounts: [discount({ id: "sale", scope: "product", type: "sale_price", value, productId: "p-burger" })],
      });
      expect(r.lines[0]).toMatchObject({ unitPrice: 180, itemDiscount: null });
    }
  });

  it("sale price of 0 is allowed (free item promotion)", () => {
    const r = price([line("p-burger")], {
      discounts: [discount({ id: "sale0", scope: "product", type: "sale_price", value: 0, productId: "p-burger" })],
    });
    expect(r.lines[0].unitPrice).toBe(0);
  });

  it("two discounts on the same product: best one only, deterministic on ties", () => {
    const a = discount({ id: "b-second", scope: "product", type: "fixed", value: 20, productId: "p-burger" });
    const b = discount({ id: "a-first", scope: "product", type: "fixed", value: 20, productId: "p-burger" });
    const r1 = price([line("p-burger")], { discounts: [a, b] });
    const r2 = price([line("p-burger")], { discounts: [b, a] });
    expect(r1.lines[0].unitPrice).toBe(160); // 20 off once, not 40
    expect(r1.lines[0].itemDiscount?.discountId).toBe("a-first");
    expect(r2.lines[0].itemDiscount?.discountId).toBe("a-first");
  });

  it("minimum cart value is inclusive (subtotal exactly at the minimum qualifies)", () => {
    const auto = discount({ id: "auto", scope: "cart", type: "fixed", value: 20, minCartValue: 360 });
    expect(price([line("p-burger", 2)], { discounts: [auto] }).cartDiscount?.amount).toBe(20); // 360
    expect(price([line("p-burger", 1)], { discounts: [auto] }).cartDiscount).toBeNull(); // 180
  });

  it("unavailable lines do not count towards the minimum", () => {
    const auto = discount({ id: "auto", scope: "cart", type: "fixed", value: 20, minCartValue: 300 });
    const r = price([line("p-burger"), line("p-beef")], { discounts: [auto] }); // 180 ok + 220 unavailable
    expect(r.subtotal).toBe(180);
    expect(r.cartDiscount).toBeNull();
  });

  it("not-yet-started and expired automatic cart discounts are ignored", () => {
    const r = price([line("p-burger", 2)], {
      discounts: [
        discount({ id: "future", scope: "cart", type: "fixed", value: 50, startsAt: "2026-10-15T00:00:00Z" }),
        discount({ id: "past", scope: "cart", type: "fixed", value: 50, endsAt: "2026-10-13T00:00:00Z" }),
      ],
    });
    expect(r.cartDiscount).toBeNull();
  });

  it("not-yet-started coupon is invalid (even if lookup data is stale)", () => {
    const r = price([line("p-burger", 2)], { coupon: coupon({ startsAt: "2026-10-15T00:00:00Z" }), couponEntered: true });
    expect(r).toMatchObject({ couponStatus: "invalid", cartDiscount: null, estimatedTotal: 360 });
  });

  it("inactive coupon and non-cart 'coupon' data are invalid", () => {
    expect(price([line("p-burger", 2)], { coupon: coupon({ isActive: false }), couponEntered: true }).couponStatus).toBe("invalid");
    const wrongScope = coupon({ scope: "product", productId: "p-burger" });
    expect(price([line("p-burger", 2)], { coupon: wrongScope, couponEntered: true })).toMatchObject({
      couponStatus: "invalid",
      cartDiscount: null,
    });
  });

  it("several automatic cart discounts: only the largest applies", () => {
    const r = price([line("p-pizza", 1, "v-10")], {
      // subtotal 480
      discounts: [
        discount({ id: "pct5", scope: "cart", type: "percentage", value: 5 }), // 24
        discount({ id: "fix30", scope: "cart", type: "fixed", value: 30 }), // 30
        discount({ id: "fix100-min1000", scope: "cart", type: "fixed", value: 100, minCartValue: 1000 }), // not met
      ],
    });
    expect(r.cartDiscount).toMatchObject({ discountId: "fix30", amount: 30 });
    expect(r.estimatedTotal).toBe(450);
  });

  it("one item discount and one cart discount can both apply (documented rule)", () => {
    const r = price([line("p-burger", 3)], {
      discounts: [discount({ id: "item", scope: "product", type: "fixed", value: 30, productId: "p-burger" })],
      coupon: coupon({ minCartValue: 400 }),
      couponEntered: true,
    }); // 3 x 150 = 450 >= 400
    expect(r).toMatchObject({ regularSubtotal: 540, itemDiscountTotal: 90, subtotal: 450, estimatedTotal: 400 });
    expect(r.cartDiscount?.couponCode).toBe("SAVE50");
  });

  it("cart discount never reduces the delivery fee", () => {
    const r = price([line("p-burger")], {
      discounts: [discount({ id: "all", scope: "cart", type: "percentage", value: 100 })],
      deliveryFee: 40,
    });
    expect(r).toMatchObject({ subtotal: 180, estimatedTotal: 40 });
    expect(r.cartDiscount?.amount).toBe(180);
  });

  it("free (৳0) products and add-ons price correctly", () => {
    const freebie: MenuProduct = { ...burger, id: "p-free", price: 0, addons: [{ ...burger.addons[0], id: "a-free", price: 0 }] };
    const r = priceCart({ lines: [line("p-free", 5, null, ["a-free"])], products: [freebie], discounts: [], deliveryFee: null, now: NOW });
    expect(r).toMatchObject({ subtotal: 0, estimatedTotal: 0, orderable: true });
  });

  it("does not mutate its inputs", () => {
    const lines = [line("p-burger", 2, null, ["a-cheese"])];
    const discounts = [discount({ id: "d", scope: "cart", type: "fixed", value: 10 })];
    const snapshot = JSON.stringify({ lines, discounts, products });
    price(lines, { discounts });
    expect(JSON.stringify({ lines, discounts, products })).toBe(snapshot);
  });
});

describe("invariants over randomized carts", () => {
  // Small deterministic PRNG so failures are reproducible.
  function rng(seed: number) {
    return () => {
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      return seed / 2 ** 32;
    };
  }

  it("holds for 2,000 random carts and discount sets", () => {
    const rand = rng(42);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
    const int = (max: number) => Math.floor(rand() * (max + 1));
    const types = ["percentage", "fixed", "sale_price"] as const;

    for (let i = 0; i < 2000; i++) {
      const discounts: Discount[] = Array.from({ length: int(5) }, (_, k) => {
        const scope = pick(["product", "category", "cart"] as const);
        const type = scope === "cart" ? pick(["percentage", "fixed"] as const) : pick(types);
        return discount({
          id: `d${k}`,
          scope,
          type,
          value: type === "percentage" ? 1 + int(99) : int(800),
          productId: scope === "product" ? pick(["p-burger", "p-pizza", "p-beef"]) : null,
          categoryId: scope === "category" ? pick(["c-burgers", "c-pizza"]) : null,
          minCartValue: scope === "cart" && rand() < 0.5 ? int(1500) : null,
          startsAt: rand() < 0.2 ? "2026-10-15T00:00:00Z" : null,
          endsAt: rand() < 0.2 ? "2026-10-13T00:00:00Z" : null,
          isActive: rand() < 0.9,
        });
      });
      const lines: CartLine[] = Array.from({ length: int(4) }, () => {
        const productId = pick(["p-burger", "p-pizza", "p-beef"]);
        const variantId = productId === "p-pizza" ? pick(["v-8", "v-10"]) : null;
        const addonIds = productId === "p-burger" ? (rand() < 0.5 ? ["a-cheese"] : []) : [];
        return { productId, variantId, addonIds, quantity: 1 + int(5) };
      });
      const couponDiscount =
        rand() < 0.3 ? discount({ id: "cpn", scope: "cart", type: pick(["percentage", "fixed"] as const), value: 1 + int(99), couponCode: "X" }) : null;
      const deliveryFee = rand() < 0.5 ? int(100) : null;

      const r = priceCart({ lines, products, discounts, coupon: couponDiscount, couponEntered: couponDiscount !== null, deliveryFee, now: NOW });

      const cartAmount = r.cartDiscount?.amount ?? 0;
      for (const l of r.lines) {
        expect(Number.isInteger(l.unitPrice) && l.unitPrice >= 0).toBe(true);
        expect(l.unitPrice).toBeLessThanOrEqual(l.regularUnitPrice);
        expect(l.unitPrice).toBeGreaterThanOrEqual(l.addonsPrice); // add-ons never discounted
        expect(l.lineTotal).toBe(l.unitPrice * l.quantity);
        if (l.itemDiscount) expect(l.itemDiscount.amountPerUnit).toBeLessThanOrEqual(l.regularBasePrice);
      }
      expect(r.subtotal).toBe(r.lines.filter((l) => l.status === "ok").reduce((s, l) => s + l.lineTotal, 0));
      expect(r.subtotal).toBeLessThanOrEqual(r.regularSubtotal);
      expect(cartAmount).toBeGreaterThanOrEqual(0);
      expect(cartAmount).toBeLessThanOrEqual(r.subtotal);
      expect(r.estimatedTotal).toBe(r.subtotal - cartAmount + (deliveryFee ?? 0));
      expect(r.estimatedTotal).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(r.estimatedTotal)).toBe(true);
    }
  });
});

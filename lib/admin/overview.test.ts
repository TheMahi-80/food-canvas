import { describe, expect, it } from "vitest";
import type { Discount } from "@/types/menu";
import { computeOverview } from "./overview";

const NOW = new Date("2026-10-15T12:00:00Z");
const d = (o: Partial<Discount>): Discount => ({
  id: "d", nameBn: "d", scope: "cart", type: "fixed", value: 10, productId: null, categoryId: null,
  minCartValue: null, couponCode: null, startsAt: null, endsAt: null, isActive: true, ...o,
});

describe("computeOverview", () => {
  it("counts real rows only", () => {
    const o = computeOverview(
      {
        products: [
          { is_active: true, is_available: true, slug: "burger", category_id: "c1" },
          { is_active: true, is_available: false, slug: "sample-beef", category_id: "c1" },
          { is_active: false, is_available: true, slug: "sample-hidden", category_id: "c1" },
          { is_active: true, is_available: true, slug: "sample-in-hidden-category", category_id: "c2" },
        ],
        categories: [{ id: "c1", is_active: true }, { id: "c2", is_active: false }],
        discounts: [
          d({}),
          d({ couponCode: "SAVE" }),
          d({ isActive: false }),
          d({ startsAt: "2026-10-16T00:00:00Z" }),
          d({ endsAt: "2026-10-14T00:00:00Z" }),
        ],
      },
      NOW,
    );
    expect(o).toEqual({
      products: { total: 4, visible: 2, hidden: 2, available: 1, unavailable: 1, sample: 3 },
      categories: { total: 2, active: 1 },
      discounts: { live: 1, scheduled: 1, liveCoupons: 1 },
    });
  });

  it("empty database gives zeros, never invented numbers", () => {
    expect(computeOverview({ products: [], categories: [], discounts: [] }, NOW)).toEqual({
      products: { total: 0, visible: 0, hidden: 0, available: 0, unavailable: 0, sample: 0 },
      categories: { total: 0, active: 0 },
      discounts: { live: 0, scheduled: 0, liveCoupons: 0 },
    });
  });
});

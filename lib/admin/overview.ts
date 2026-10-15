/** Real counts for the admin overview, computed from database rows only (no invented stats). */
import { isDiscountLive } from "@/lib/pricing";
import type { Discount } from "@/types/menu";

export interface OverviewInput {
  products: { is_active: boolean; is_available: boolean; slug: string; category_id: string }[];
  categories: { id: string; is_active: boolean }[];
  discounts: Discount[];
}

export interface Overview {
  products: { total: number; visible: number; hidden: number; available: number; unavailable: number; sample: number };
  categories: { total: number; active: number };
  discounts: { live: number; scheduled: number; liveCoupons: number };
}

export function computeOverview(input: OverviewInput, now: Date): Overview {
  // Same rule as the public menu: a product shows only if it and its category are both active.
  const activeCategories = new Set(input.categories.filter((c) => c.is_active).map((c) => c.id));
  const visible = input.products.filter((p) => p.is_active && activeCategories.has(p.category_id));
  const live = input.discounts.filter((d) => isDiscountLive(d, now));
  return {
    products: {
      total: input.products.length,
      visible: visible.length,
      hidden: input.products.length - visible.length,
      available: visible.filter((p) => p.is_available).length,
      unavailable: visible.filter((p) => !p.is_available).length,
      sample: input.products.filter((p) => p.slug.startsWith("sample-")).length,
    },
    categories: { total: input.categories.length, active: input.categories.filter((c) => c.is_active).length },
    discounts: {
      live: live.filter((d) => d.couponCode === null).length,
      scheduled: input.discounts.filter((d) => d.isActive && d.startsAt !== null && Date.parse(d.startsAt) > now.getTime()).length,
      liveCoupons: live.filter((d) => d.couponCode !== null).length,
    },
  };
}

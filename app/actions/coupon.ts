"use server";

import { normalizeCouponCode } from "@/lib/cart/storage";
import { createPublicClient } from "@/lib/supabase/public";
import type { Discount } from "@/types/menu";

export type CouponLookupResult = { ok: true; coupon: Discount | null } | { ok: false };

/**
 * Looks up a coupon by exact code via the lookup_coupon RPC (security definer, returns only a
 * currently valid cart coupon). Coupon codes are never listed to the browser.
 * coupon: null means "no such valid coupon"; ok: false means the lookup itself failed.
 */
export async function lookupCoupon(rawCode: string): Promise<CouponLookupResult> {
  const code = typeof rawCode === "string" ? normalizeCouponCode(rawCode) : null;
  if (!code) return { ok: true, coupon: null };

  try {
    const { data, error } = await createPublicClient().rpc("lookup_coupon", { p_code: code });
    if (error) {
      console.error("lookupCoupon failed", error.code);
      return { ok: false };
    }
    const row = data?.[0];
    if (!row) return { ok: true, coupon: null };
    return {
      ok: true,
      coupon: {
        id: row.id,
        nameBn: row.name_bn,
        scope: "cart",
        type: row.type as Discount["type"],
        value: row.value,
        productId: null,
        categoryId: null,
        minCartValue: row.min_cart_value,
        couponCode: row.coupon_code,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        isActive: true,
      },
    };
  } catch {
    return { ok: false };
  }
}

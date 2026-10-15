import "server-only";
import type { DiscountTargetProduct } from "@/components/admin/discount-form";
import { loadAdminCategories, loadAdminProducts } from "@/lib/admin/menu-data";
import type { AuthClient } from "@/lib/supabase/server";

/** Products and categories a discount can target, for the discount form. */
export async function loadDiscountTargets(supabase: AuthClient) {
  const [products, categories] = await Promise.all([loadAdminProducts(supabase), loadAdminCategories(supabase)]);
  return {
    products: products.map<DiscountTargetProduct>((p) => ({ id: p.id, nameBn: p.nameBn, price: p.price, hasSizes: p.variants.length > 0 })),
    categories: categories.map((c) => ({ id: c.id, nameBn: c.nameBn })),
  };
}

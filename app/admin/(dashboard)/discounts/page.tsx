import type { Metadata } from "next";
import { DiscountList } from "@/components/admin/discount-list";
import { loadAdminCategories, loadAdminDiscounts, loadAdminProducts, requestTime } from "@/lib/admin/menu-data";
import { requireAdminPage } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";

const k = messages.admin.discounts;

export const metadata: Metadata = { title: k.title };

export default async function AdminDiscountsPage() {
  const { supabase } = await requireAdminPage();
  let data;
  try {
    const [discounts, products, categories] = await Promise.all([loadAdminDiscounts(supabase), loadAdminProducts(supabase), loadAdminCategories(supabase)]);
    data = { discounts, products, categories };
  } catch {
    return (
      <p role="alert" className="text-destructive">
        {messages.admin.common.loadError}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{k.title}</h1>
        <p className="text-sm text-muted-foreground">{k.intro}</p>
      </div>
      <DiscountList
        discounts={data.discounts}
        productNames={Object.fromEntries(data.products.map((p) => [p.id, p.nameBn]))}
        categoryNames={Object.fromEntries(data.categories.map((c) => [c.id, c.nameBn]))}
        now={requestTime()}
      />
    </div>
  );
}

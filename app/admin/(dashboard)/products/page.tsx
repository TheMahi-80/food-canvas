import type { Metadata } from "next";
import { ProductList } from "@/components/admin/product-list";
import { loadAdminCategories, loadAdminProducts } from "@/lib/admin/menu-data";
import { requireAdminPage } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";

const k = messages.admin.products;

export const metadata: Metadata = { title: k.title };

export default async function AdminProductsPage() {
  const { supabase } = await requireAdminPage();

  let data;
  try {
    const [products, categories] = await Promise.all([loadAdminProducts(supabase), loadAdminCategories(supabase)]);
    data = { products, categories };
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
      <ProductList products={data.products} categories={data.categories} />
    </div>
  );
}

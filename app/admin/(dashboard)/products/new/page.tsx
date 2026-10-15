import type { Metadata } from "next";
import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { loadAdminCategories, loadAdminDiscounts } from "@/lib/admin/menu-data";
import { requireAdminPage } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";

const k = messages.admin.products;

export const metadata: Metadata = { title: k.newTitle };

export default async function NewProductPage({ searchParams }: PageProps<"/admin/products/new">) {
  const { supabase } = await requireAdminPage();
  const { category } = await searchParams;

  let data;
  try {
    const [categories, discounts] = await Promise.all([loadAdminCategories(supabase), loadAdminDiscounts(supabase)]);
    data = { categories, discounts };
  } catch {
    return (
      <p role="alert" className="text-destructive">
        {messages.admin.common.loadError}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{k.newTitle}</h1>
      {data.categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-muted-foreground">{k.needCategory}</p>
          <Button asChild className="mt-3">
            <Link href="/admin/categories">{k.goToCategories}</Link>
          </Button>
        </div>
      ) : (
        <ProductForm
          product={null}
          categories={data.categories}
          discounts={data.discounts}
          initialCategoryId={typeof category === "string" ? category : undefined}
        />
      )}
    </div>
  );
}

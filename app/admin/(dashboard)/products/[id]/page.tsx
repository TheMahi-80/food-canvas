import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { loadAdminCategories, loadAdminDiscounts, loadAdminProduct } from "@/lib/admin/menu-data";
import { requireAdminPage } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";
import { productIdSchema } from "@/lib/validation/admin-menu";

const k = messages.admin.products;

export const metadata: Metadata = { title: k.editTitle };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const { supabase } = await requireAdminPage();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  if (!productIdSchema.safeParse(id).success) notFound();

  let data;
  try {
    const [product, categories, discounts] = await Promise.all([
      loadAdminProduct(supabase, id),
      loadAdminCategories(supabase),
      loadAdminDiscounts(supabase),
    ]);
    data = { product, categories, discounts };
  } catch {
    return (
      <p role="alert" className="text-destructive">
        {messages.admin.common.loadError}
      </p>
    );
  }
  if (!data.product) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{k.editTitle}</p>
        <h1 className="text-2xl font-bold">{data.product.nameBn}</h1>
      </div>
      <ProductForm product={data.product} categories={data.categories} discounts={data.discounts} justCreated={created === "1"} />
    </div>
  );
}

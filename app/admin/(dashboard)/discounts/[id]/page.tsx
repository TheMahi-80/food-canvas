import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DiscountForm } from "@/components/admin/discount-form";
import { loadAdminDiscount } from "@/lib/admin/menu-data";
import { requireAdminPage } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";
import { loadDiscountTargets } from "../form-data";

const k = messages.admin.discounts;

export const metadata: Metadata = { title: k.editTitle };

export default async function EditDiscountPage({ params, searchParams }: PageProps<"/admin/discounts/[id]">) {
  const { supabase } = await requireAdminPage();
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  let data;
  try {
    const [discount, targets] = await Promise.all([loadAdminDiscount(supabase, id), loadDiscountTargets(supabase)]);
    data = { discount, ...targets };
  } catch {
    return (
      <p role="alert" className="text-destructive">
        {messages.admin.common.loadError}
      </p>
    );
  }
  if (!data.discount) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{k.editTitle}</p>
        <h1 className="text-2xl font-bold">{data.discount.nameBn}</h1>
      </div>
      <DiscountForm discount={data.discount} products={data.products} categories={data.categories} justCreated={created === "1"} />
    </div>
  );
}

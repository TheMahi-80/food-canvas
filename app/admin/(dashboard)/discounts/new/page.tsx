import type { Metadata } from "next";
import { DiscountForm } from "@/components/admin/discount-form";
import { requireAdminPage } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";
import { loadDiscountTargets } from "../form-data";

const k = messages.admin.discounts;

export const metadata: Metadata = { title: k.newTitle };

export default async function NewDiscountPage() {
  const { supabase } = await requireAdminPage();
  let targets;
  try {
    targets = await loadDiscountTargets(supabase);
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
      <DiscountForm discount={null} products={targets.products} categories={targets.categories} />
    </div>
  );
}

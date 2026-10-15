import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/category-manager";
import { requireAdminPage } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";
import { loadAdminCategories } from "@/lib/admin/menu-data";

const k = messages.admin.categories;

export const metadata: Metadata = { title: k.title };

export default async function AdminCategoriesPage() {
  const { supabase } = await requireAdminPage();

  let categories;
  try {
    categories = await loadAdminCategories(supabase);
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
      <CategoryManager categories={categories} />
    </div>
  );
}

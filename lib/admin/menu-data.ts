import "server-only";
import type { AuthClient } from "@/lib/supabase/server";
import { fallbackHours, mapDiscount, mapHours, mapProduct, mapSettings, type ProductWithOptionsRow } from "@/lib/menu/mappers";
import type { Discount, MenuItem, SiteInfo } from "@/types/menu";

/** Admin views of the menu. Queries run as the signed-in admin, so RLS shows hidden rows too. */

export interface AdminCategory {
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
}

export interface AdminProduct extends MenuItem {
  isActive: boolean;
}

export class AdminLoadError extends Error {
  constructor(where: string, code?: string) {
    super(`admin load failed: ${where}`);
    this.name = "AdminLoadError";
    // Codes only; never row data.
    console.error("admin load failed", where, code);
  }
}

export async function loadAdminCategories(supabase: AuthClient): Promise<AdminCategory[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_bn, name_en, is_active, sort_order, products(count)")
    .order("sort_order")
    .order("name_bn");
  if (error) throw new AdminLoadError("categories", error.code);
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    nameBn: row.name_bn,
    nameEn: row.name_en,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    productCount: row.products[0]?.count ?? 0,
  }));
}

function mapAdminProduct(row: ProductWithOptionsRow): AdminProduct {
  return { ...mapProduct(row), isActive: row.is_active };
}

export async function loadAdminProducts(supabase: AuthClient): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*), product_addons(*)")
    .order("sort_order")
    .order("name_bn");
  if (error) throw new AdminLoadError("products", error.code);
  return data.map(mapAdminProduct);
}

export async function loadAdminProduct(supabase: AuthClient, id: string): Promise<AdminProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*), product_addons(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new AdminLoadError("product", error.code);
  return data ? mapAdminProduct(data) : null;
}

/** Every discount (admins see inactive and coupon ones too); pricing decides which are live. */
export async function loadAdminDiscounts(supabase: AuthClient): Promise<Discount[]> {
  const { data, error } = await supabase.from("discounts").select("*").order("created_at", { ascending: false });
  if (error) throw new AdminLoadError("discounts", error.code);
  return data.map(mapDiscount);
}

export async function loadAdminDiscount(supabase: AuthClient, id: string): Promise<Discount | null> {
  const { data, error } = await supabase.from("discounts").select("*").eq("id", id).maybeSingle();
  if (error) throw new AdminLoadError("discount", error.code);
  return data ? mapDiscount(data) : null;
}

export async function loadAdminSiteInfo(supabase: AuthClient): Promise<SiteInfo> {
  const [settings, hours] = await Promise.all([
    supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("opening_hours").select("*"),
  ]);
  if (settings.error || hours.error || !settings.data) throw new AdminLoadError("settings", settings.error?.code ?? hours.error?.code);
  return { settings: mapSettings(settings.data), hours: hours.data.length === 7 ? mapHours(hours.data) : fallbackHours() };
}

/** Request time for "now"-dependent admin views (pages call this after the admin check, at request time). */
export function requestTime(): number {
  return Date.now();
}

/** Pure mapping from Supabase rows (snake_case) to app domain types (camelCase). */
import type { Database } from "@/types/database";
import type { Discount, MenuCategory, MenuItem, OpeningHoursDay, PublicSettings } from "@/types/menu";
import { DEFAULT_OPENING_HOURS } from "@/lib/hours";
import { messages } from "@/lib/i18n";
import { getFallbackWhatsAppNumber } from "@/lib/whatsapp/number";

type Tables = Database["public"]["Tables"];
type CategoryRow = Tables["categories"]["Row"];
type ProductRow = Tables["products"]["Row"];
type VariantRow = Tables["product_variants"]["Row"];
type AddonRow = Tables["product_addons"]["Row"];
type DiscountRow = Tables["discounts"]["Row"];
type SettingsRow = Tables["restaurant_settings"]["Row"];
type HoursRow = Tables["opening_hours"]["Row"];

export type ProductWithOptionsRow = ProductRow & {
  product_variants: VariantRow[] | null;
  product_addons: AddonRow[] | null;
};

const bySortOrder = <T extends { sort_order: number; name_bn: string }>(a: T, b: T) =>
  a.sort_order - b.sort_order || a.name_bn.localeCompare(b.name_bn, "bn");

export function mapCategory(row: CategoryRow): MenuCategory {
  return { id: row.id, slug: row.slug, nameBn: row.name_bn, nameEn: row.name_en, sortOrder: row.sort_order };
}

export function mapProduct(row: ProductWithOptionsRow): MenuItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    slug: row.slug,
    nameBn: row.name_bn,
    nameEn: row.name_en,
    descriptionBn: row.description_bn,
    descriptionEn: row.description_en,
    price: row.price,
    imagePath: row.image_path,
    isAvailable: row.is_available,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    variants: [...(row.product_variants ?? [])].sort(bySortOrder).map((v) => ({
      id: v.id,
      nameBn: v.name_bn,
      nameEn: v.name_en,
      price: v.price,
      isAvailable: v.is_available,
    })),
    addons: [...(row.product_addons ?? [])].sort(bySortOrder).map((a) => ({
      id: a.id,
      nameBn: a.name_bn,
      nameEn: a.name_en,
      price: a.price,
      isAvailable: a.is_available,
    })),
  };
}

export function mapDiscount(row: DiscountRow): Discount {
  return {
    id: row.id,
    nameBn: row.name_bn,
    scope: row.scope as Discount["scope"],
    type: row.type as Discount["type"],
    value: row.value,
    productId: row.product_id,
    categoryId: row.category_id,
    minCartValue: row.min_cart_value,
    couponCode: row.coupon_code,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
  };
}

export function mapSettings(row: SettingsRow): PublicSettings {
  return {
    restaurantName: row.restaurant_name,
    whatsappNumber: row.whatsapp_number,
    contactPhone: row.contact_phone,
    email: row.email,
    facebookUrl: row.facebook_url,
    addressBn: row.address_bn,
    mapUrl: row.map_url,
    temporarilyClosed: row.temporarily_closed,
    closureNoteBn: row.closure_note_bn,
    deliveryEnabled: row.delivery_enabled,
    pickupEnabled: row.pickup_enabled,
    deliveryFee: row.delivery_fee,
    minOrder: row.min_order,
    heroHeadlineBn: row.hero_headline_bn,
    heroSubtextBn: row.hero_subtext_bn,
    heroImagePath: row.hero_image_path,
    aboutBn: row.about_bn,
  };
}

export function mapHours(rows: HoursRow[]): OpeningHoursDay[] {
  return rows
    .map((r) => ({ dayOfWeek: r.day_of_week, opensAt: r.opens_at.slice(0, 5), closesAt: r.closes_at.slice(0, 5), isClosed: r.is_closed }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

/** Confirmed defaults, used only if the settings cannot be loaded. */
export function fallbackSettings(): PublicSettings {
  return {
    restaurantName: messages.meta.siteName,
    whatsappNumber: getFallbackWhatsAppNumber(),
    contactPhone: null,
    email: null,
    facebookUrl: null,
    addressBn: null,
    mapUrl: null,
    temporarilyClosed: false,
    closureNoteBn: null,
    deliveryEnabled: null,
    pickupEnabled: null,
    deliveryFee: null,
    minOrder: null,
    heroHeadlineBn: messages.hero.headline,
    heroSubtextBn: messages.hero.subtext,
    heroImagePath: null,
    aboutBn: null,
  };
}

export const fallbackHours = (): OpeningHoursDay[] => DEFAULT_OPENING_HOURS.map((d) => ({ ...d }));

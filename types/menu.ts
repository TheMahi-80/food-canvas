/**
 * App-side domain types (camelCase). Rows from Supabase are mapped into these.
 * Money is always whole taka as an integer.
 */

export type Taka = number;

export interface MenuVariant {
  id: string;
  nameBn: string;
  nameEn: string | null;
  price: Taka;
  isAvailable: boolean;
}

export interface MenuAddon {
  id: string;
  nameBn: string;
  nameEn: string | null;
  price: Taka;
  isAvailable: boolean;
}

export interface MenuProduct {
  id: string;
  categoryId: string;
  nameBn: string;
  nameEn: string | null;
  /** Base price, used when the product has no variants. */
  price: Taka;
  isAvailable: boolean;
  variants: MenuVariant[];
  addons: MenuAddon[];
}

export type DiscountScope = "product" | "category" | "cart";
export type DiscountType = "percentage" | "fixed" | "sale_price";

export interface Discount {
  id: string;
  nameBn: string;
  scope: DiscountScope;
  type: DiscountType;
  /** percentage: 1-100; fixed: taka off; sale_price: new base price in taka. */
  value: number;
  productId: string | null;
  categoryId: string | null;
  minCartValue: Taka | null;
  couponCode: string | null;
  /** ISO timestamps; null = no bound. */
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

/** One day of the weekly schedule. dayOfWeek: 0 = Sunday ... 6 = Saturday. Times are "HH:MM" in Asia/Dhaka. */
export interface OpeningHoursDay {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
}

export interface MenuCategory {
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string | null;
  sortOrder: number;
}

/** A public menu product with display fields. */
export interface MenuItem extends MenuProduct {
  slug: string;
  descriptionBn: string | null;
  descriptionEn: string | null;
  /** Path inside the menu-images bucket, or null. */
  imagePath: string | null;
  isFeatured: boolean;
  sortOrder: number;
}

/** Public restaurant settings (every field is safe to show publicly). */
export interface PublicSettings {
  restaurantName: string;
  whatsappNumber: string;
  contactPhone: string | null;
  email: string | null;
  facebookUrl: string | null;
  addressBn: string | null;
  mapUrl: string | null;
  temporarilyClosed: boolean;
  closureNoteBn: string | null;
  deliveryEnabled: boolean | null;
  pickupEnabled: boolean | null;
  deliveryFee: Taka | null;
  minOrder: Taka | null;
  heroHeadlineBn: string;
  heroSubtextBn: string;
  heroImagePath: string | null;
  aboutBn: string | null;
}

export interface SiteInfo {
  settings: PublicSettings;
  hours: OpeningHoursDay[];
}

export interface PublicMenu {
  categories: MenuCategory[];
  items: MenuItem[];
  /** Public, non-coupon discounts (including scheduled ones; pricing filters by time). */
  discounts: Discount[];
  /** Server time (ms) when this data was fetched; used until the client clock is known. */
  fetchedAt: number;
}

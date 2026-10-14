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

/**
 * Serialized cart format for localStorage. Holds only product/variant/add-on IDs, quantities and
 * an optional coupon code: never prices, never customer details (those use a separate key).
 */
import { parseStoredCart, type CartLine } from "./index";

export const CART_STORAGE_KEY = "fc-cart-v1";
export const MAX_CART_LINES = 50;

export interface CartState {
  lines: CartLine[];
  /** Normalized coupon code the customer entered, re-validated against the server before use. */
  couponCode: string | null;
}

export const EMPTY_CART: CartState = Object.freeze({ lines: [], couponCode: null }) as CartState;

/** Uppercase, trimmed; null unless it matches the code format the database allows. */
export function normalizeCouponCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return /^[A-Z0-9_-]{3,32}$/.test(code) ? code : null;
}

/** Parses untrusted stored JSON. Anything malformed becomes an empty cart instead of an error. */
export function parseCartState(raw: string | null): CartState {
  if (!raw) return EMPTY_CART;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return EMPTY_CART;
    const { lines, couponCode } = data as Record<string, unknown>;
    return {
      lines: parseStoredCart(lines).slice(0, MAX_CART_LINES),
      couponCode: typeof couponCode === "string" ? normalizeCouponCode(couponCode) : null,
    };
  } catch {
    return EMPTY_CART;
  }
}

export function serializeCartState(state: CartState): string {
  return JSON.stringify({ lines: state.lines, couponCode: state.couponCode });
}

/**
 * Customer details on the customer's own device only (localStorage). Never sent to our servers,
 * never stored in the database, analytics or logs. Separate key from the cart.
 * localStorage is a convenience, never authorization.
 */
import { customerDetailsSchema, type CustomerDetails } from "@/lib/validation/customer";

export const CUSTOMER_STORAGE_KEY = "fc-customer-v1";

/** Re-validates stored data; anything invalid or edited by hand is treated as "no details". */
export function parseStoredCustomer(raw: string | null): CustomerDetails | null {
  if (!raw) return null;
  try {
    const result = customerDetailsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function serializeCustomer(details: CustomerDetails): string {
  return JSON.stringify({ name: details.name, phone: details.phone });
}

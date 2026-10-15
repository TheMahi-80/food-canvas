/** Confirmed official ordering number (digits only, as used in wa.me links). */
export const DEFAULT_WHATSAPP_NUMBER = "8801845690533";

/** Bangladesh mobile number in international digits-only form: 880 + 1[3-9] + 8 digits. */
const BD_WA_DIGITS = /^8801[3-9][0-9]{8}$/;

export function isValidWhatsAppDigits(value: string): boolean {
  return BD_WA_DIGITS.test(value);
}

/**
 * Restaurant WhatsApp number used when the settings row is unavailable.
 * Reads FOOD_CANVAS_WHATSAPP_NUMBER (server-side) and falls back to the confirmed number
 * if the variable is unset or malformed.
 */
export function getFallbackWhatsAppNumber(env: string | undefined = process.env.FOOD_CANVAS_WHATSAPP_NUMBER): string {
  const digits = env?.trim();
  return digits && isValidWhatsAppDigits(digits) ? digits : DEFAULT_WHATSAPP_NUMBER;
}

/** Human-readable form, e.g. 8801845690533 -> "+880 1845-690533". */
export function formatWhatsAppDisplay(digits: string): string {
  if (!isValidWhatsAppDigits(digits)) return `+${digits}`;
  return `+880 ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** Plain chat link (no prefilled message) for contact purposes. */
export function whatsAppChatUrl(digits: string): string {
  return `https://wa.me/${digits}`;
}

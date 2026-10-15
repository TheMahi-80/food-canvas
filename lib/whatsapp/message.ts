/**
 * Builds the WhatsApp order-request message and link. The message is built ONLY from a
 * PricedCart (lib/pricing), so it always matches the totals shown in the cart.
 * Opening WhatsApp does not place an order; the customer must press Send, and the restaurant
 * confirms directly.
 */
import type { PricedCart, PricedLine } from "@/lib/pricing";
import type { CustomerDetails } from "@/lib/validation/customer";
import { isValidWhatsAppDigits } from "./number";

export class OrderNotSendableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "OrderNotSendableError";
  }
}

/** Whole taka with Latin digits and thousands separators: 1250 -> "৳1,250". */
export function formatTakaPlain(amount: number): string {
  return `৳${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** Collapse whitespace so admin/customer text cannot break the message layout. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function displayName(item: { nameBn: string; nameEn: string | null }): string {
  return oneLine(item.nameEn?.trim() ? item.nameEn : item.nameBn);
}

function lineTitle(line: PricedLine): string {
  const options = [line.variant ? displayName(line.variant) : null, ...line.addons.map(displayName)].filter(Boolean);
  const name = displayName(line.product!);
  return options.length > 0 ? `${name} (${options.join(", ")})` : name;
}

export function buildOrderMessage(cart: PricedCart, customer: CustomerDetails): string {
  if (!cart.orderable) throw new OrderNotSendableError("cart contains no items or has unavailable/invalid items");

  const out: string[] = [
    "Hello Food Canvas! I'd like to place an order.",
    "",
    `Customer Name: ${oneLine(customer.name)}`,
    `Customer WhatsApp: ${customer.phone}`,
    "",
    "ORDER DETAILS",
    "",
  ];

  cart.lines.forEach((line, index) => {
    out.push(`${index + 1}. ${lineTitle(line)}`);
    out.push(`   Quantity: ${line.quantity}`);
    const regular = line.itemDiscount ? ` (regular ${formatTakaPlain(line.regularUnitPrice)})` : "";
    out.push(`   Unit Price: ${formatTakaPlain(line.unitPrice)}${regular}`);
    out.push(`   Line Total: ${formatTakaPlain(line.lineTotal)}`);
    out.push("");
  });

  out.push(`Subtotal: ${formatTakaPlain(cart.subtotal)}`);
  if (cart.cartDiscount) {
    const label = cart.cartDiscount.couponCode ? `Coupon ${cart.cartDiscount.couponCode}` : oneLine(cart.cartDiscount.nameBn);
    out.push(`Discount: ${formatTakaPlain(cart.cartDiscount.amount)} (${label})`);
  }
  out.push(cart.deliveryFee === null ? "Delivery Fee: To be confirmed, if applicable" : `Delivery Fee: ${formatTakaPlain(cart.deliveryFee)}`);
  out.push(`Estimated Total: ${formatTakaPlain(cart.estimatedTotal)}`);
  out.push("");
  out.push("Order Type: To be confirmed with the restaurant");
  out.push("");
  out.push("Please confirm availability and delivery or pickup details. Thank you!");

  return out.join("\n");
}

/** https://wa.me/<restaurant number>?text=<encoded message>. Always the restaurant's number. */
export function buildWhatsAppOrderUrl(restaurantDigits: string, message: string): string {
  if (!isValidWhatsAppDigits(restaurantDigits)) throw new Error("invalid restaurant WhatsApp number");
  return `https://wa.me/${restaurantDigits}?text=${encodeURIComponent(message)}`;
}

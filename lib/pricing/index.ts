/**
 * The single pricing function. The cart UI and the WhatsApp message both use priceCart(),
 * so the numbers a customer sees and the numbers sent to the restaurant always match.
 *
 * Discount priority rule (also documented in the discounts migration):
 *   1. Item level, at most ONE per cart line: among active, in-window product/category
 *      discounts that apply, the one giving the LOWEST unit base price wins. Never stacked.
 *      Applies to the base/variant price only; add-ons are always full price.
 *      Percentage: discount rounded DOWN to whole taka. sale_price only for products without
 *      variants and only if lower than the base. Unit price never goes below 0.
 *   2. Cart level, at most ONE per order: among automatic cart discounts (no coupon code)
 *      whose minimum is met, plus the entered coupon if valid and its minimum is met, the
 *      LARGEST reduction wins (ties go to the automatic discount). Computed on the subtotal
 *      after item discounts, capped at that subtotal.
 *   3. Estimated total = subtotal - cart discount + delivery fee (only if configured).
 */
import type { CartLine } from "@/lib/cart";
import { cartLineKey } from "@/lib/cart";
import type { Discount, MenuAddon, MenuProduct, MenuVariant, Taka } from "@/types/menu";

export type LineStatus =
  | "ok"
  | "missing" // product no longer on the menu (deleted or hidden)
  | "unavailable" // product, chosen variant or an add-on is currently unavailable
  | "invalid_options"; // variant required but missing, or unknown variant/add-on

export interface AppliedItemDiscount {
  discountId: string;
  nameBn: string;
  /** Reduction per unit, in taka. */
  amountPerUnit: Taka;
}

export interface PricedLine {
  key: string;
  line: CartLine;
  status: LineStatus;
  product: MenuProduct | null;
  variant: MenuVariant | null;
  addons: MenuAddon[];
  quantity: number;
  /** Base (or variant) price before any discount. */
  regularBasePrice: Taka;
  itemDiscount: AppliedItemDiscount | null;
  addonsPrice: Taka;
  /** Regular unit price including add-ons, before item discount. */
  regularUnitPrice: Taka;
  /** Final unit price including add-ons, after item discount. */
  unitPrice: Taka;
  lineTotal: Taka;
}

export type CouponStatus =
  | "none" // no coupon entered
  | "applied"
  | "invalid" // unknown, inactive, expired, or not yet started
  | "min_not_met"
  | "not_best"; // valid, but an automatic discount gives a bigger reduction

export interface AppliedCartDiscount {
  discountId: string;
  nameBn: string;
  couponCode: string | null;
  amount: Taka;
}

export interface PricedCart {
  lines: PricedLine[];
  /** True when there is at least one line and every line is "ok". */
  orderable: boolean;
  itemCount: number;
  /** Sum of ok lines at regular prices. */
  regularSubtotal: Taka;
  /** Total item-level savings already included in line prices. */
  itemDiscountTotal: Taka;
  /** Sum of ok line totals (after item discounts). */
  subtotal: Taka;
  cartDiscount: AppliedCartDiscount | null;
  couponStatus: CouponStatus;
  /** null = not configured ("to be confirmed"). */
  deliveryFee: Taka | null;
  estimatedTotal: Taka;
}

export interface PriceCartInput {
  lines: readonly CartLine[];
  products: readonly MenuProduct[];
  /** Public (non-coupon) discounts from the menu data. */
  discounts: readonly Discount[];
  /** Result of lookup_coupon for the code the customer entered, or null. */
  coupon?: Discount | null;
  /** Whether the customer entered a coupon code (to report "invalid" when lookup found nothing). */
  couponEntered?: boolean;
  deliveryFee: Taka | null;
  now: Date;
}

export function isDiscountLive(discount: Discount, now: Date): boolean {
  if (!discount.isActive) return false;
  const t = now.getTime();
  if (discount.startsAt !== null && Date.parse(discount.startsAt) > t) return false;
  if (discount.endsAt !== null && Date.parse(discount.endsAt) <= t) return false;
  return true;
}

/** Base price after applying one item-level discount (not clamped by caller). */
export function applyItemDiscount(base: Taka, discount: Discount): Taka {
  switch (discount.type) {
    case "percentage":
      return base - Math.floor((base * discount.value) / 100);
    case "fixed":
      return Math.max(0, base - discount.value);
    case "sale_price":
      return Math.min(base, discount.value);
  }
}

export function bestItemDiscount(
  product: MenuProduct,
  hasVariant: boolean,
  base: Taka,
  discounts: readonly Discount[],
  now: Date,
): { discount: Discount; price: Taka } | null {
  let best: { discount: Discount; price: Taka } | null = null;
  const candidates = [...discounts].sort((a, b) => a.id.localeCompare(b.id));
  for (const d of candidates) {
    if (!isDiscountLive(d, now)) continue;
    const targets =
      (d.scope === "product" && d.productId === product.id) || (d.scope === "category" && d.categoryId === product.categoryId);
    if (!targets) continue;
    if (d.type === "sale_price" && hasVariant) continue;
    const price = Math.max(0, applyItemDiscount(base, d));
    if (price >= base) continue;
    if (best === null || price < best.price) best = { discount: d, price };
  }
  return best;
}

export function cartDiscountAmount(subtotal: Taka, discount: Discount): Taka {
  if (discount.type === "percentage") return Math.min(subtotal, Math.floor((subtotal * discount.value) / 100));
  if (discount.type === "fixed") return Math.min(subtotal, discount.value);
  return 0; // sale_price is never a cart discount
}

function priceLine(line: CartLine, productsById: Map<string, MenuProduct>, discounts: readonly Discount[], now: Date): PricedLine {
  const key = cartLineKey(line);
  const product = productsById.get(line.productId) ?? null;
  const empty: PricedLine = {
    key,
    line,
    status: "missing",
    product,
    variant: null,
    addons: [],
    quantity: line.quantity,
    regularBasePrice: 0,
    itemDiscount: null,
    addonsPrice: 0,
    regularUnitPrice: 0,
    unitPrice: 0,
    lineTotal: 0,
  };
  if (!product) return empty;

  let status: LineStatus = product.isAvailable ? "ok" : "unavailable";

  // Variant: required iff the product has variants.
  let variant: MenuVariant | null = null;
  if (product.variants.length > 0) {
    variant = product.variants.find((v) => v.id === line.variantId) ?? null;
    if (!variant) return { ...empty, status: "invalid_options" };
    if (!variant.isAvailable && status === "ok") status = "unavailable";
  } else if (line.variantId !== null) {
    return { ...empty, status: "invalid_options" };
  }

  const addons: MenuAddon[] = [];
  for (const id of line.addonIds) {
    const addon = product.addons.find((a) => a.id === id);
    if (!addon) return { ...empty, variant, status: "invalid_options" };
    if (!addon.isAvailable && status === "ok") status = "unavailable";
    addons.push(addon);
  }

  const regularBasePrice = variant ? variant.price : product.price;
  const best = bestItemDiscount(product, variant !== null, regularBasePrice, discounts, now);
  const discountedBase = best ? best.price : regularBasePrice;
  const addonsPrice = addons.reduce((sum, a) => sum + a.price, 0);
  const unitPrice = discountedBase + addonsPrice;

  return {
    key,
    line,
    status,
    product,
    variant,
    addons,
    quantity: line.quantity,
    regularBasePrice,
    itemDiscount: best
      ? { discountId: best.discount.id, nameBn: best.discount.nameBn, amountPerUnit: regularBasePrice - best.price }
      : null,
    addonsPrice,
    regularUnitPrice: regularBasePrice + addonsPrice,
    unitPrice,
    lineTotal: unitPrice * line.quantity,
  };
}

export function priceCart(input: PriceCartInput): PricedCart {
  const { now } = input;
  const productsById = new Map(input.products.map((p) => [p.id, p]));
  const lines = input.lines.map((line) => priceLine(line, productsById, input.discounts, now));
  const okLines = lines.filter((l) => l.status === "ok");

  const regularSubtotal = okLines.reduce((sum, l) => sum + l.regularUnitPrice * l.quantity, 0);
  const subtotal = okLines.reduce((sum, l) => sum + l.lineTotal, 0);

  // Cart-level: best automatic vs. entered coupon.
  const meetsMin = (d: Discount) => d.minCartValue === null || subtotal >= d.minCartValue;
  let bestAuto: { discount: Discount; amount: Taka } | null = null;
  for (const d of [...input.discounts].sort((a, b) => a.id.localeCompare(b.id))) {
    if (d.scope !== "cart" || d.couponCode !== null || !isDiscountLive(d, now) || !meetsMin(d)) continue;
    const amount = cartDiscountAmount(subtotal, d);
    if (amount > 0 && (bestAuto === null || amount > bestAuto.amount)) bestAuto = { discount: d, amount };
  }

  let couponStatus: CouponStatus = input.couponEntered || input.coupon ? "invalid" : "none";
  let couponCandidate: { discount: Discount; amount: Taka } | null = null;
  const coupon = input.coupon ?? null;
  if (coupon && coupon.scope === "cart" && coupon.couponCode !== null && isDiscountLive(coupon, now)) {
    if (!meetsMin(coupon)) {
      couponStatus = "min_not_met";
    } else {
      couponCandidate = { discount: coupon, amount: cartDiscountAmount(subtotal, coupon) };
      couponStatus = "applied";
    }
  }

  let chosen = bestAuto;
  if (couponCandidate) {
    if (bestAuto && bestAuto.amount >= couponCandidate.amount) {
      couponStatus = "not_best";
    } else {
      chosen = couponCandidate;
    }
  }

  const cartDiscount: AppliedCartDiscount | null =
    chosen && chosen.amount > 0
      ? {
          discountId: chosen.discount.id,
          nameBn: chosen.discount.nameBn,
          couponCode: chosen.discount.couponCode,
          amount: chosen.amount,
        }
      : null;
  if (couponStatus === "applied" && !cartDiscount) couponStatus = "min_not_met"; // empty cart / zero reduction

  const deliveryFee = input.deliveryFee;
  const estimatedTotal = subtotal - (cartDiscount?.amount ?? 0) + (deliveryFee ?? 0);

  return {
    lines,
    orderable: lines.length > 0 && lines.every((l) => l.status === "ok"),
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    regularSubtotal,
    itemDiscountTotal: regularSubtotal - subtotal,
    subtotal,
    cartDiscount,
    couponStatus,
    deliveryFee,
    estimatedTotal,
  };
}

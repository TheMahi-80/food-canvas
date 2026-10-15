/**
 * Zod schema for discounts (admin). Mirrors the database constraints and the pricing rule in
 * lib/pricing: item discounts (product/category) never stack; one cart discount per order.
 */
import { z } from "zod";
import { dhakaLocalToIso } from "@/lib/hours/datetime";
import { messages } from "@/lib/i18n";
import { optionalTaka, optionalUuid, requiredText, wholeNumberSchema } from "./admin-fields";

const v = messages.admin.validation;

const optionalDhakaDateTime = z
  .preprocess((value) => (value == null ? "" : value), z.string())
  .transform((value, ctx) => {
    if (value.trim() === "") return null;
    const iso = dhakaLocalToIso(value.trim());
    if (!iso) {
      ctx.addIssue({ code: "custom", message: v.dateTime });
      return z.NEVER;
    }
    return iso;
  });

// Checked in superRefine, and only for whole-order discounts (the field is hidden otherwise).
const optionalCoupon = z
  .preprocess((value) => (value == null ? "" : value), z.string())
  .transform((value) => {
    const code = value.trim().toUpperCase();
    return code === "" ? null : code;
  });

export const discountInputSchema = z
  .object({
    nameBn: requiredText(120),
    scope: z.enum(["product", "category", "cart"]),
    type: z.enum(["percentage", "fixed", "sale_price"]),
    value: wholeNumberSchema(0, 1_000_000, v.valueRequired),
    productId: optionalUuid,
    categoryId: optionalUuid,
    minCartValue: optionalTaka(),
    couponCode: optionalCoupon,
    startsAt: optionalDhakaDateTime,
    endsAt: optionalDhakaDateTime,
    isActive: z.boolean(),
  })
  // Target checks run even when other fields are invalid, so all errors show on the first submit.
  .refine((d) => d.scope !== "product" || !!d.productId, { path: ["productId"], when: () => true, error: v.chooseProduct })
  .refine((d) => d.scope !== "category" || !!d.categoryId, { path: ["categoryId"], when: () => true, error: v.chooseCategory })
  .superRefine((d, ctx) => {
    if (d.type === "percentage" && (d.value < 1 || d.value > 100)) ctx.addIssue({ code: "custom", message: v.percentRange, path: ["value"] });
    if (d.type === "fixed" && d.value < 1) ctx.addIssue({ code: "custom", message: v.atLeast(1), path: ["value"] });
    if (d.type === "sale_price" && d.scope !== "product") ctx.addIssue({ code: "custom", message: v.salePriceProductOnly, path: ["type"] });
    if (d.scope === "cart" && d.couponCode !== null && !/^[A-Z0-9_-]{3,32}$/.test(d.couponCode)) {
      ctx.addIssue({ code: "custom", message: v.couponCode, path: ["couponCode"] });
    }
    if (d.startsAt && d.endsAt && Date.parse(d.endsAt) <= Date.parse(d.startsAt)) {
      ctx.addIssue({ code: "custom", message: v.endsAfterStarts, path: ["endsAt"] });
    }
  })
  // Drop fields that do not apply to the chosen scope (the database rejects them otherwise).
  .transform((d) => ({
    ...d,
    productId: d.scope === "product" ? d.productId : null,
    categoryId: d.scope === "category" ? d.categoryId : null,
    minCartValue: d.scope === "cart" ? d.minCartValue : null,
    couponCode: d.scope === "cart" ? d.couponCode : null,
  }));
export type DiscountInput = z.output<typeof discountInputSchema>;

export interface DiscountFormValues {
  nameBn: string;
  scope: "product" | "category" | "cart";
  type: "percentage" | "fixed" | "sale_price";
  value: string;
  productId: string;
  categoryId: string;
  minCartValue: string;
  couponCode: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

/**
 * Checks that need the target product's prices: a fixed amount must leave something to pay and a
 * sale price must be below the regular price. Sale prices apply only to products without sizes
 * (lib/pricing ignores them for sized products). Returns a message or null.
 */
export function checkAgainstProduct(
  d: Pick<DiscountInput, "type" | "value">,
  product: { price: number; variantPrices: number[] },
): string | null {
  const k = messages.admin.discounts;
  if (d.type === "sale_price") {
    if (product.variantPrices.length > 0) return k.salePriceHasSizes;
    if (d.value >= product.price) return k.salePriceNotLower;
  }
  if (d.type === "fixed") {
    const lowest = product.variantPrices.length > 0 ? Math.min(...product.variantPrices) : product.price;
    if (d.value >= lowest) return k.fixedTooLarge;
  }
  return null;
}

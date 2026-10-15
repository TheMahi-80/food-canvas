"use server";

import { fail, ok, dbErrorMessage, guardMessage, zodFieldErrors, type ActionResult } from "@/lib/admin/action-result";
import { published } from "@/lib/admin/publish";
import { requireAdminAction } from "@/lib/auth/admin";
import type { AuthClient } from "@/lib/supabase/server";
import { messages } from "@/lib/i18n";
import { checkAgainstProduct, discountInputSchema, type DiscountInput } from "@/lib/validation/admin-discounts";
import { z } from "zod";

/* Same pattern as menu-actions.ts: guard first, Zod on the server, write as the admin (RLS), publish. */

const c = messages.admin.common;
const k = messages.admin.discounts;

function toRow(d: DiscountInput) {
  return {
    name_bn: d.nameBn,
    scope: d.scope,
    type: d.type,
    value: d.value,
    product_id: d.productId,
    category_id: d.categoryId,
    min_cart_value: d.minCartValue,
    coupon_code: d.couponCode,
    starts_at: d.startsAt,
    ends_at: d.endsAt,
    is_active: d.isActive,
  };
}

/** Product-specific limits (no sale price on sized items, never at or above the price). */
async function checkTarget(supabase: AuthClient, d: DiscountInput): Promise<ActionResult | null> {
  if (d.scope === "category") {
    const found = await supabase.from("categories").select("id").eq("id", d.categoryId!).maybeSingle();
    if (found.error) return fail(dbErrorMessage(found.error));
    return found.data ? null : fail(k.targetMissing);
  }
  if (d.scope !== "product") return null;
  const found = await supabase.from("products").select("price, product_variants(price)").eq("id", d.productId!).maybeSingle();
  if (found.error) return fail(dbErrorMessage(found.error));
  if (!found.data) return fail(k.targetMissing);
  const problem = checkAgainstProduct(d, { price: found.data.price, variantPrices: found.data.product_variants.map((v) => v.price) });
  return problem ? fail(problem, { value: problem }) : null;
}

const errorOverrides = { "23505": k.duplicateCoupon, "23503": k.targetMissing };

export async function saveDiscount(id: unknown, input: unknown): Promise<ActionResult<{ id: string; created: boolean }>> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = discountInputSchema.safeParse(input);
  if (!parsed.success) return fail(c.errorInvalid, zodFieldErrors(parsed.error));
  const editing = id !== null && id !== undefined && id !== "";
  const idParsed = editing ? z.uuid().safeParse(id) : null;
  if (idParsed && !idParsed.success) return fail(c.errorInvalid);

  const problem = await checkTarget(guard.supabase, parsed.data);
  if (problem) return problem as ActionResult<never>;

  const query = idParsed
    ? guard.supabase.from("discounts").update(toRow(parsed.data)).eq("id", idParsed.data).select("id")
    : guard.supabase.from("discounts").insert(toRow(parsed.data)).select("id");
  const { data, error } = await query;
  if (error) {
    console.error("saveDiscount failed", error.code);
    const message = dbErrorMessage(error, errorOverrides);
    return fail(message, error.code === "23505" ? { couponCode: message } : undefined);
  }
  if (data.length === 0) return fail(c.errorStale);
  published();
  return ok({ id: data[0].id, created: !editing });
}

export async function setDiscountActive(input: unknown): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = z.object({ id: z.uuid(), isActive: z.boolean() }).safeParse(input);
  if (!parsed.success) return fail(c.errorInvalid);
  const { data, error } = await guard.supabase.from("discounts").update({ is_active: parsed.data.isActive }).eq("id", parsed.data.id).select("id");
  if (error) {
    console.error("setDiscountActive failed", error.code);
    return fail(dbErrorMessage(error));
  }
  if (data.length === 0) return fail(c.errorStale);
  published();
  return ok(null);
}

export async function deleteDiscount(id: unknown): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail(c.errorInvalid);
  const { data, error } = await guard.supabase.from("discounts").delete().eq("id", parsed.data).select("id");
  if (error) {
    console.error("deleteDiscount failed", error.code);
    return fail(dbErrorMessage(error));
  }
  if (data.length === 0) return fail(c.errorStale);
  published();
  return ok(null);
}

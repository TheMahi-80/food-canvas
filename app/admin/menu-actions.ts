"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { fail, ok, dbErrorMessage, guardMessage, zodFieldErrors, type ActionResult } from "@/lib/admin/action-result";
import { productImagePath } from "@/lib/admin/image";
import { published } from "@/lib/admin/publish";
import { removePaths, removeProductImages, uploadImage } from "@/lib/admin/storage";
import { requireAdminAction } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";
import {
  categoryInputSchema,
  categoryUpdateSchema,
  deleteCategorySchema,
  productIdSchema,
  productInputSchema,
  reorderSchema,
  slugWithSuffix,
  toggleSchema,
} from "@/lib/validation/admin-menu";

/*
 * Every action: (1) requireAdminAction() first, (2) Zod-validate the input on the server,
 * (3) write as the signed-in admin (RLS is the final barrier), (4) expire the public menu cache
 * so customers see the change on their next request, (5) refresh the admin page.
 */

const c = messages.admin.common;
const cat = messages.admin.categories;

const shortId = () => randomBytes(3).toString("hex");

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return fail(c.errorInvalid, zodFieldErrors(parsed.error));
  const { supabase } = guard;

  const last = await supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  if (last.error) return fail(dbErrorMessage(last.error));
  const sortOrder = (last.data[0]?.sort_order ?? -10) + 10;

  // The slug appears in public links (/menu?category=...). Try the clean one, then add a suffix.
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = slugWithSuffix(parsed.data.nameEn, "category", attempt === 0 && parsed.data.nameEn ? "" : shortId());
    const { data, error } = await supabase
      .from("categories")
      .insert({ slug, name_bn: parsed.data.nameBn, name_en: parsed.data.nameEn, is_active: parsed.data.isActive, sort_order: sortOrder })
      .select("id")
      .single();
    if (!error) {
      published();
      return ok({ id: data.id });
    }
    if (error.code !== "23505") {
      console.error("createCategory failed", error.code);
      return fail(dbErrorMessage(error));
    }
  }
  return fail(c.errorGeneric);
}

export async function updateCategory(input: unknown): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(c.errorInvalid, zodFieldErrors(parsed.error));

  const { data, error } = await guard.supabase
    .from("categories")
    .update({ name_bn: parsed.data.nameBn, name_en: parsed.data.nameEn, is_active: parsed.data.isActive })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) {
    console.error("updateCategory failed", error.code);
    return fail(dbErrorMessage(error));
  }
  if (data.length === 0) return fail(c.errorStale);
  published();
  return ok(null);
}

export async function reorderCategories(ids: unknown): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = reorderSchema.safeParse(ids);
  if (!parsed.success) return fail(c.errorInvalid);

  const { error } = await guard.supabase.rpc("reorder_categories", { p_ids: parsed.data });
  if (error) {
    console.error("reorderCategories failed", error.code);
    return fail(dbErrorMessage(error));
  }
  published();
  return ok(null);
}

/**
 * Deletes a category without ever orphaning products: the owner must choose to move them to
 * another category or delete them too (public.delete_category enforces the same in the database).
 */
export async function deleteCategory(input: unknown): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = deleteCategorySchema.safeParse(input);
  if (!parsed.success) return fail(c.errorInvalid, zodFieldErrors(parsed.error));
  const { supabase } = guard;
  const choice = parsed.data;

  let doomed: { id: string; image_path: string | null }[] = [];
  if (choice.mode === "delete_products") {
    const products = await supabase.from("products").select("id, image_path").eq("category_id", choice.id);
    if (products.error) return fail(dbErrorMessage(products.error));
    // The dialog showed a count; if products were added meanwhile, make the owner look again.
    if (products.data.length !== choice.confirmCount) return fail(c.errorStale);
    doomed = products.data;
  }

  const { error } = await supabase.rpc("delete_category", {
    p_category_id: choice.id,
    p_reassign_to: choice.mode === "reassign" ? choice.targetId : undefined,
    p_delete_products: choice.mode === "delete_products",
  });
  if (error) {
    console.error("deleteCategory failed", error.code);
    return fail(dbErrorMessage(error, { "23503": cat.errorHasProducts }));
  }

  await removeProductImages(supabase, doomed);
  published();
  return ok(null);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * Create (no "id" field) or update a product with its sizes and extras, plus an optional new
 * image. FormData fields: "payload" (JSON matching productInputSchema), "id" (edit only),
 * "image" (optional file). The product and its options are written in one transaction.
 */
export async function saveProduct(formData: FormData): Promise<ActionResult<{ id: string; created: boolean }>> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const { supabase } = guard;

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return fail(c.errorInvalid);
  }
  const parsed = productInputSchema.safeParse(payload);
  if (!parsed.success) return fail(c.errorInvalid, zodFieldErrors(parsed.error));
  const input = parsed.data;

  const rawId = formData.get("id");
  const editing = typeof rawId === "string" && rawId !== "";
  let id: string;
  let existing: { image_path: string | null } | null = null;
  if (editing) {
    const idParsed = productIdSchema.safeParse(rawId);
    if (!idParsed.success) return fail(c.errorInvalid);
    id = idParsed.data;
    const found = await supabase.from("products").select("image_path").eq("id", id).maybeSingle();
    if (found.error) return fail(dbErrorMessage(found.error));
    if (!found.data) return fail(c.errorStale);
    existing = found.data;
  } else {
    id = randomUUID();
  }

  const image = formData.get("image");
  let uploadedPath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const upload = await uploadImage(supabase, image, (extension) => productImagePath(id, randomUUID(), extension));
    if (!upload.ok) return fail(upload.error, { image: upload.error });
    uploadedPath = upload.path;
  }

  const imagePath = uploadedPath ?? (input.removeImage ? null : (existing?.image_path ?? null));
  const { error } = await supabase.rpc("save_product", {
    p_id: id,
    p_create: !editing,
    p_product: {
      category_id: input.categoryId,
      slug: editing ? null : slugWithSuffix(input.nameEn, "item", shortId()),
      name_bn: input.nameBn,
      name_en: input.nameEn,
      description_bn: input.descriptionBn,
      description_en: input.descriptionEn,
      price: input.price,
      image_path: imagePath,
      is_active: input.isActive,
      is_available: input.isAvailable,
      is_featured: input.isFeatured,
    },
    p_variants: input.variants.map(toOptionRow),
    p_addons: input.addons.map(toOptionRow),
  });

  if (error) {
    console.error("saveProduct failed", error.code);
    if (uploadedPath) await removePaths(supabase, [uploadedPath]);
    return fail(dbErrorMessage(error));
  }

  // The new image is saved; the replaced/removed one is no longer referenced.
  const oldPath = existing?.image_path ?? null;
  if (oldPath && oldPath !== imagePath) await removePaths(supabase, [oldPath]);

  published();
  return ok({ id, created: !editing });
}

function toOptionRow(option: { id: string | null; nameBn: string; nameEn: string | null; price: number; isAvailable: boolean }) {
  return { id: option.id, name_bn: option.nameBn, name_en: option.nameEn, price: option.price, is_available: option.isAvailable };
}

export async function deleteProduct(id: unknown): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = productIdSchema.safeParse(id);
  if (!parsed.success) return fail(c.errorInvalid);

  // Discounts, sizes and extras of this product are removed by ON DELETE CASCADE.
  const { data, error } = await guard.supabase.from("products").delete().eq("id", parsed.data).select("id, image_path");
  if (error) {
    console.error("deleteProduct failed", error.code);
    return fail(dbErrorMessage(error));
  }
  if (data.length === 0) return fail(c.errorStale);

  await removeProductImages(guard.supabase, data);
  published();
  return ok(null);
}

/** Quick switches in the product list: visible on site / available now / featured. */
export async function setProductFlag(input: unknown): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return fail(c.errorInvalid);

  const { id, field, value } = parsed.data;
  const patch = field === "is_active" ? { is_active: value } : field === "is_available" ? { is_available: value } : { is_featured: value };
  const { data, error } = await guard.supabase
    .from("products")
    .update(patch)
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("setProductFlag failed", error.code);
    return fail(dbErrorMessage(error));
  }
  if (data.length === 0) return fail(c.errorStale);
  published();
  return ok(null);
}

export async function reorderProducts(ids: unknown): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = reorderSchema.safeParse(ids);
  if (!parsed.success) return fail(c.errorInvalid);

  const { error } = await guard.supabase.rpc("reorder_products", { p_ids: parsed.data });
  if (error) {
    console.error("reorderProducts failed", error.code);
    return fail(dbErrorMessage(error));
  }
  published();
  return ok(null);
}

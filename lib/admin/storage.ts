import "server-only";
import { checkImageUpload, MAX_IMAGE_BYTES, productImageFolder } from "@/lib/admin/image";
import { messages, toBanglaDigits } from "@/lib/i18n";
import type { AuthClient } from "@/lib/supabase/server";
import { MENU_IMAGES_BUCKET } from "@/lib/supabase/storage";

/** Storage writes for admin actions. They run as the signed-in admin; storage policies allow admins only. */

const k = messages.admin.products;

/** Checks the real file type and size, then uploads under a fresh name from `pathFor(extension)`. */
export async function uploadImage(
  supabase: AuthClient,
  file: File,
  pathFor: (extension: string) => string,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const check = checkImageUpload(file.size, head);
  if (!check.ok) {
    if (check.error === "too_large") return { ok: false, error: k.imageTooLarge(toBanglaDigits(MAX_IMAGE_BYTES / 1024 / 1024)) };
    return { ok: false, error: check.error === "bad_type" ? k.imageBadType : k.imageUnreadable };
  }

  const path = pathFor(check.extension);
  const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).upload(path, file, {
    contentType: check.type, // the detected type, not the browser's claim
    cacheControl: "31536000", // safe: every upload gets a new file name
    upsert: false,
  });
  if (error) {
    console.error("image upload failed", "statusCode" in error ? error.statusCode : undefined);
    return { ok: false, error: k.imageUploadFailed };
  }
  return { ok: true, path };
}

/** Best effort: a leftover file wastes space but never shows on the site. */
export async function removePaths(supabase: AuthClient, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).remove(paths);
  if (error) console.error("image cleanup failed", "statusCode" in error ? error.statusCode : undefined);
}

export async function removeProductImages(supabase: AuthClient, products: { id: string; image_path: string | null }[]) {
  const paths = new Set<string>();
  for (const product of products) {
    if (product.image_path) paths.add(product.image_path);
    const { data } = await supabase.storage.from(MENU_IMAGES_BUCKET).list(productImageFolder(product.id), { limit: 100 });
    for (const file of data ?? []) paths.add(`${productImageFolder(product.id)}/${file.name}`);
  }
  await removePaths(supabase, [...paths]);
}

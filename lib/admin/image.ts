/**
 * Menu image rules. The browser shrinks photos before upload (phone photos are often 3-10 MB);
 * the server re-checks the real file type from its first bytes and the size, and the storage
 * bucket enforces its own type and 5 MB limits as a last barrier.
 */

/** Largest file the server accepts (fits the 4.5 MB request limit on Vercel). */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** Largest photo the browser will try to shrink. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
/** Longest side after shrinking, in pixels. */
export const MAX_IMAGE_DIMENSION = 1600;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

const EXTENSIONS: Record<AcceptedImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Real type from the file's magic bytes (never trust the name or the browser's claim). */
export function detectImageType(head: Uint8Array): AcceptedImageType | null {
  const at = (i: number) => head[i];
  if (head.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (head.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b)) return "image/png";
  if (
    head.length >= 12 &&
    String.fromCharCode(at(0), at(1), at(2), at(3)) === "RIFF" &&
    String.fromCharCode(at(8), at(9), at(10), at(11)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export type ImageCheck =
  | { ok: true; type: AcceptedImageType; extension: string }
  | { ok: false; error: "empty" | "too_large" | "bad_type" };

export function checkImageUpload(size: number, head: Uint8Array): ImageCheck {
  if (size <= 0) return { ok: false, error: "empty" };
  if (size > MAX_IMAGE_BYTES) return { ok: false, error: "too_large" };
  const type = detectImageType(head);
  if (!type) return { ok: false, error: "bad_type" };
  return { ok: true, type, extension: EXTENSIONS[type] };
}

/** Scales (width, height) down to fit within max x max, keeping the aspect ratio. Never upscales. */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_DIMENSION): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Storage path for a product image. A new name per upload means caches never show an old photo. */
export function productImagePath(productId: string, fileId: string, extension: string): string {
  return `products/${productId}/${fileId}.${extension}`;
}

/** Folder holding every image of one product (removed when the product is deleted). */
export function productImageFolder(productId: string): string {
  return `products/${productId}`;
}

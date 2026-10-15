"use client";

import { fitWithin, MAX_IMAGE_DIMENSION } from "@/lib/admin/image";

/** Photos already this small (and within the size limit in pixels) are uploaded unchanged. */
const KEEP_AS_IS_BYTES = 800 * 1024;

/**
 * Shrinks a photo in the browser to at most 1600 px on its longest side (WebP, or JPEG where
 * WebP encoding is unsupported). Keeps uploads fast on mobile data and well under the server's
 * size limit. Throws if the browser cannot decode the file.
 */
export async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_IMAGE_DIMENSION);
    if (width === bitmap.width && height === bitmap.height && file.size <= KEEP_AS_IS_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");

    const encode = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.85));
    context.drawImage(bitmap, 0, 0, width, height);
    let blob = await encode("image/webp");
    if (!blob || blob.type !== "image/webp") {
      // JPEG has no transparency: paint a white background first.
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      blob = await encode("image/jpeg");
    }
    if (!blob) throw new Error("encode failed");
    // Never make a small file bigger.
    if (blob.size >= file.size && width === bitmap.width) return file;
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `photo.${extension}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

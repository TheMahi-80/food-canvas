import { describe, expect, it } from "vitest";
import { checkImageUpload, detectImageType, fitWithin, MAX_IMAGE_BYTES, productImagePath } from "./image";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => [...text].map((ch) => ch.charCodeAt(0));
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const WEBP = bytes(...ascii("RIFF"), 1, 2, 3, 4, ...ascii("WEBP"));

describe("detectImageType", () => {
  it("recognizes JPEG, PNG and WebP by their first bytes", () => {
    expect(detectImageType(JPEG)).toBe("image/jpeg");
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(WEBP)).toBe("image/webp");
  });

  it("rejects everything else, whatever the file is called", () => {
    expect(detectImageType(bytes(...ascii("GIF89a")))).toBeNull();
    expect(detectImageType(bytes(...ascii("<svg xmlns")))).toBeNull();
    expect(detectImageType(bytes(...ascii("%PDF-1.7")))).toBeNull();
    expect(detectImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")))).toBeNull();
    expect(detectImageType(bytes(0xff, 0xd8))).toBeNull();
    expect(detectImageType(bytes())).toBeNull();
  });
});

describe("checkImageUpload", () => {
  it("accepts a real image within the limit and picks the extension from the content", () => {
    expect(checkImageUpload(1000, PNG)).toEqual({ ok: true, type: "image/png", extension: "png" });
    expect(checkImageUpload(MAX_IMAGE_BYTES, JPEG)).toEqual({ ok: true, type: "image/jpeg", extension: "jpg" });
  });

  it("rejects empty, oversized and non-image files", () => {
    expect(checkImageUpload(0, JPEG)).toEqual({ ok: false, error: "empty" });
    expect(checkImageUpload(MAX_IMAGE_BYTES + 1, JPEG)).toEqual({ ok: false, error: "too_large" });
    expect(checkImageUpload(100, bytes(...ascii("<html>")))).toEqual({ ok: false, error: "bad_type" });
  });

  it("keeps the server limit under Vercel's 4.5 MB request cap", () => {
    expect(MAX_IMAGE_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });
});

describe("fitWithin", () => {
  it("shrinks the longest side to the maximum and keeps the aspect ratio", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(1600, 900)).toEqual({ width: 1600, height: 900 });
  });

  it("never upscales and never returns zero", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(10000, 1)).toEqual({ width: 1600, height: 1 });
  });
});

it("builds storage paths the bucket policy and products.image_path constraint accept", () => {
  const path = productImagePath("8f0c1f8e-6d1a-4f43-9a51-0d9d6f1c2b11", "0e7c3c42-34a8-4d1b-9a43-2b2f1c9d8e7f", "webp");
  expect(path).toMatch(/^products\/[A-Za-z0-9/_.-]+$/);
  expect(path.length).toBeLessThanOrEqual(300);
});

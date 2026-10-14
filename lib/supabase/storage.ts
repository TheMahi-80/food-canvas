export const MENU_IMAGES_BUCKET = "menu-images";

/** Public URL for an object in the menu-images bucket, or null if Supabase is not configured. */
export function menuImageUrl(path: string | null): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${MENU_IMAGES_BUCKET}/${encoded}`;
}

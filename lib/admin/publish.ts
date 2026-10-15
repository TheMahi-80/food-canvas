import "server-only";
import { refresh, updateTag } from "next/cache";
import { MENU_CACHE_TAG } from "@/lib/menu/queries";

/**
 * Call after every successful admin write (inside the Server Action): expires the public
 * menu/settings cache so customers see the change on their next request, and refreshes the admin page.
 */
export function published() {
  updateTag(MENU_CACHE_TAG);
  refresh();
}

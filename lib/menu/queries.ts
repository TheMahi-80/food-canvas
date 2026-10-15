import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { PublicMenu, SiteInfo } from "@/types/menu";
import { fallbackHours, fallbackSettings, mapCategory, mapDiscount, mapHours, mapProduct, mapSettings } from "./mappers";

/**
 * Cache tag for all public menu/settings data. Every admin mutation must call
 * updateTag(MENU_CACHE_TAG) so prices and availability are never stale after an edit.
 * Without an admin edit (e.g. a change made directly in Supabase), data refreshes within ~5 minutes.
 */
export const MENU_CACHE_TAG = "menu";

const CACHE_PROFILE = { stale: 60, revalidate: 300, expire: 3600 };

export class MenuLoadError extends Error {
  constructor() {
    super("Could not load the menu.");
    this.name = "MenuLoadError";
  }
}

/** Active categories, active products (with variants/add-ons) and public discounts. Throws MenuLoadError. */
export async function getPublicMenu(): Promise<PublicMenu> {
  "use cache";
  cacheTag(MENU_CACHE_TAG);
  cacheLife(CACHE_PROFILE);

  const supabase = createPublicClient();
  const [categories, products, discounts] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name_bn"),
    supabase.from("products").select("*, product_variants(*), product_addons(*)").order("sort_order").order("name_bn"),
    supabase.from("discounts").select("*"),
  ]);

  if (categories.error || products.error || discounts.error) {
    // Log only the error codes; never secrets or customer data.
    console.error("getPublicMenu failed", categories.error?.code, products.error?.code, discounts.error?.code);
    throw new MenuLoadError();
  }

  return {
    categories: categories.data.map(mapCategory),
    items: products.data.map(mapProduct),
    discounts: discounts.data.map(mapDiscount),
    fetchedAt: Date.now(),
  };
}

async function loadSiteInfo(): Promise<SiteInfo> {
  "use cache";
  cacheTag(MENU_CACHE_TAG);
  cacheLife(CACHE_PROFILE);

  const supabase = createPublicClient();
  const [settings, hours] = await Promise.all([
    supabase.from("restaurant_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("opening_hours").select("*"),
  ]);
  if (settings.error || hours.error || !settings.data) {
    console.error("getSiteInfo failed", settings.error?.code, hours.error?.code);
    throw new MenuLoadError();
  }
  return {
    settings: mapSettings(settings.data),
    hours: hours.data.length === 7 ? mapHours(hours.data) : fallbackHours(),
  };
}

/**
 * Settings + opening hours for the header/footer/contact. Never throws: falls back to the
 * confirmed defaults (WhatsApp number, 3 PM-10 PM daily) so the site shell always renders.
 * The fallback is not cached; the next request retries the database.
 */
export async function getSiteInfo(): Promise<SiteInfo> {
  try {
    return await loadSiteInfo();
  } catch {
    return { settings: fallbackSettings(), hours: fallbackHours() };
  }
}

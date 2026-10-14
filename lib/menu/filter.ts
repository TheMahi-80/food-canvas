/** Pure search / filter / sort for the public menu. URL query params are the source of truth. */
import { toAsciiDigits } from "@/lib/validation/customer";
import type { MenuCategory, MenuItem } from "@/types/menu";

export type MenuSort = "default" | "price_asc" | "price_desc";

export interface MenuFilters {
  query: string;
  /** Category slug, or null for "all". */
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  availableOnly: boolean;
  sort: MenuSort;
}

export const DEFAULT_FILTERS: MenuFilters = {
  query: "",
  category: null,
  minPrice: null,
  maxPrice: null,
  availableOnly: false,
  sort: "default",
};

const SORTS: readonly MenuSort[] = ["default", "price_asc", "price_desc"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_QUERY = 80;

function parsePrice(value: string | null): number | null {
  if (value === null) return null;
  const digits = toAsciiDigits(value).trim();
  if (!/^\d{1,7}$/.test(digits)) return null;
  return Number(digits);
}

/** Reads filters from URL search params. Invalid values fall back to defaults (never throws). */
export function parseFilters(params: URLSearchParams): MenuFilters {
  const sort = params.get("sort");
  const category = params.get("category");
  return {
    query: (params.get("q") ?? "").slice(0, MAX_QUERY),
    category: category && SLUG.test(category) ? category : null,
    minPrice: parsePrice(params.get("min")),
    maxPrice: parsePrice(params.get("max")),
    availableOnly: params.get("available") === "1",
    sort: SORTS.includes(sort as MenuSort) ? (sort as MenuSort) : "default",
  };
}

/** Serializes filters to a query string ("" when everything is default). */
export function filtersToSearch(filters: MenuFilters): string {
  const params = new URLSearchParams();
  // Keep the raw query (incl. a trailing space being typed); blank queries are dropped.
  if (filters.query.trim()) params.set("q", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.minPrice !== null) params.set("min", String(filters.minPrice));
  if (filters.maxPrice !== null) params.set("max", String(filters.maxPrice));
  if (filters.availableOnly) params.set("available", "1");
  if (filters.sort !== "default") params.set("sort", filters.sort);
  const s = params.toString();
  return s ? `?${s}` : "";
}

export function hasActiveFilters(filters: MenuFilters): boolean {
  return filtersToSearch(filters) !== "";
}

/** Lowercase, NFC, ASCII digits, single spaces. */
export function normalizeSearchText(text: string): string {
  return toAsciiDigits(text.normalize("NFC").toLowerCase()).replace(/\s+/g, " ").trim();
}

/**
 * Applies search, category, price, availability and sort. All filters combine (AND).
 * Search matches when every word appears in the Bangla/English name, description or category name.
 * `priceOf` returns the price used for price filters and sorting (the displayed card price).
 */
export function filterMenuItems(
  items: readonly MenuItem[],
  categories: readonly MenuCategory[],
  filters: MenuFilters,
  priceOf: (item: MenuItem) => number,
): MenuItem[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const selected = filters.category ? categories.find((c) => c.slug === filters.category) : null;
  const terms = normalizeSearchText(filters.query).split(" ").filter(Boolean);

  const result = items.filter((item) => {
    const category = categoryById.get(item.categoryId);
    if (!category) return false; // category hidden or missing
    if (filters.category && (!selected || item.categoryId !== selected.id)) return false;
    if (filters.availableOnly && !item.isAvailable) return false;
    const price = priceOf(item);
    if (filters.minPrice !== null && price < filters.minPrice) return false;
    if (filters.maxPrice !== null && price > filters.maxPrice) return false;
    if (terms.length > 0) {
      const haystack = normalizeSearchText(
        [item.nameBn, item.nameEn, item.descriptionBn, item.descriptionEn, category.nameBn, category.nameEn].filter(Boolean).join(" "),
      );
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });

  const categoryOrder = (item: MenuItem) => categoryById.get(item.categoryId)?.sortOrder ?? 0;
  const defaultOrder = (a: MenuItem, b: MenuItem) =>
    categoryOrder(a) - categoryOrder(b) || a.sortOrder - b.sortOrder || a.nameBn.localeCompare(b.nameBn, "bn");

  return result.sort((a, b) => {
    if (filters.sort === "price_asc") return priceOf(a) - priceOf(b) || defaultOrder(a, b);
    if (filters.sort === "price_desc") return priceOf(b) - priceOf(a) || defaultOrder(a, b);
    return defaultOrder(a, b);
  });
}

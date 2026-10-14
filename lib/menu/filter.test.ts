import { describe, expect, it } from "vitest";
import type { MenuCategory, MenuItem } from "@/types/menu";
import { DEFAULT_FILTERS, filterMenuItems, filtersToSearch, hasActiveFilters, normalizeSearchText, parseFilters, type MenuFilters } from "./filter";

const categories: MenuCategory[] = [
  { id: "c-burger", slug: "burgers", nameBn: "বার্গার", nameEn: "Burgers", sortOrder: 10 },
  { id: "c-drinks", slug: "drinks", nameBn: "ড্রিংকস", nameEn: "Drinks", sortOrder: 20 },
];

function item(overrides: Partial<MenuItem> & Pick<MenuItem, "id" | "categoryId" | "nameBn" | "price">): MenuItem {
  return {
    slug: overrides.id,
    nameEn: null,
    descriptionBn: null,
    descriptionEn: null,
    imagePath: null,
    isAvailable: true,
    isFeatured: false,
    sortOrder: 0,
    variants: [],
    addons: [],
    ...overrides,
  };
}

const items: MenuItem[] = [
  item({ id: "coffee", categoryId: "c-drinks", nameBn: "কোল্ড কফি", nameEn: "Cold Coffee", price: 120, sortOrder: 1 }),
  item({ id: "chicken", categoryId: "c-burger", nameBn: "চিকেন বার্গার", nameEn: "Chicken Burger", price: 180, sortOrder: 2, descriptionBn: "ঝাল সস সহ" }),
  item({ id: "beef", categoryId: "c-burger", nameBn: "বিফ বার্গার", nameEn: "Beef Burger", price: 220, sortOrder: 1, isAvailable: false }),
  item({ id: "lassi", categoryId: "c-drinks", nameBn: "লাচ্ছি", price: 80, sortOrder: 2 }),
  item({ id: "orphan", categoryId: "c-hidden", nameBn: "লুকানো", price: 50 }),
];

const run = (patch: Partial<MenuFilters>, priceOf = (i: MenuItem) => i.price) =>
  filterMenuItems(items, categories, { ...DEFAULT_FILTERS, ...patch }, priceOf).map((i) => i.id);

describe("filterMenuItems", () => {
  it("default: every visible item, ordered by category then item sort order; hides items of hidden categories", () => {
    expect(run({})).toEqual(["beef", "chicken", "coffee", "lassi"]);
  });

  it("search matches Bangla and English names, descriptions and category names, case-insensitively", () => {
    expect(run({ query: "বার্গার" })).toEqual(["beef", "chicken"]);
    expect(run({ query: "COFFEE" })).toEqual(["coffee"]);
    expect(run({ query: "ঝাল" })).toEqual(["chicken"]);
    expect(run({ query: "drinks" })).toEqual(["coffee", "lassi"]);
  });

  it("multi-word search requires every word", () => {
    expect(run({ query: "chicken burger" })).toEqual(["chicken"]);
    expect(run({ query: "chicken coffee" })).toEqual([]);
  });

  it("category filter by slug; unknown slug shows nothing", () => {
    expect(run({ category: "drinks" })).toEqual(["coffee", "lassi"]);
    expect(run({ category: "nope" })).toEqual([]);
  });

  it("price range is inclusive and uses the displayed (discounted) price", () => {
    expect(run({ minPrice: 120, maxPrice: 180 })).toEqual(["chicken", "coffee"]);
    const discounted = (i: MenuItem) => (i.id === "beef" ? 150 : i.price);
    expect(run({ maxPrice: 160 }, discounted)).toEqual(["beef", "coffee", "lassi"]);
  });

  it("availability filter hides unavailable items", () => {
    expect(run({ availableOnly: true })).toEqual(["chicken", "coffee", "lassi"]);
  });

  it("sorts by price both ways (ties keep menu order)", () => {
    expect(run({ sort: "price_asc" })).toEqual(["lassi", "coffee", "chicken", "beef"]);
    expect(run({ sort: "price_desc" })).toEqual(["beef", "chicken", "coffee", "lassi"]);
  });

  it("all filters combine", () => {
    expect(run({ query: "burger", availableOnly: true, maxPrice: 200, category: "burgers", sort: "price_desc" })).toEqual(["chicken"]);
  });

  it("does not mutate the input", () => {
    const before = items.map((i) => i.id);
    run({ sort: "price_asc" });
    expect(items.map((i) => i.id)).toEqual(before);
  });
});

describe("URL <-> filters", () => {
  it("round-trips", () => {
    const f: MenuFilters = { query: "চিকেন", category: "burgers", minPrice: 100, maxPrice: 300, availableOnly: true, sort: "price_asc" };
    expect(parseFilters(new URLSearchParams(filtersToSearch(f)))).toEqual(f);
  });

  it("default filters serialize to an empty string", () => {
    expect(filtersToSearch(DEFAULT_FILTERS)).toBe("");
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(filtersToSearch({ ...DEFAULT_FILTERS, query: "   " })).toBe("");
  });

  it("keeps a trailing space while typing", () => {
    expect(parseFilters(new URLSearchParams(filtersToSearch({ ...DEFAULT_FILTERS, query: "chicken " }))).query).toBe("chicken ");
  });

  it("ignores invalid or hostile values", () => {
    const f = parseFilters(new URLSearchParams("category=<script>&min=-5&max=abc&sort=evil&available=yes&q=" + "x".repeat(500)));
    expect(f).toEqual({ ...DEFAULT_FILTERS, query: "x".repeat(80) });
  });

  it("accepts Bangla digits in prices", () => {
    expect(parseFilters(new URLSearchParams("min=১০০&max=২৫০"))).toMatchObject({ minPrice: 100, maxPrice: 250 });
  });
});

describe("normalizeSearchText", () => {
  it("lowercases, converts Bangla digits, collapses spaces", () => {
    expect(normalizeSearchText("  Chicken   ১২ ইঞ্চি ")).toBe("chicken 12 ইঞ্চি");
  });
});

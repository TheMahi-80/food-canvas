import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  deleteCategorySchema,
  productInputSchema,
  reorderSchema,
  slugify,
  slugWithSuffix,
  takaSchema,
  toAsciiDigits,
  toggleSchema,
} from "./admin-menu";

const CAT = "8f0c1f8e-6d1a-4f43-9a51-0d9d6f1c2b11";
const VAR = "1b2f9a4e-3c5d-4e6f-8a7b-9c0d1e2f3a4b";

const baseProduct = {
  categoryId: CAT,
  nameBn: "চিকেন বার্গার",
  nameEn: "Chicken Burger",
  descriptionBn: "",
  descriptionEn: "",
  price: "180",
  isActive: true,
  isAvailable: true,
  isFeatured: false,
  variants: [],
  addons: [],
  removeImage: false,
};

describe("takaSchema", () => {
  it.each([
    ["180", 180],
    ["১৮০", 180],
    ["৳1,250", 1250],
    [" ১,২৫০ ", 1250],
    [0, 0],
    ["0", 0],
  ])("accepts %j -> %d", (input, expected) => {
    expect(takaSchema.parse(input)).toBe(expected);
  });

  it.each([["", "দাম লিখুন।"], ["abc", "শুধু সংখ্যায়"], ["12.5", "পূর্ণ টাকায়"], ["-5", "শূন্যের কম"], ["1000001", "অনেক বেশি"], [Number.NaN, ""]])(
    "rejects %j",
    (input, message) => {
      const result = takaSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (message) expect(result.error!.issues[0].message).toContain(message);
    },
  );

  it("converts Bangla digits", () => {
    expect(toAsciiDigits("০১২৩৪৫৬৭৮৯")).toBe("0123456789");
  });
});

describe("categoryInputSchema", () => {
  it("trims names and turns an empty English name into null", () => {
    expect(categoryInputSchema.parse({ nameBn: "  বার্গার ", nameEn: "  ", isActive: true })).toEqual({
      nameBn: "বার্গার",
      nameEn: null,
      isActive: true,
    });
  });

  it("requires a Bangla name and limits lengths to the database limits", () => {
    expect(categoryInputSchema.safeParse({ nameBn: "   ", nameEn: "", isActive: true }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ nameBn: "ক".repeat(81), nameEn: "", isActive: true }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ nameBn: "ক".repeat(80), nameEn: "a".repeat(81), isActive: true }).success).toBe(false);
  });
});

describe("productInputSchema", () => {
  it("parses a simple product (Bangla digits in price, empty optionals -> null)", () => {
    const parsed = productInputSchema.parse({ ...baseProduct, price: "১৮০" });
    expect(parsed).toMatchObject({ price: 180, descriptionBn: null, descriptionEn: null, nameEn: "Chicken Burger" });
  });

  it("requires a price when there are no sizes", () => {
    const result = productInputSchema.safeParse({ ...baseProduct, price: "" });
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((i) => i.path.join("."))).toContain("price");
  });

  it("reports the price error together with other errors on the first submit", () => {
    const result = productInputSchema.safeParse({ ...baseProduct, nameBn: "", price: "" });
    expect(result.success).toBe(false);
    const byPath = Object.fromEntries(result.error!.issues.map((i) => [i.path.join("."), i.message]));
    expect(byPath).toMatchObject({ nameBn: "এই ঘরটি পূরণ করুন।", price: "দাম লিখুন।" });
    const wrongPrice = productInputSchema.safeParse({ ...baseProduct, nameBn: "", price: "১২.৫" });
    expect(wrongPrice.error!.issues.find((i) => i.path[0] === "price")?.message).toBe("দাম পূর্ণ টাকায় লিখুন, পয়সা ছাড়া।");
  });

  it("uses the lowest size price as the base price and ignores the price field", () => {
    const parsed = productInputSchema.parse({
      ...baseProduct,
      price: "",
      variants: [
        { id: VAR, nameBn: "বড়", nameEn: "", price: "350", isAvailable: true },
        { id: null, nameBn: "ছোট", nameEn: "Small", price: "২২০", isAvailable: false },
      ],
    });
    expect(parsed.price).toBe(220);
    expect(parsed.variants).toEqual([
      { id: VAR, nameBn: "বড়", nameEn: null, price: 350, isAvailable: true },
      { id: null, nameBn: "ছোট", nameEn: "Small", price: 220, isAvailable: false },
    ]);
  });

  it("rejects duplicate size or extra names (case/space-insensitive) at the right field", () => {
    const result = productInputSchema.safeParse({
      ...baseProduct,
      addons: [
        { id: null, nameBn: "Cheese", nameEn: "", price: "30", isAvailable: true },
        { id: null, nameBn: " cheese ", nameEn: "", price: "40", isAvailable: true },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.error!.issues.map((i) => i.path.join("."))).toEqual(["addons.1.nameBn"]);
  });

  it("rejects bad option prices, unknown categories and option ids that are not uuids", () => {
    const bad = (patch: object) => productInputSchema.safeParse({ ...baseProduct, ...patch }).success;
    expect(bad({ variants: [{ id: null, nameBn: "ছোট", nameEn: "", price: "-1", isAvailable: true }] })).toBe(false);
    expect(bad({ addons: [{ id: "x", nameBn: "চিজ", nameEn: "", price: "1", isAvailable: true }] })).toBe(false);
    expect(bad({ categoryId: "" })).toBe(false);
    expect(bad({ categoryId: "not-a-uuid" })).toBe(false);
    expect(bad({ descriptionBn: "ক".repeat(601) })).toBe(false);
  });

  it("limits the number of sizes and extras", () => {
    const option = (i: number) => ({ id: null, nameBn: `সাইজ ${i}`, nameEn: "", price: "10", isAvailable: true });
    expect(productInputSchema.safeParse({ ...baseProduct, variants: Array.from({ length: 21 }, (_, i) => option(i)) }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...baseProduct, variants: Array.from({ length: 20 }, (_, i) => option(i)) }).success).toBe(true);
  });

  it("is idempotent: the server re-parses what the browser produced", () => {
    const once = productInputSchema.parse({
      ...baseProduct,
      variants: [{ id: VAR, nameBn: "বড়", nameEn: "", price: "350", isAvailable: true }],
    });
    expect(productInputSchema.parse(JSON.parse(JSON.stringify(once)))).toEqual(once);
  });

  it("does not accept extra fields as product data (e.g. a slug or id smuggled in)", () => {
    const parsed = productInputSchema.parse({ ...baseProduct, slug: "evil", id: VAR, image_path: "x" });
    expect(parsed).not.toHaveProperty("slug");
    expect(parsed).not.toHaveProperty("id");
    expect(parsed).not.toHaveProperty("image_path");
  });
});

describe("deleteCategorySchema", () => {
  it("requires an explicit choice with its details", () => {
    expect(deleteCategorySchema.safeParse({ id: CAT, mode: "empty" }).success).toBe(true);
    expect(deleteCategorySchema.safeParse({ id: CAT, mode: "reassign" }).success).toBe(false);
    expect(deleteCategorySchema.safeParse({ id: CAT, mode: "reassign", targetId: VAR }).success).toBe(true);
    expect(deleteCategorySchema.safeParse({ id: CAT, mode: "delete_products" }).success).toBe(false);
    expect(deleteCategorySchema.safeParse({ id: CAT, mode: "delete_products", confirmCount: 3 }).success).toBe(true);
    expect(deleteCategorySchema.safeParse({ id: CAT, mode: "orphan" }).success).toBe(false);
  });
});

describe("reorder and toggle schemas", () => {
  it("rejects duplicates, empty lists and non-uuids", () => {
    expect(reorderSchema.safeParse([CAT, VAR]).success).toBe(true);
    expect(reorderSchema.safeParse([CAT, CAT]).success).toBe(false);
    expect(reorderSchema.safeParse([]).success).toBe(false);
    expect(reorderSchema.safeParse(["1"]).success).toBe(false);
  });

  it("only allows the three product switches", () => {
    expect(toggleSchema.safeParse({ id: CAT, field: "is_available", value: false }).success).toBe(true);
    expect(toggleSchema.safeParse({ id: CAT, field: "price", value: 0 }).success).toBe(false);
    expect(toggleSchema.safeParse({ id: CAT, field: "category_id", value: true }).success).toBe(false);
  });
});

describe("slugs", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Chicken Burger")).toBe("chicken-burger");
    expect(slugify("  Fish & Chips!! ")).toBe("fish-and-chips");
    expect(slugify("Café Latté")).toBe("cafe-latte");
    expect(slugify("বার্গার")).toBe("");
    expect(slugify(null)).toBe("");
    expect(slugify("a".repeat(100)).length).toBe(60);
  });

  it("falls back for Bangla-only names and always matches the database pattern", () => {
    expect(slugWithSuffix("বার্গার", "category", "")).toBe("category");
    expect(slugWithSuffix("Burgers", "category", "")).toBe("burgers");
    expect(slugWithSuffix("Burgers", "item", "a1b2c3")).toBe("burgers-a1b2c3");
    expect(slugWithSuffix("--", "item", "ff00aa")).toBe("item-ff00aa");
    expect(slugWithSuffix("x-".repeat(40), "item", "ab12cd")).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

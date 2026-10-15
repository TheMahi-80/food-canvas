import { describe, expect, it } from "vitest";
import { fallbackHours, fallbackSettings, mapHours, mapProduct, type ProductWithOptionsRow } from "./mappers";

const ts = "2026-10-14T00:00:00Z";

describe("mappers", () => {
  it("maps a product row with options sorted by sort_order", () => {
    const row: ProductWithOptionsRow = {
      id: "p1", category_id: "c1", slug: "s", name_bn: "নাম", name_en: null, description_bn: null, description_en: null,
      price: 100, image_path: null, is_active: true, is_available: true, is_featured: true, sort_order: 1,
      created_at: ts, updated_at: ts,
      product_variants: [
        { id: "v2", product_id: "p1", name_bn: "বড়", name_en: null, price: 200, is_available: true, sort_order: 20, created_at: ts, updated_at: ts },
        { id: "v1", product_id: "p1", name_bn: "ছোট", name_en: null, price: 100, is_available: true, sort_order: 10, created_at: ts, updated_at: ts },
      ],
      product_addons: null,
    };
    const item = mapProduct(row);
    expect(item.variants.map((v) => v.id)).toEqual(["v1", "v2"]);
    expect(item.addons).toEqual([]);
    expect(item).toMatchObject({ id: "p1", categoryId: "c1", isFeatured: true, price: 100 });
  });

  it("maps Postgres time strings to HH:MM and sorts days", () => {
    const rows = [6, 0].map((d) => ({ day_of_week: d, opens_at: "15:00:00", closes_at: "22:00:00", is_closed: false, created_at: ts, updated_at: ts }));
    expect(mapHours(rows)).toEqual([
      { dayOfWeek: 0, opensAt: "15:00", closesAt: "22:00", isClosed: false },
      { dayOfWeek: 6, opensAt: "15:00", closesAt: "22:00", isClosed: false },
    ]);
  });

  it("fallbacks use only confirmed facts", () => {
    expect(fallbackSettings()).toMatchObject({
      whatsappNumber: "8801845690533",
      deliveryFee: null,
      minOrder: null,
      addressBn: null,
      mapUrl: null,
    });
    expect(fallbackHours()).toHaveLength(7);
  });
});

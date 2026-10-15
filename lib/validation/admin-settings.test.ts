import { describe, expect, it } from "vitest";
import { DEFAULT_OPENING_HOURS } from "@/lib/hours";
import { boolToTri, hoursInputSchema, settingsInputSchema, triToBool, whatsappNumberSchema } from "./admin-settings";

const base = {
  restaurantName: "Food Canvas",
  whatsappNumber: "01845690533",
  contactPhone: "",
  email: "",
  facebookUrl: "",
  addressBn: "",
  mapUrl: "",
  temporarilyClosed: false,
  closureNoteBn: "",
  deliveryEnabled: "unknown",
  pickupEnabled: "unknown",
  deliveryFee: "",
  minOrder: "",
  heroHeadlineBn: "পছন্দের খাবার, এখন আপনার হাতের নাগালে।",
  heroSubtextBn: "",
  aboutBn: "",
  removeHeroImage: false,
};

describe("whatsappNumberSchema", () => {
  it.each(["01845690533", "+8801845690533", "8801845690533", "০১৮৪৫৬৯০৫৩৩", "+880 1845-690533"])("normalizes %s", (input) => {
    expect(whatsappNumberSchema.parse(input)).toBe("8801845690533");
  });
  it.each(["", "1845690533", "01245690533", "018456905", "+1 555 0100", "8801845690533/x"])("rejects %j", (input) => {
    expect(whatsappNumberSchema.safeParse(input).success).toBe(false);
  });
});

describe("settingsInputSchema", () => {
  it("keeps unknown business facts as null (to be confirmed)", () => {
    const s = settingsInputSchema.parse(base);
    expect(s).toMatchObject({
      whatsappNumber: "8801845690533",
      contactPhone: null,
      email: null,
      addressBn: null,
      mapUrl: null,
      deliveryEnabled: null,
      pickupEnabled: null,
      deliveryFee: null,
      minOrder: null,
      heroSubtextBn: "",
    });
  });

  it("parses fees with Bangla digits and tri-state switches", () => {
    const s = settingsInputSchema.parse({ ...base, deliveryEnabled: "yes", pickupEnabled: "no", deliveryFee: "৳৪০", minOrder: "300" });
    expect(s).toMatchObject({ deliveryEnabled: true, pickupEnabled: false, deliveryFee: 40, minOrder: 300 });
  });

  it("only accepts https links (no http, javascript: or junk)", () => {
    expect(settingsInputSchema.safeParse({ ...base, mapUrl: "https://maps.app.goo.gl/abc" }).success).toBe(true);
    for (const bad of ["http://maps.google.com", "javascript:alert(1)", "maps.google.com", "https://"]) {
      expect(settingsInputSchema.safeParse({ ...base, mapUrl: bad }).success).toBe(false);
      expect(settingsInputSchema.safeParse({ ...base, facebookUrl: bad }).success).toBe(false);
    }
  });

  it("validates email, phone, negative fees and required headline", () => {
    expect(settingsInputSchema.safeParse({ ...base, email: "not-an-email" }).success).toBe(false);
    expect(settingsInputSchema.safeParse({ ...base, contactPhone: "call me" }).success).toBe(false);
    expect(settingsInputSchema.parse({ ...base, contactPhone: "০১৮৪৫-৬৯০৫৩৩" }).contactPhone).toBe("01845-690533");
    expect(settingsInputSchema.safeParse({ ...base, deliveryFee: "-10" }).success).toBe(false);
    expect(settingsInputSchema.safeParse({ ...base, deliveryFee: "100001" }).success).toBe(false);
    expect(settingsInputSchema.safeParse({ ...base, heroHeadlineBn: "  " }).success).toBe(false);
  });

  it("tri-state helpers round-trip", () => {
    for (const v of [true, false, null]) expect(triToBool(boolToTri(v))).toBe(v);
  });
});

describe("hoursInputSchema", () => {
  it("accepts the confirmed default schedule", () => {
    expect(hoursInputSchema.parse(DEFAULT_OPENING_HOURS)).toHaveLength(7);
  });

  it("rejects closing before opening, bad times, wrong day order or count", () => {
    const days = DEFAULT_OPENING_HOURS.map((d) => ({ ...d }));
    expect(hoursInputSchema.safeParse(days.map((d, i) => (i === 2 ? { ...d, closesAt: "14:00" } : d))).success).toBe(false);
    expect(hoursInputSchema.safeParse(days.map((d, i) => (i === 2 ? { ...d, opensAt: "25:00" } : d))).success).toBe(false);
    expect(hoursInputSchema.safeParse([...days].reverse()).success).toBe(false);
    expect(hoursInputSchema.safeParse(days.slice(0, 6)).success).toBe(false);
  });

  it("allows a day closed all day", () => {
    expect(hoursInputSchema.safeParse(DEFAULT_OPENING_HOURS.map((d) => ({ ...d, isClosed: d.dayOfWeek === 5 }))).success).toBe(true);
  });
});

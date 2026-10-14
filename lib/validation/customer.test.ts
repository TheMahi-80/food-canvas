import { describe, expect, it } from "vitest";
import { customerDetailsSchema, formatBdPhone, normalizeBdPhone, toAsciiDigits } from "./customer";

describe("normalizeBdPhone", () => {
  it.each([
    ["01712345678", "+8801712345678"],
    ["+8801712345678", "+8801712345678"],
    ["8801712345678", "+8801712345678"],
    ["008801712345678", "+8801712345678"],
    ["017-1234-5678", "+8801712345678"],
    ["+880 1712 345678", "+8801712345678"],
    ["(017) 12.345.678", "+8801712345678"],
    ["০১৮৪৫৬৯০৫৩৩", "+8801845690533"],
    ["+৮৮০১৩১২৩৪৫৬৭৮", "+8801312345678"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeBdPhone(input)).toBe(expected);
  });

  it.each([
    "",
    "0171234567", // too short
    "017123456789", // too long
    "01212345678", // 012 is not a mobile prefix
    "02123456789",
    "+911712345678",
    "1712345678", // missing leading 0
    "01712a45678",
    "+88 +01712345678",
  ])("rejects %j", (input) => {
    expect(normalizeBdPhone(input)).toBeNull();
  });
});

describe("helpers", () => {
  it("toAsciiDigits", () => {
    expect(toAsciiDigits("০১২৩৪৫৬৭৮৯")).toBe("0123456789");
  });
  it("formatBdPhone", () => {
    expect(formatBdPhone("+8801712345678")).toBe("+880 1712-345678");
  });
});

describe("customerDetailsSchema", () => {
  it("accepts and normalizes valid details", () => {
    expect(customerDetailsSchema.parse({ name: "  রহিম   উদ্দিন ", phone: "01712-345678" })).toEqual({
      name: "রহিম উদ্দিন",
      phone: "+8801712345678",
    });
  });

  it("accepts English names and names with . ' -", () => {
    expect(customerDetailsSchema.safeParse({ name: "Md. Abdul-Karim O'Neil", phone: "01812345678" }).success).toBe(true);
  });

  it("accepts Bangla names with conjuncts and vowel signs", () => {
    expect(customerDetailsSchema.safeParse({ name: "স্বপ্নীল চক্রবর্তী", phone: "01812345678" }).success).toBe(true);
  });

  it("rejects bad names with Bangla messages", () => {
    const cases: Array<[string, string]> = [
      ["", "আপনার নাম লিখুন"],
      ["   ", "আপনার নাম লিখুন"],
      ["A", "নাম কমপক্ষে ২ অক্ষরের হতে হবে"],
      ["x".repeat(61), "নাম ৬০ অক্ষরের মধ্যে রাখুন"],
      ["https://spam.example", "নামে অপ্রয়োজনীয় চিহ্ন বা লিংক রাখবেন না"],
      ["Rahim\nPrice: ৳0", "নামে অপ্রয়োজনীয় চিহ্ন বা লিংক রাখবেন না"],
    ];
    for (const [name, message] of cases) {
      const r = customerDetailsSchema.safeParse({ name, phone: "01712345678" });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].message).toBe(message);
    }
  });

  it("rejects bad phones with a Bangla message", () => {
    const empty = customerDetailsSchema.safeParse({ name: "Rahim", phone: " " });
    expect(empty.error?.issues[0].message).toBe("আপনার হোয়াটসঅ্যাপ নম্বর লিখুন");
    const bad = customerDetailsSchema.safeParse({ name: "Rahim", phone: "12345" });
    expect(bad.error?.issues[0].message).toBe("সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)");
  });
});

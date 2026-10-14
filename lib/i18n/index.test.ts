import { describe, expect, it } from "vitest";
import { messages, toBanglaDigits } from "./index";

describe("toBanglaDigits", () => {
  it("converts every ASCII digit", () => {
    expect(toBanglaDigits("0123456789")).toBe("০১২৩৪৫৬৭৮৯");
  });

  it("accepts numbers", () => {
    expect(toBanglaDigits(180)).toBe("১৮০");
  });

  it("keeps non-digit characters untouched", () => {
    expect(toBanglaDigits("৳1,250 Burger")).toBe("৳১,২৫০ Burger");
  });
});

describe("messages", () => {
  it("uses the confirmed default opening-hours copy", () => {
    expect(messages.hours.everyDayDefault).toBe("প্রতিদিন: বিকাল ৩টা – রাত ১০টা");
  });

  it("matches the preferred copy table in CLAUDE.md", () => {
    const table: Array<[string, string]> = [
      [messages.nav.home, "হোম"],
      [messages.nav.menu, "মেনু"],
      [messages.nav.about, "আমাদের সম্পর্কে"],
      [messages.nav.contact, "যোগাযোগ"],
      [messages.actions.exploreMenu, "মেনু দেখুন"],
      [messages.actions.orderNow, "অর্ডার করুন"],
      [messages.actions.addToCart, "কার্টে যোগ করুন"],
      [messages.cart.title, "আপনার কার্ট"],
      [messages.menu.search, "খাবার খুঁজুন..."],
      [messages.menu.allItems, "সব খাবার"],
      [messages.menu.popularItems, "জনপ্রিয় খাবার"],
      [messages.menu.categories, "খাবারের ক্যাটাগরি"],
      [messages.menu.specialOffers, "বিশেষ অফার"],
      [messages.menu.available, "পাওয়া যাচ্ছে"],
      [messages.menu.unavailable, "এই মুহূর্তে নেই"],
      [messages.cart.subtotal, "সাবটোটাল"],
      [messages.cart.discount, "ছাড়"],
      [messages.cart.estimatedTotal, "আনুমানিক মোট"],
      [messages.customer.name, "আপনার নাম"],
      [messages.customer.whatsapp, "আপনার হোয়াটসঅ্যাপ নম্বর"],
      [messages.actions.continueToWhatsApp, "হোয়াটসঅ্যাপে অর্ডার করুন"],
      [messages.hours.title, "খোলার সময়"],
      [messages.hours.openNow, "এখন খোলা"],
      [messages.hours.closedNow, "এখন বন্ধ"],
      [messages.hero.headline, "পছন্দের খাবার, এখন আপনার হাতের নাগালে।"],
      [messages.hero.subtext, "CUET ও আশেপাশের সবার জন্য মজার খাবার, সহজ অর্ডার।"],
    ];
    for (const [actual, expected] of table) expect(actual).toBe(expected);
  });
});

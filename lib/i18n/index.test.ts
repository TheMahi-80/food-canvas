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
});

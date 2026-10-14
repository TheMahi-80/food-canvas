import { describe, expect, it } from "vitest";
import {
  DEFAULT_WHATSAPP_NUMBER,
  formatWhatsAppDisplay,
  getFallbackWhatsAppNumber,
  isValidWhatsAppDigits,
  whatsAppChatUrl,
} from "./number";

describe("isValidWhatsAppDigits", () => {
  it("accepts the confirmed number", () => {
    expect(isValidWhatsAppDigits("8801845690533")).toBe(true);
  });

  it.each(["01845690533", "+8801845690533", "880184569053", "8801245690533", "88018456905339", ""])(
    "rejects %j",
    (value) => {
      expect(isValidWhatsAppDigits(value)).toBe(false);
    },
  );
});

describe("getFallbackWhatsAppNumber", () => {
  it("uses the env value when valid", () => {
    expect(getFallbackWhatsAppNumber("8801711111111")).toBe("8801711111111");
  });

  it("falls back to the confirmed number when unset or invalid", () => {
    expect(getFallbackWhatsAppNumber(undefined)).toBe(DEFAULT_WHATSAPP_NUMBER);
    expect(getFallbackWhatsAppNumber("not-a-number")).toBe(DEFAULT_WHATSAPP_NUMBER);
  });
});

describe("formatting", () => {
  it("formats for display", () => {
    expect(formatWhatsAppDisplay("8801845690533")).toBe("+880 1845-690533");
  });

  it("builds the chat link for the restaurant number", () => {
    expect(whatsAppChatUrl("8801845690533")).toBe("https://wa.me/8801845690533");
  });
});

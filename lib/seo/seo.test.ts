import { describe, expect, it } from "vitest";
import { DEFAULT_OPENING_HOURS } from "@/lib/hours";
import { fallbackSettings } from "@/lib/menu/mappers";
import { buildLocalBusinessJsonLd, serializeJsonLd } from "./local-business";
import { resolveSiteUrl } from "./site-url";

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL, then Vercel's production domain, else null", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://foodcanvas.example/x?y" })?.href).toBe("https://foodcanvas.example/");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "", VERCEL_PROJECT_PRODUCTION_URL: "food-canvas.vercel.app" })?.href).toBe("https://food-canvas.vercel.app/");
    expect(resolveSiteUrl({})).toBeNull();
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "http://insecure.example" })).toBeNull();
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "not a url" })).toBeNull();
  });
});

describe("buildLocalBusinessJsonLd", () => {
  const settings = fallbackSettings();

  it("uses only confirmed facts when nothing else is configured", () => {
    const data = buildLocalBusinessJsonLd({ settings, hours: DEFAULT_OPENING_HOURS, siteUrl: null, description: "d" });
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "FastFoodRestaurant",
      name: "Food Canvas",
      description: "d",
      telephone: "+8801845690533",
      currenciesAccepted: "BDT",
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "15:00",
          closes: "22:00",
        },
      ],
      address: { "@type": "PostalAddress", addressLocality: "Chattogram", addressCountry: "BD" },
    });
  });

  it("never invents ratings, prices, street address, coordinates or reviews", () => {
    const json = JSON.stringify(buildLocalBusinessJsonLd({ settings, hours: DEFAULT_OPENING_HOURS, siteUrl: null, description: "d" }));
    for (const key of ["aggregateRating", "review", "priceRange", "geo", "streetAddress", "award", "foundingDate", "hasMap", "sameAs"]) {
      expect(json).not.toContain(key);
    }
  });

  it("adds owner-entered fields and absolute URLs only when they exist", () => {
    const data = buildLocalBusinessJsonLd({
      settings: { ...settings, addressBn: "CUET গেট", mapUrl: "https://maps.app.goo.gl/x", facebookUrl: "https://facebook.com/fc", email: "hi@example.com" },
      hours: DEFAULT_OPENING_HOURS.map((d) => (d.dayOfWeek === 5 ? { ...d, isClosed: true } : d.dayOfWeek === 6 ? { ...d, opensAt: "12:00" } : d)),
      siteUrl: new URL("https://foodcanvas.example"),
      description: "d",
    });
    expect(data).toMatchObject({
      url: "https://foodcanvas.example/",
      image: "https://foodcanvas.example/brand/logo.png",
      menu: "https://foodcanvas.example/menu",
      hasMap: "https://maps.app.goo.gl/x",
      sameAs: ["https://facebook.com/fc"],
      email: "hi@example.com",
      address: { streetAddress: "CUET গেট", addressLocality: "Chattogram", addressCountry: "BD" },
    });
    expect(data.openingHoursSpecification).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"], opens: "15:00", closes: "22:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday"], opens: "12:00", closes: "22:00" },
    ]);
  });

  it("serializes without allowing a </script> breakout", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});

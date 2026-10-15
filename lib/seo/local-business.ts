/**
 * schema.org structured data for the restaurant, built ONLY from confirmed facts and values the
 * owner entered in admin settings. Nothing is guessed: no rating, price range, street address or
 * geo coordinates unless they exist. Fields left empty in settings are simply omitted.
 */
import { DEFAULT_OPENING_HOURS } from "@/lib/hours";
import type { OpeningHoursDay, PublicSettings } from "@/types/menu";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type JsonLd = Record<string, unknown>;

/** Groups days with identical hours: [{dayOfWeek: [...], opens, closes}]. Closed days are left out. */
function openingHoursSpecification(hours: readonly OpeningHoursDay[]): JsonLd[] {
  const groups = new Map<string, number[]>();
  for (const day of hours) {
    if (day.isClosed) continue;
    const key = `${day.opensAt}-${day.closesAt}`;
    groups.set(key, [...(groups.get(key) ?? []), day.dayOfWeek]);
  }
  return [...groups].map(([key, days]) => {
    const [opens, closes] = key.split("-");
    return { "@type": "OpeningHoursSpecification", dayOfWeek: days.map((d) => DAY_NAMES[d]), opens, closes };
  });
}

export function buildLocalBusinessJsonLd({
  settings,
  hours,
  siteUrl,
  description,
}: {
  settings: PublicSettings;
  hours: readonly OpeningHoursDay[];
  siteUrl: URL | null;
  description: string;
}): JsonLd {
  const data: JsonLd = {
    "@context": "https://schema.org",
    "@type": "FastFoodRestaurant",
    name: settings.restaurantName,
    description,
    // The ordering number is the restaurant's confirmed public contact.
    telephone: `+${settings.whatsappNumber}`,
    currenciesAccepted: "BDT",
    openingHoursSpecification: openingHoursSpecification(hours.length === 7 ? hours : DEFAULT_OPENING_HOURS),
    // Chattogram, Bangladesh is confirmed; the street address only once the owner enters it.
    address: {
      "@type": "PostalAddress",
      ...(settings.addressBn ? { streetAddress: settings.addressBn } : {}),
      addressLocality: "Chattogram",
      addressCountry: "BD",
    },
  };
  if (siteUrl) {
    data.url = siteUrl.href;
    data.image = new URL("/brand/logo.png", siteUrl).href;
    data.menu = new URL("/menu", siteUrl).href;
  }
  if (settings.mapUrl) data.hasMap = settings.mapUrl;
  if (settings.facebookUrl) data.sameAs = [settings.facebookUrl];
  if (settings.email) data.email = settings.email;
  return data;
}

/** Safe to inline in a <script> tag (no "</script>" breakout). */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

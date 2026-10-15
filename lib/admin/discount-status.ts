import type { Discount } from "@/types/menu";

export type DiscountStatus = "live" | "scheduled" | "ended" | "off";

/** Where a discount stands right now, using the same time rule as lib/pricing (isDiscountLive). */
export function discountStatus(d: Pick<Discount, "isActive" | "startsAt" | "endsAt">, now: Date): DiscountStatus {
  if (!d.isActive) return "off";
  const t = now.getTime();
  if (d.endsAt !== null && Date.parse(d.endsAt) <= t) return "ended";
  if (d.startsAt !== null && Date.parse(d.startsAt) > t) return "scheduled";
  return "live";
}

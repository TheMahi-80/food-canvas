/** Zod schemas for restaurant settings and opening hours (admin). Limits mirror the database. */
import { z } from "zod";
import { messages } from "@/lib/i18n";
import { optionalHttpsUrl, optionalTaka, optionalText, requiredText, toAsciiDigits } from "./admin-fields";
import { normalizeBdPhone } from "./customer";

const v = messages.admin.validation;

/** Tri-state for delivery/pickup: yes / no / not decided yet (null = "to be confirmed"). */
export type TriState = "yes" | "no" | "unknown";
export const triToBool = (value: TriState): boolean | null => (value === "unknown" ? null : value === "yes");
export const boolToTri = (value: boolean | null): TriState => (value === null ? "unknown" : value ? "yes" : "no");

/** Any common BD mobile format -> digits for wa.me links ("8801845690533"). */
export const whatsappNumberSchema = z
  .string({ error: v.whatsappNumber })
  .transform((value, ctx) => {
    const normalized = normalizeBdPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: v.whatsappNumber });
      return z.NEVER;
    }
    return normalized.slice(1);
  });

const optionalPhone = optionalText(20).pipe(
  z
    .string()
    .transform((s) => toAsciiDigits(s))
    .refine((s) => /^\+?[0-9 -]{6,20}$/.test(s), v.phone)
    .nullable(),
);

const optionalEmail = optionalText(200).pipe(z.email(v.email).nullable());

export const settingsInputSchema = z.object({
  restaurantName: requiredText(80),
  whatsappNumber: whatsappNumberSchema,
  contactPhone: optionalPhone,
  email: optionalEmail,
  facebookUrl: optionalHttpsUrl(500),
  addressBn: optionalText(300),
  mapUrl: optionalHttpsUrl(1000),
  temporarilyClosed: z.boolean(),
  closureNoteBn: optionalText(300),
  deliveryEnabled: z.enum(["yes", "no", "unknown"]).transform(triToBool),
  pickupEnabled: z.enum(["yes", "no", "unknown"]).transform(triToBool),
  deliveryFee: optionalTaka(100_000),
  minOrder: optionalTaka(),
  heroHeadlineBn: requiredText(160),
  heroSubtextBn: z.string().trim().max(300, v.tooLong(300)),
  aboutBn: optionalText(2000),
  removeHeroImage: z.boolean(),
});
export type SettingsInput = z.output<typeof settingsInputSchema>;

export interface SettingsFormValues {
  restaurantName: string;
  whatsappNumber: string;
  contactPhone: string;
  email: string;
  facebookUrl: string;
  addressBn: string;
  mapUrl: string;
  temporarilyClosed: boolean;
  closureNoteBn: string;
  deliveryEnabled: TriState;
  pickupEnabled: TriState;
  deliveryFee: string;
  minOrder: string;
  heroHeadlineBn: string;
  heroSubtextBn: string;
  aboutBn: string;
  removeHeroImage: boolean;
}

const time = z.string({ error: v.time }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, v.time);

export const hoursInputSchema = z
  .array(
    z
      .object({ dayOfWeek: z.number().int().min(0).max(6), opensAt: time, closesAt: time, isClosed: z.boolean() })
      // The database requires closes > opens on every row (same-day hours only), even on closed days.
      .refine((day) => day.closesAt > day.opensAt, { message: v.closesAfterOpens, path: ["closesAt"] }),
  )
  .length(7)
  .refine((days) => days.every((day, index) => day.dayOfWeek === index), "days must be 0..6 in order");
export type HoursInput = z.output<typeof hoursInputSchema>;

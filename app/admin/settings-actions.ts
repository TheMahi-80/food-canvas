"use server";

import { randomUUID } from "node:crypto";
import { fail, ok, dbErrorMessage, guardMessage, zodFieldErrors, type ActionResult } from "@/lib/admin/action-result";
import { published } from "@/lib/admin/publish";
import { removePaths, uploadImage } from "@/lib/admin/storage";
import { requireAdminAction } from "@/lib/auth/admin";
import { messages } from "@/lib/i18n";
import { hoursInputSchema, settingsInputSchema } from "@/lib/validation/admin-settings";

/* Same pattern as menu-actions.ts: guard first, Zod on the server, write as the admin (RLS), publish. */

const c = messages.admin.common;

/** FormData: "payload" (JSON matching settingsInputSchema), optional "heroImage" file. */
export async function saveSettings(formData: FormData): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const { supabase } = guard;

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return fail(c.errorInvalid);
  }
  const parsed = settingsInputSchema.safeParse(payload);
  if (!parsed.success) return fail(c.errorInvalid, zodFieldErrors(parsed.error));
  const s = parsed.data;

  const current = await supabase.from("restaurant_settings").select("hero_image_path").eq("id", 1).maybeSingle();
  if (current.error) return fail(dbErrorMessage(current.error));
  if (!current.data) return fail(c.errorStale);

  const image = formData.get("heroImage");
  let uploadedPath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const upload = await uploadImage(supabase, image, (extension) => `site/hero/${randomUUID()}.${extension}`);
    if (!upload.ok) return fail(upload.error, { heroImage: upload.error });
    uploadedPath = upload.path;
  }
  const oldPath = current.data.hero_image_path;
  const heroImagePath = uploadedPath ?? (s.removeHeroImage ? null : oldPath);

  const { data, error } = await supabase
    .from("restaurant_settings")
    .update({
      restaurant_name: s.restaurantName,
      whatsapp_number: s.whatsappNumber,
      contact_phone: s.contactPhone,
      email: s.email,
      facebook_url: s.facebookUrl,
      address_bn: s.addressBn,
      map_url: s.mapUrl,
      temporarily_closed: s.temporarilyClosed,
      closure_note_bn: s.closureNoteBn,
      delivery_enabled: s.deliveryEnabled,
      pickup_enabled: s.pickupEnabled,
      delivery_fee: s.deliveryFee,
      min_order: s.minOrder,
      hero_headline_bn: s.heroHeadlineBn,
      hero_subtext_bn: s.heroSubtextBn,
      about_bn: s.aboutBn,
      hero_image_path: heroImagePath,
    })
    .eq("id", 1)
    .select("id");
  if (error || data.length === 0) {
    console.error("saveSettings failed", error?.code);
    if (uploadedPath) await removePaths(supabase, [uploadedPath]);
    return fail(error ? dbErrorMessage(error) : c.errorStale);
  }

  if (oldPath && oldPath !== heroImagePath) await removePaths(supabase, [oldPath]);
  published();
  return ok(null);
}

export async function saveHours(input: unknown): Promise<ActionResult> {
  const guard = await requireAdminAction();
  if (!guard.ok) return fail(guardMessage(guard.error));
  const parsed = hoursInputSchema.safeParse(input);
  if (!parsed.success) return fail(c.errorInvalid, zodFieldErrors(parsed.error));

  // Seven fixed rows (update only); stop at the first failure.
  for (const day of parsed.data) {
    const { data, error } = await guard.supabase
      .from("opening_hours")
      .update({ opens_at: day.opensAt, closes_at: day.closesAt, is_closed: day.isClosed })
      .eq("day_of_week", day.dayOfWeek)
      .select("day_of_week");
    if (error || data.length === 0) {
      console.error("saveHours failed", error?.code);
      published(); // earlier days may already be saved; show the true state
      return fail(error ? dbErrorMessage(error) : c.errorStale);
    }
  }
  published();
  return ok(null);
}

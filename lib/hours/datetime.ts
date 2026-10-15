/**
 * Discount start/end times are entered and shown in Asia/Dhaka time (UTC+6, no daylight saving),
 * whatever timezone the admin's device is set to.
 */
import { toBanglaDigits } from "@/lib/i18n";
import { RESTAURANT_TIME_ZONE } from "./index";

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** "2026-10-20T15:00" (Dhaka wall clock, as from <input type="datetime-local">) -> ISO UTC, or null if invalid. */
export function dhakaLocalToIso(local: string): string | null {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) return null;
  const [y, mo, d, h, mi] = match.slice(1).map(Number);
  const utc = Date.UTC(y, mo - 1, d, h, mi) - DHAKA_OFFSET_MS;
  const check = new Date(utc + DHAKA_OFFSET_MS);
  // Rejects impossible dates such as 2026-02-30 or 25:00.
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || check.getUTCHours() !== h) return null;
  return new Date(utc).toISOString();
}

/** ISO timestamp -> "YYYY-MM-DDTHH:MM" in Dhaka, for a datetime-local input. */
export function isoToDhakaLocal(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t + DHAKA_OFFSET_MS).toISOString().slice(0, 16);
}

const displayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: RESTAURANT_TIME_ZONE,
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ISO -> "২০/১০/২০২৬, ১৫:০০" (Dhaka time, Bangla digits). */
export function formatDhakaDateTimeBn(iso: string): string {
  return toBanglaDigits(displayFormatter.format(new Date(iso)));
}

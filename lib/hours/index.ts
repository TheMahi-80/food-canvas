/**
 * Open/closed status, always computed in Asia/Dhaka regardless of the visitor's device timezone.
 * A day is open while opensAt <= local time < closesAt.
 */
import { messages, toBanglaDigits } from "@/lib/i18n";
import type { OpeningHoursDay } from "@/types/menu";

export const RESTAURANT_TIME_ZONE = "Asia/Dhaka";

/** Confirmed default schedule: every day 15:00-22:00. */
export const DEFAULT_OPENING_HOURS: OpeningHoursDay[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  opensAt: "15:00",
  closesAt: "22:00",
  isClosed: false,
}));

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dhakaFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RESTAURANT_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Day of week (0 = Sunday) and minutes since midnight in Asia/Dhaka. */
export function dhakaClock(now: Date): { dayOfWeek: number; minutes: number } {
  const parts = dhakaFormatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    dayOfWeek: WEEKDAYS.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** "HH:MM" or "HH:MM:SS" -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export interface NextOpening {
  /** 0 = later today, 1 = tomorrow, 2..7 = that many days ahead. */
  daysAhead: number;
  dayOfWeek: number;
  opensAt: string;
}

export type OpenStatus =
  | { state: "open"; closesAt: string }
  | { state: "closed"; next: NextOpening | null }
  | { state: "temporarily_closed" };

export function getOpenStatus(now: Date, hours: readonly OpeningHoursDay[], temporarilyClosed = false): OpenStatus {
  if (temporarilyClosed) return { state: "temporarily_closed" };

  const byDay = new Map(hours.map((h) => [h.dayOfWeek, h]));
  const { dayOfWeek, minutes } = dhakaClock(now);
  const today = byDay.get(dayOfWeek);

  if (today && !today.isClosed && minutes >= toMinutes(today.opensAt) && minutes < toMinutes(today.closesAt)) {
    return { state: "open", closesAt: today.closesAt.slice(0, 5) };
  }

  if (today && !today.isClosed && minutes < toMinutes(today.opensAt)) {
    return { state: "closed", next: { daysAhead: 0, dayOfWeek, opensAt: today.opensAt.slice(0, 5) } };
  }

  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const day = (dayOfWeek + daysAhead) % 7;
    const entry = byDay.get(day);
    if (entry && !entry.isClosed) {
      return { state: "closed", next: { daysAhead, dayOfWeek: day, opensAt: entry.opensAt.slice(0, 5) } };
    }
  }
  return { state: "closed", next: null };
}

/** Status for the current moment (reads the system clock; tests mock it with vi.setSystemTime). */
export function getCurrentOpenStatus(hours: readonly OpeningHoursDay[], temporarilyClosed = false): OpenStatus {
  return getOpenStatus(new Date(), hours, temporarilyClosed);
}

// ---------------------------------------------------------------------------
// Bangla formatting
// ---------------------------------------------------------------------------

function periodOfDay(hour: number): string {
  const p = messages.hours.periods;
  if (hour >= 4 && hour < 6) return p.dawn;
  if (hour >= 6 && hour < 12) return p.morning;
  if (hour >= 12 && hour < 15) return p.noon;
  if (hour >= 15 && hour < 18) return p.afternoon;
  if (hour >= 18 && hour < 20) return p.evening;
  return p.night;
}

/** "15:00" -> "বিকাল ৩টা", "15:30" -> "বিকাল ৩:৩০", "22:00" -> "রাত ১০টা". */
export function formatTimeBn(time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const clock = minute === 0 ? `${toBanglaDigits(h12)}টা` : `${toBanglaDigits(h12)}:${toBanglaDigits(String(minute).padStart(2, "0"))}`;
  return `${periodOfDay(hour)} ${clock}`;
}

/** "বিকাল ৩টা" -> "বিকাল ৩টায়", "বিকাল ৩:৩০" -> "বিকাল ৩:৩০-এ" */
function atTimeBn(time: string): string {
  const t = formatTimeBn(time);
  return t.endsWith("টা") ? `${t}য়` : `${t}-এ`;
}

/** Summary for header/footer, e.g. "প্রতিদিন: বিকাল ৩টা – রাত ১০টা". */
export function formatHoursSummaryBn(hours: readonly OpeningHoursDay[]): string[] {
  const open = hours.filter((h) => !h.isClosed);
  const sameEveryDay =
    hours.length === 7 &&
    open.length === 7 &&
    open.every((h) => h.opensAt.slice(0, 5) === open[0].opensAt.slice(0, 5) && h.closesAt.slice(0, 5) === open[0].closesAt.slice(0, 5));
  if (sameEveryDay) {
    return [`${messages.hours.everyDay}: ${formatTimeBn(open[0].opensAt)} – ${formatTimeBn(open[0].closesAt)}`];
  }
  return [...hours]
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map((h) =>
      h.isClosed
        ? `${messages.hours.days[h.dayOfWeek]}: ${messages.hours.closedAllDay}`
        : `${messages.hours.days[h.dayOfWeek]}: ${formatTimeBn(h.opensAt)} – ${formatTimeBn(h.closesAt)}`,
    );
}

/** Short status line, e.g. "এখন খোলা · রাত ১০টা পর্যন্ত" or "এখন বন্ধ · আজ বিকাল ৩টায় খুলবে". */
export function formatOpenStatusBn(status: OpenStatus): { label: string; detail: string | null } {
  const h = messages.hours;
  if (status.state === "open") return { label: h.openNow, detail: `${formatTimeBn(status.closesAt)} ${h.until}` };
  if (status.state === "temporarily_closed") return { label: h.closedNow, detail: h.temporarilyClosed };
  if (!status.next) return { label: h.closedNow, detail: null };
  const { daysAhead, dayOfWeek, opensAt } = status.next;
  const day = daysAhead === 0 ? h.today : daysAhead === 1 ? h.tomorrow : h.days[dayOfWeek];
  return { label: h.closedNow, detail: `${day} ${atTimeBn(opensAt)} ${h.opens}` };
}

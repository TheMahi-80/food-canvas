import { describe, expect, it } from "vitest";
import type { OpeningHoursDay } from "@/types/menu";
import {
  DEFAULT_OPENING_HOURS,
  dhakaClock,
  formatHoursSummaryBn,
  formatOpenStatusBn,
  formatTimeBn,
  getOpenStatus,
} from "./index";

// Asia/Dhaka is UTC+6 with no DST. 2026-10-14 is a Wednesday.
const dhaka = (local: string) => new Date(`${local}+06:00`);

describe("dhakaClock", () => {
  it("uses Asia/Dhaka, not the device/server timezone", () => {
    // 2026-10-14 20:30 UTC = 2026-10-15 02:30 in Dhaka (Thursday)
    expect(dhakaClock(new Date("2026-10-14T20:30:00Z"))).toEqual({ dayOfWeek: 4, minutes: 150 });
  });

  it("is independent of process.env.TZ", () => {
    const original = process.env.TZ;
    try {
      for (const tz of ["UTC", "America/New_York", "Asia/Tokyo"]) {
        process.env.TZ = tz;
        expect(dhakaClock(dhaka("2026-10-14T15:00:00"))).toEqual({ dayOfWeek: 3, minutes: 900 });
      }
    } finally {
      process.env.TZ = original;
    }
  });
});

describe("getOpenStatus with the confirmed 15:00-22:00 schedule", () => {
  const status = (local: string) => getOpenStatus(dhaka(local), DEFAULT_OPENING_HOURS);

  it("closed before 3 PM, opens later today", () => {
    expect(status("2026-10-14T14:59:00")).toEqual({ state: "closed", next: { daysAhead: 0, dayOfWeek: 3, opensAt: "15:00" } });
  });

  it("open from exactly 3 PM", () => {
    expect(status("2026-10-14T15:00:00")).toEqual({ state: "open", closesAt: "22:00" });
  });

  it("open at 9:59 PM", () => {
    expect(status("2026-10-14T21:59:00").state).toBe("open");
  });

  it("closed from exactly 10 PM, opens tomorrow", () => {
    expect(status("2026-10-14T22:00:00")).toEqual({ state: "closed", next: { daysAhead: 1, dayOfWeek: 4, opensAt: "15:00" } });
  });

  it("just after midnight Dhaka time: opens later the same Dhaka day", () => {
    expect(status("2026-10-15T00:30:00")).toEqual({ state: "closed", next: { daysAhead: 0, dayOfWeek: 4, opensAt: "15:00" } });
  });
});

describe("getOpenStatus edge cases", () => {
  it("temporary closure overrides the schedule", () => {
    expect(getOpenStatus(dhaka("2026-10-14T16:00:00"), DEFAULT_OPENING_HOURS, true)).toEqual({ state: "temporarily_closed" });
  });

  it("skips closed days when finding the next opening", () => {
    const hours: OpeningHoursDay[] = DEFAULT_OPENING_HOURS.map((h) => (h.dayOfWeek === 4 || h.dayOfWeek === 5 ? { ...h, isClosed: true } : h));
    // Wednesday 23:00 -> Thursday and Friday closed -> Saturday
    expect(getOpenStatus(dhaka("2026-10-14T23:00:00"), hours)).toEqual({
      state: "closed",
      next: { daysAhead: 3, dayOfWeek: 6, opensAt: "15:00" },
    });
  });

  it("a closed day is never open", () => {
    const hours = DEFAULT_OPENING_HOURS.map((h) => (h.dayOfWeek === 3 ? { ...h, isClosed: true } : h));
    expect(getOpenStatus(dhaka("2026-10-14T16:00:00"), hours).state).toBe("closed");
  });

  it("no open days -> closed with unknown next opening", () => {
    const hours = DEFAULT_OPENING_HOURS.map((h) => ({ ...h, isClosed: true }));
    expect(getOpenStatus(dhaka("2026-10-14T16:00:00"), hours)).toEqual({ state: "closed", next: null });
  });

  it("accepts Postgres HH:MM:SS times", () => {
    const hours = DEFAULT_OPENING_HOURS.map((h) => ({ ...h, opensAt: "15:00:00", closesAt: "22:00:00" }));
    expect(getOpenStatus(dhaka("2026-10-14T16:00:00"), hours)).toEqual({ state: "open", closesAt: "22:00" });
  });
});

describe("Bangla formatting", () => {
  it("formats times with the right part of day", () => {
    expect(formatTimeBn("15:00")).toBe("বিকাল ৩টা");
    expect(formatTimeBn("22:00")).toBe("রাত ১০টা");
    expect(formatTimeBn("15:30")).toBe("বিকাল ৩:৩০");
    expect(formatTimeBn("12:00")).toBe("দুপুর ১২টা");
    expect(formatTimeBn("09:05")).toBe("সকাল ৯:০৫");
    expect(formatTimeBn("19:00")).toBe("সন্ধ্যা ৭টা");
  });

  it("default schedule summary matches the confirmed display copy exactly", () => {
    expect(formatHoursSummaryBn(DEFAULT_OPENING_HOURS)).toEqual(["প্রতিদিন: বিকাল ৩টা – রাত ১০টা"]);
  });

  it("non-uniform schedule lists each day", () => {
    const hours = DEFAULT_OPENING_HOURS.map((h) => (h.dayOfWeek === 5 ? { ...h, isClosed: true } : h));
    const lines = formatHoursSummaryBn(hours);
    expect(lines).toHaveLength(7);
    expect(lines[5]).toBe("শুক্রবার: বন্ধ");
    expect(lines[0]).toBe("রবিবার: বিকাল ৩টা – রাত ১০টা");
  });

  it("status lines", () => {
    expect(formatOpenStatusBn({ state: "open", closesAt: "22:00" })).toEqual({ label: "এখন খোলা", detail: "রাত ১০টা পর্যন্ত" });
    expect(formatOpenStatusBn({ state: "closed", next: { daysAhead: 0, dayOfWeek: 3, opensAt: "15:00" } })).toEqual({
      label: "এখন বন্ধ",
      detail: "আজ বিকাল ৩টায় খুলবে",
    });
    expect(formatOpenStatusBn({ state: "closed", next: { daysAhead: 1, dayOfWeek: 4, opensAt: "15:30" } }).detail).toBe(
      "আগামীকাল বিকাল ৩:৩০-এ খুলবে",
    );
    expect(formatOpenStatusBn({ state: "closed", next: { daysAhead: 3, dayOfWeek: 6, opensAt: "15:00" } }).detail).toBe(
      "শনিবার বিকাল ৩টায় খুলবে",
    );
    expect(formatOpenStatusBn({ state: "temporarily_closed" })).toEqual({ label: "এখন বন্ধ", detail: "সাময়িকভাবে বন্ধ আছে" });
  });
});

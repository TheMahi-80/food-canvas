/**
 * Open/closed status with a mocked system clock. getCurrentOpenStatus() reads `new Date()`,
 * exactly as the header badge does at runtime; vi.setSystemTime controls that clock.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_OPENING_HOURS, formatOpenStatusBn, getCurrentOpenStatus } from "./index";

// Asia/Dhaka is UTC+06:00 all year (no DST). 2026-10-14 is a Wednesday (dayOfWeek 3).
const at = (dhakaLocal: string) => vi.setSystemTime(new Date(`${dhakaLocal}+06:00`));
const status = () => getCurrentOpenStatus(DEFAULT_OPENING_HOURS);

const ORIGINAL_TZ = process.env.TZ;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  process.env.TZ = ORIGINAL_TZ;
});

describe("open/closed with a mocked clock (confirmed hours 3 PM – 10 PM)", () => {
  it("2:59:59 PM (just before 3 PM): closed, opens today at 3 PM", () => {
    at("2026-10-14T14:59:59");
    expect(status()).toEqual({ state: "closed", next: { daysAhead: 0, dayOfWeek: 3, opensAt: "15:00" } });
    expect(formatOpenStatusBn(status())).toEqual({ label: "এখন বন্ধ", detail: "আজ বিকাল ৩টায় খুলবে" });
  });

  it("exactly 3:00 PM: open until 10 PM", () => {
    at("2026-10-14T15:00:00");
    expect(status()).toEqual({ state: "open", closesAt: "22:00" });
    expect(formatOpenStatusBn(status())).toEqual({ label: "এখন খোলা", detail: "রাত ১০টা পর্যন্ত" });
  });

  it("9:59:59 PM: still open", () => {
    at("2026-10-14T21:59:59");
    expect(status().state).toBe("open");
  });

  it("exactly 10:00 PM: closed, opens tomorrow at 3 PM", () => {
    at("2026-10-14T22:00:00");
    expect(status()).toEqual({ state: "closed", next: { daysAhead: 1, dayOfWeek: 4, opensAt: "15:00" } });
    expect(formatOpenStatusBn(status())).toEqual({ label: "এখন বন্ধ", detail: "আগামীকাল বিকাল ৩টায় খুলবে" });
  });

  it("status changes as the mocked clock advances across 3 PM", () => {
    at("2026-10-14T14:59:30");
    expect(status().state).toBe("closed");
    vi.advanceTimersByTime(30_000);
    expect(status().state).toBe("open");
  });

  it("temporary closure wins even during opening hours", () => {
    at("2026-10-14T18:00:00");
    expect(getCurrentOpenStatus(DEFAULT_OPENING_HOURS, true)).toEqual({ state: "temporarily_closed" });
  });
});

describe("device timezone different from Dhaka", () => {
  it.each([
    // [device TZ, Dhaka local instant, expected state]
    ["America/Los_Angeles", "2026-10-14T15:30:00", "open"], // device shows 02:30 the same day
    ["America/New_York", "2026-10-14T14:59:00", "closed"], // device shows 04:59
    ["Europe/London", "2026-10-14T22:00:00", "closed"], // device shows 17:00, would look "open" locally
    ["UTC", "2026-10-14T21:30:00", "open"], // device shows 15:30
    ["Asia/Tokyo", "2026-10-14T14:30:00", "closed"], // device shows 17:30, would look "open" locally
    ["Pacific/Kiritimati", "2026-10-15T01:00:00", "closed"], // UTC+14: device is already on a different date
  ])("device in %s, Dhaka time %s -> %s", (tz, dhakaLocal, expected) => {
    process.env.TZ = tz;
    at(dhakaLocal);
    // Prove the device clock really is in a different zone than Dhaka for this test.
    const dhakaHour = Number(dhakaLocal.slice(11, 13));
    expect(new Date().getHours()).not.toBe(dhakaHour);
    expect(status().state).toBe(expected);
  });

  it("a device in UTC at 15:30 local time (09:30 PM Dhaka) is open, and at 16:00 UTC (10 PM Dhaka) closed", () => {
    process.env.TZ = "UTC";
    vi.setSystemTime(new Date("2026-10-14T15:30:00Z"));
    expect(status().state).toBe("open");
    vi.setSystemTime(new Date("2026-10-14T16:00:00Z"));
    expect(status()).toEqual({ state: "closed", next: { daysAhead: 1, dayOfWeek: 4, opensAt: "15:00" } });
  });
});

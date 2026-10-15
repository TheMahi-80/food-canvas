import { describe, expect, it } from "vitest";
import { dhakaLocalToIso, formatDhakaDateTimeBn, isoToDhakaLocal } from "./datetime";

describe("Dhaka datetime-local conversion", () => {
  it("treats the typed time as Dhaka time (UTC+6), whatever the device timezone", () => {
    expect(dhakaLocalToIso("2026-10-20T15:00")).toBe("2026-10-20T09:00:00.000Z");
    expect(dhakaLocalToIso("2026-01-01T03:30")).toBe("2025-12-31T21:30:00.000Z");
  });

  it("round-trips back to the same wall-clock value", () => {
    for (const local of ["2026-10-20T15:00", "2026-01-01T00:00", "2026-12-31T23:59", "2028-02-29T12:00"]) {
      expect(isoToDhakaLocal(dhakaLocalToIso(local))).toBe(local);
    }
  });

  it("rejects malformed and impossible dates", () => {
    for (const bad of ["", "2026-10-20", "2026-10-20 15:00", "2026-02-30T10:00", "2026-13-01T10:00", "2026-10-20T24:00", "x"]) {
      expect(dhakaLocalToIso(bad)).toBeNull();
    }
  });

  it("handles empty/invalid ISO input for the form", () => {
    expect(isoToDhakaLocal(null)).toBe("");
    expect(isoToDhakaLocal("nonsense")).toBe("");
  });

  it("formats for display in Dhaka time with Bangla digits", () => {
    expect(formatDhakaDateTimeBn("2026-10-20T09:00:00.000Z")).toBe("২০/১০/২০২৬, ১৫:০০");
  });
});

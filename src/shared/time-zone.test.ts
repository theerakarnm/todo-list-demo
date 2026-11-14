import { describe, expect, it } from "vitest";
import { todayInTimeZone, zonedDateTimeToUtcMs } from "./time-zone";

describe("todayInTimeZone", () => {
  it("gives the local calendar date as YYYY-MM-DD", () => {
    // 2026-11-14 18:30 UTC is already the 15th in Bangkok (UTC+7).
    const instant = Date.UTC(2026, 10, 14, 18, 30);
    expect(todayInTimeZone(instant, "Asia/Bangkok")).toBe("2026-11-15");
    expect(todayInTimeZone(instant, "UTC")).toBe("2026-11-14");
    expect(todayInTimeZone(instant, "America/Los_Angeles")).toBe("2026-11-14");
  });
});

describe("zonedDateTimeToUtcMs", () => {
  it("turns a Bangkok wall-clock time into UTC", () => {
    expect(zonedDateTimeToUtcMs("2026-12-01", "09:30", "Asia/Bangkok")).toBe(Date.UTC(2026, 11, 1, 2, 30));
  });

  it("uses the offset that applies on that date in a zone with daylight saving", () => {
    // New York is UTC-4 in July and UTC-5 in December.
    expect(zonedDateTimeToUtcMs("2026-07-01", "09:00", "America/New_York")).toBe(Date.UTC(2026, 6, 1, 13, 0));
    expect(zonedDateTimeToUtcMs("2026-12-01", "09:00", "America/New_York")).toBe(Date.UTC(2026, 11, 1, 14, 0));
  });

  it("handles a time that crosses into the previous UTC day", () => {
    expect(zonedDateTimeToUtcMs("2026-11-15", "05:00", "Asia/Bangkok")).toBe(Date.UTC(2026, 10, 14, 22, 0));
  });
});

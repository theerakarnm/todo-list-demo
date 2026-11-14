import { describe, expect, it } from "vitest";
import { addDays, timeInTimeZone, todayInTimeZone, zonedDateTimeToUtcMs } from "./time-zone";

describe("todayInTimeZone", () => {
  it("gives the local calendar date as YYYY-MM-DD", () => {
    // 2026-11-14 18:30 UTC is already the 15th in Bangkok (UTC+7).
    const instant = Date.UTC(2026, 10, 14, 18, 30);
    expect(todayInTimeZone(instant, "Asia/Bangkok")).toBe("2026-11-15");
    expect(todayInTimeZone(instant, "UTC")).toBe("2026-11-14");
    expect(todayInTimeZone(instant, "America/Los_Angeles")).toBe("2026-11-14");
  });
});

describe("timeInTimeZone", () => {
  it("gives the local wall-clock time as HH:MM, with midnight as 00", () => {
    const instant = Date.UTC(2026, 10, 14, 17, 5);
    expect(timeInTimeZone(instant, "Asia/Bangkok")).toBe("00:05");
    expect(timeInTimeZone(instant, "UTC")).toBe("17:05");
    expect(timeInTimeZone(instant, "Asia/Kolkata")).toBe("22:35");
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

describe("addDays", () => {
  it("moves a local date by whole days, across months and years", () => {
    expect(addDays("2026-11-14", 1)).toBe("2026-11-15");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

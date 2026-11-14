import { describe, expect, it } from "vitest";
import { formatShortThaiDate } from "./format-date";

describe("formatShortThaiDate", () => {
  it("writes the Thai weekday, day and short month like the mockups", () => {
    const saturdayInBangkok = new Date("2026-11-14T03:00:00Z");

    expect(formatShortThaiDate(saturdayInBangkok, "Asia/Bangkok")).toBe("เสาร์ 14 พ.ย.");
  });

  it("uses the calendar day of the given time zone", () => {
    const lateFridayUtc = new Date("2026-11-13T20:00:00Z");

    expect(formatShortThaiDate(lateFridayUtc, "UTC")).toBe("ศุกร์ 13 พ.ย.");
    expect(formatShortThaiDate(lateFridayUtc, "Asia/Bangkok")).toBe("เสาร์ 14 พ.ย.");
  });
});

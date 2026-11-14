import { describe, expect, it } from "vitest";
import {
  formatDayMonth,
  formatLoadBarDay,
  formatLocalDate,
  formatShortThaiDate,
  formatWeekdayDayMonth,
} from "./format-date";

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

describe("local date labels", () => {
  it("formats a YYYY-MM-DD date the way the mockups write it", () => {
    expect(formatLocalDate("2026-11-15")).toBe("อาทิตย์ 15 พ.ย.");
    expect(formatDayMonth("2026-11-13")).toBe("13 พ.ย.");
    expect(formatLoadBarDay("2026-11-15")).toBe("อา 15");
    expect(formatLoadBarDay("2026-11-19")).toBe("พฤ 19");
    expect(formatWeekdayDayMonth("2026-11-20")).toBe("ศ 20 พ.ย.");
  });
});

/**
 * Short Thai date used in headers and task rows, e.g. "เสาร์ 14 พ.ย.".
 * Intl gives "วันเสาร์ที่ 14 พ.ย."; the mockups drop the "วัน" and "ที่".
 */
export function formatShortThaiDate(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone,
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";

  const weekday = part("weekday").replace(/^วัน/, "");
  return `${weekday} ${part("day")} ${part("month")}`;
}

/** A local date ("2026-11-15") as a Date at noon UTC, so formatting it in UTC gives that same calendar day. */
function localDateAsUtcNoon(localDate: string) {
  return new Date(`${localDate}T12:00:00Z`);
}

/** "อาทิตย์ 15 พ.ย." for a due date. */
export function formatLocalDate(localDate: string) {
  return formatShortThaiDate(localDateAsUtcNoon(localDate), "UTC");
}

/** "13 พ.ย." for the date on a task row. */
export function formatDayMonth(localDate: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    localDateAsUtcNoon(localDate),
  );
}

/** "อา 15" under each column of the Upcoming load bar. Intl writes "อา."; the mockup has no dot. */
export function formatLoadBarDay(localDate: string) {
  const date = localDateAsUtcNoon(localDate);
  const weekday = new Intl.DateTimeFormat("th-TH", { weekday: "short", timeZone: "UTC" }).format(date);
  return `${weekday.replace(/\.$/, "")} ${date.getUTCDate()}`;
}

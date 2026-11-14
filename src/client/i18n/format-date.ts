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

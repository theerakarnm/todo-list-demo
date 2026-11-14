// Due dates are wall-clock values in the user's time zone (ARCHITECTURE §4).
// These helpers turn them into UTC instants and back, using only Intl.

/** The calendar date at `instant` in `timeZone`, e.g. "2026-11-14". */
export function todayInTimeZone(instant: number, timeZone: string) {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    instant,
  );
}

/** How far `timeZone` is ahead of UTC at `instant`, in milliseconds. */
function offsetAt(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return wallClockAsUtc - Math.floor(instant / 1000) * 1000;
}

/** The UTC instant of a local date ("2026-11-14") and time ("09:30") in `timeZone`. */
export function zonedDateTimeToUtcMs(localDate: string, localTime: string, timeZone: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(year ?? 0, (month ?? 1) - 1, day, hour, minute);
  // Guess with the offset at the wall-clock time, then correct once in case
  // the offset changes between the guess and the answer (daylight saving).
  const guess = wallClockAsUtc - offsetAt(wallClockAsUtc, timeZone);
  return wallClockAsUtc - offsetAt(guess, timeZone);
}

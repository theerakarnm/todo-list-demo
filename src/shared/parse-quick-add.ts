import type { Priority, WeekStart } from "./constants";
import { addDays, todayInTimeZone } from "./time-zone";

// Quick Add reads a due date, a due time and a priority out of a task title,
// e.g. "ประชุมพรุ่งนี้บ่ายสอง p1". Thai has no spaces, so words may be glued.

export type QuickAddParse = { title: string; dueDate?: string; dueTime?: string; priority?: Priority };

const DAYS_FROM_TODAY: Record<string, number> = { วันนี้: 0, พรุ่งนี้: 1, มะรืนนี้: 2, มะรืน: 2 };

// 0 = Sunday, like Date.getUTCDay().
const WEEKDAYS: Record<string, number> = {
  อาทิตย์: 0,
  จันทร์: 1,
  อังคาร: 2,
  พุธ: 3,
  พฤหัสบดี: 4,
  พฤหัส: 4,
  ศุกร์: 5,
  เสาร์: 6,
};

const THAI_HOURS: Record<string, number> = {
  ตีหนึ่ง: 1,
  ตีสอง: 2,
  ตีสาม: 3,
  ตีสี่: 4,
  ตีห้า: 5,
  หกโมงเช้า: 6,
  เจ็ดโมงเช้า: 7,
  เจ็ดโมง: 7,
  แปดโมงเช้า: 8,
  แปดโมง: 8,
  เก้าโมงเช้า: 9,
  เก้าโมง: 9,
  สิบโมงเช้า: 10,
  สิบโมง: 10,
  สิบเอ็ดโมงเช้า: 11,
  สิบเอ็ดโมง: 11,
  เที่ยงวัน: 12,
  เที่ยง: 12,
  บ่ายโมง: 13,
  บ่ายสองโมง: 14,
  บ่ายสอง: 14,
  บ่ายสามโมง: 15,
  บ่ายสาม: 15,
  บ่ายสี่โมง: 16,
  บ่ายสี่: 16,
  บ่ายห้าโมง: 17,
  ห้าโมงเย็น: 17,
  หกโมงเย็น: 18,
  หนึ่งทุ่ม: 19,
  ทุ่มนึง: 19,
  ทุ่มหนึ่ง: 19,
  สองทุ่ม: 20,
  สามทุ่ม: 21,
  สี่ทุ่ม: 22,
  ห้าทุ่ม: 23,
  เที่ยงคืน: 0,
};

const PRIORITY_BY_NUMBER: Record<string, Priority> = { "1": "high", "2": "medium", "3": "low", "4": "none" };

/** An alternation of `words`, longest first, so เที่ยงคืน wins over เที่ยง. */
function anyOf(words: string[]) {
  return [...words].sort((a, b) => b.length - a.length).join("|");
}

const weekdayNames = anyOf(Object.keys(WEEKDAYS));

// วันนี้ / วันจันทร์ may be glued to other text; a bare weekday must be its own
// space-separated word, so พระจันทร์ and อาทิตย์หน้า are not dates.
const DATE_PATTERN = new RegExp(
  `${anyOf(Object.keys(DAYS_FROM_TODAY))}|วัน(${weekdayNames})|(?<!\\S)(${weekdayNames})(?!\\S)`,
);

// 9:30, 14.00 - but not inside a bigger number such as 1.500, 123:45 or v2.10.3,
// so no digit or dot may touch it. A plain decimal like 2.50 does count as a time.
const CLOCK_PATTERN = /(?<![\d.])([01]?\d|2[0-3])[:.]([0-5]\d)(?![\d.])/;
const THAI_HOUR_PATTERN = new RegExp(anyOf(Object.keys(THAI_HOURS)));

// p1-p4 not glued to ASCII letters or digits (mp3, app1 and p10 are not priorities).
const PRIORITY_PATTERN = /(?<![a-z0-9])p([1-4])(?![a-z0-9])/i;

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

/** The date `weekday` falls on after `today`; today's own weekday means next week. */
function nextWeekday(today: string, weekday: number) {
  const todayWeekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, ((weekday - todayWeekday + 6) % 7) + 1);
}

function findDate(text: string, today: string) {
  const match = DATE_PATTERN.exec(text);
  if (!match) return undefined;
  const weekday = match[1] ?? match[2];
  const dueDate = weekday ? nextWeekday(today, WEEKDAYS[weekday] ?? 0) : addDays(today, DAYS_FROM_TODAY[match[0]] ?? 0);
  return { match, dueDate };
}

/** The earliest clock time or Thai hour word in `text`. */
function findTime(text: string) {
  const clock = CLOCK_PATTERN.exec(text);
  const thaiHour = THAI_HOUR_PATTERN.exec(text);
  if (clock && (!thaiHour || clock.index < thaiHour.index)) {
    return { match: clock, dueTime: `${twoDigits(Number(clock[1]))}:${clock[2]}` };
  }
  if (thaiHour) return { match: thaiHour, dueTime: `${twoDigits(THAI_HOURS[thaiHour[0]] ?? 0)}:00` };
  return undefined;
}

/** `text` without `match`. The gap becomes one space, so "ประชุมพรุ่งนี้บ่าย" keeps "ประชุม บ่าย" apart. */
function removeMatch(text: string, match: RegExpExecArray) {
  return `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`;
}

// weekStart is part of the Quick Add contract but does not change "the next
// วันจันทร์", which is always within the coming 7 days.
export function parseQuickAdd(text: string, now: number, timeZone: string, _weekStart: WeekStart): QuickAddParse {
  const today = todayInTimeZone(now, timeZone);
  const result: Omit<QuickAddParse, "title"> = {};
  let title = text;

  const date = findDate(title, today);
  if (date) {
    result.dueDate = date.dueDate;
    title = removeMatch(title, date.match);
  }

  const time = findTime(title);
  if (time) {
    result.dueTime = time.dueTime;
    // A due time needs a date in this app, so a time on its own means today.
    result.dueDate ??= today;
    title = removeMatch(title, time.match);
  }

  const priority = PRIORITY_PATTERN.exec(title);
  if (priority) {
    result.priority = PRIORITY_BY_NUMBER[priority[1] ?? ""];
    title = removeMatch(title, priority);
  }

  return { title: title.replace(/\s+/g, " ").trim(), ...result };
}

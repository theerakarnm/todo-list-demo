import { describe, expect, it } from "vitest";
import { type QuickAddParse, parseQuickAdd } from "./parse-quick-add";

// Saturday 2026-11-14, 10:00 in Bangkok.
const SATURDAY_10AM_BANGKOK = Date.UTC(2026, 10, 14, 3, 0);
const TODAY = "2026-11-14";
const TOMORROW = "2026-11-15";

function parse(text: string) {
  return parseQuickAdd(text, SATURDAY_10AM_BANGKOK, "Asia/Bangkok", "mon");
}

describe("parseQuickAdd", () => {
  it.each<[string, QuickAddParse]>([
    // No keywords: the title comes back trimmed.
    ["  ซื้อนม  ", { title: "ซื้อนม" }],
    ["ซื้อนม   และ   ไข่", { title: "ซื้อนม และ ไข่" }],

    // Relative days.
    ["จ่ายค่าไฟ วันนี้", { title: "จ่ายค่าไฟ", dueDate: TODAY }],
    ["จ่ายค่าไฟ พรุ่งนี้", { title: "จ่ายค่าไฟ", dueDate: TOMORROW }],
    ["ส่งงาน มะรืน", { title: "ส่งงาน", dueDate: "2026-11-16" }],
    ["ส่งงาน มะรืนนี้", { title: "ส่งงาน", dueDate: "2026-11-16" }],

    // Weekdays with วัน: the next one; today's weekday means next week.
    ["ประชุม วันอาทิตย์", { title: "ประชุม", dueDate: "2026-11-15" }],
    ["ประชุม วันจันทร์", { title: "ประชุม", dueDate: "2026-11-16" }],
    ["ประชุม วันอังคาร", { title: "ประชุม", dueDate: "2026-11-17" }],
    ["ประชุม วันพุธ", { title: "ประชุม", dueDate: "2026-11-18" }],
    ["ประชุม วันพฤหัส", { title: "ประชุม", dueDate: "2026-11-19" }],
    ["ประชุม วันพฤหัสบดี", { title: "ประชุม", dueDate: "2026-11-19" }],
    ["ประชุม วันศุกร์", { title: "ประชุม", dueDate: "2026-11-20" }],
    ["ประชุม วันเสาร์", { title: "ประชุม", dueDate: "2026-11-21" }],

    // Bare weekdays only as their own word.
    ["ตัดผม จันทร์", { title: "ตัดผม", dueDate: "2026-11-16" }],
    ["พฤหัสบดี ส่งรายงาน", { title: "ส่งรายงาน", dueDate: "2026-11-19" }],
    ["ดูพระจันทร์", { title: "ดูพระจันทร์" }],
    ["เที่ยวอาทิตย์หน้า", { title: "เที่ยวอาทิตย์หน้า" }],

    // Clock times.
    ["ประชุม 14:00", { title: "ประชุม", dueDate: TODAY, dueTime: "14:00" }],
    ["ประชุม 14.00", { title: "ประชุม", dueDate: TODAY, dueTime: "14:00" }],
    ["วิ่ง 9:30", { title: "วิ่ง", dueDate: TODAY, dueTime: "09:30" }],
    ["อัปเดต v2.10.3", { title: "อัปเดต v2.10.3" }],
    ["โอน 1.500 บาท", { title: "โอน 1.500 บาท" }],
    ["รหัส 123:45", { title: "รหัส 123:45" }],
    ["เวลา 24:00 ไม่มีจริง", { title: "เวลา 24:00 ไม่มีจริง" }],
    // A number like 2.50 is read as a time: no digits or dots next to it.
    ["ราคา 2.50 บาท", { title: "ราคา บาท", dueDate: TODAY, dueTime: "02:50" }],

    // Thai hour words, glued to the text around them.
    ["บินตีห้า", { title: "บิน", dueDate: TODAY, dueTime: "05:00" }],
    ["ยาตีหนึ่ง", { title: "ยา", dueDate: TODAY, dueTime: "01:00" }],
    ["ยาตีสาม ตีสี่", { title: "ยา ตีสี่", dueDate: TODAY, dueTime: "03:00" }],
    ["ตื่นตีสองดูบอล", { title: "ตื่น ดูบอล", dueDate: TODAY, dueTime: "02:00" }],
    ["วิ่งหกโมงเช้า", { title: "วิ่ง", dueDate: TODAY, dueTime: "06:00" }],
    ["ตื่นเจ็ดโมง", { title: "ตื่น", dueDate: TODAY, dueTime: "07:00" }],
    ["เข้างานแปดโมงเช้า", { title: "เข้างาน", dueDate: TODAY, dueTime: "08:00" }],
    ["ประชุมเก้าโมงเช้า", { title: "ประชุม", dueDate: TODAY, dueTime: "09:00" }],
    ["ประชุมสิบโมง", { title: "ประชุม", dueDate: TODAY, dueTime: "10:00" }],
    ["ประชุมสิบเอ็ดโมง", { title: "ประชุม", dueDate: TODAY, dueTime: "11:00" }],
    ["กินข้าวเที่ยง", { title: "กินข้าว", dueDate: TODAY, dueTime: "12:00" }],
    ["กินข้าวเที่ยงวัน", { title: "กินข้าว", dueDate: TODAY, dueTime: "12:00" }],
    ["นัดหมอบ่ายโมง", { title: "นัดหมอ", dueDate: TODAY, dueTime: "13:00" }],
    ["นัดหมอบ่ายสอง", { title: "นัดหมอ", dueDate: TODAY, dueTime: "14:00" }],
    ["นัดหมอบ่ายสามโมง", { title: "นัดหมอ", dueDate: TODAY, dueTime: "15:00" }],
    ["นัดหมอบ่ายสี่", { title: "นัดหมอ", dueDate: TODAY, dueTime: "16:00" }],
    ["รับลูกบ่ายห้าโมง", { title: "รับลูก", dueDate: TODAY, dueTime: "17:00" }],
    ["รับลูกห้าโมงเย็น", { title: "รับลูก", dueDate: TODAY, dueTime: "17:00" }],
    ["ทำกับข้าวหกโมงเย็น", { title: "ทำกับข้าว", dueDate: TODAY, dueTime: "18:00" }],
    ["ดูหนังทุ่มนึง", { title: "ดูหนัง", dueDate: TODAY, dueTime: "19:00" }],
    ["ดูหนังหนึ่งทุ่ม", { title: "ดูหนัง", dueDate: TODAY, dueTime: "19:00" }],
    ["ดูหนังทุ่มหนึ่ง", { title: "ดูหนัง", dueDate: TODAY, dueTime: "19:00" }],
    ["อ่านหนังสือสองทุ่ม", { title: "อ่านหนังสือ", dueDate: TODAY, dueTime: "20:00" }],
    ["อ่านหนังสือสามทุ่ม", { title: "อ่านหนังสือ", dueDate: TODAY, dueTime: "21:00" }],
    ["โทรหาแม่สี่ทุ่ม", { title: "โทรหาแม่", dueDate: TODAY, dueTime: "22:00" }],
    ["นอนห้าทุ่ม", { title: "นอน", dueDate: TODAY, dueTime: "23:00" }],
    ["ปิดไฟเที่ยงคืน", { title: "ปิดไฟ", dueDate: TODAY, dueTime: "00:00" }],
    ["ทุ่มเทกับงาน", { title: "ทุ่มเทกับงาน" }],
    ["วางแผนเที่ยวเชียงใหม่", { title: "วางแผนเที่ยวเชียงใหม่" }],
    ["ซักผ้าตอนบ่าย", { title: "ซักผ้าตอนบ่าย" }],

    // Priority.
    ["จ่ายภาษี p1", { title: "จ่ายภาษี", priority: "high" }],
    ["จ่ายภาษี P2", { title: "จ่ายภาษี", priority: "medium" }],
    ["จ่ายภาษี p3", { title: "จ่ายภาษี", priority: "low" }],
    ["จ่ายภาษี P4", { title: "จ่ายภาษี", priority: "none" }],
    ["โทรหาแม่p1", { title: "โทรหาแม่", priority: "high" }],
    ["แปลงไฟล์ mp3 app1 p10", { title: "แปลงไฟล์ mp3 app1 p10" }],

    // Only the first match of each kind counts; later ones stay in the title.
    ["p1 แก้บั๊ก p2", { title: "แก้บั๊ก p2", priority: "high" }],
    ["พรุ่งนี้ หรือ วันจันทร์", { title: "หรือ วันจันทร์", dueDate: TOMORROW }],

    // Everything together.
    [
      "ประชุมพรุ่งนี้บ่ายสองห้อง A p1",
      { title: "ประชุม ห้อง A", dueDate: TOMORROW, dueTime: "14:00", priority: "high" },
    ],
    [
      "วันศุกร์ 9.30 ส่งงานลูกค้า P2",
      { title: "ส่งงานลูกค้า", dueDate: "2026-11-20", dueTime: "09:30", priority: "medium" },
    ],
    // The Quick Add mockup: bare บ่าย is not a time, and the removed word leaves a space.
    ["โทรนัดช่างแอร์ พรุ่งนี้บ่าย", { title: "โทรนัดช่างแอร์ บ่าย", dueDate: TOMORROW }],
  ])("%s", (text, expected) => {
    expect(parse(text)).toEqual(expected);
  });

  describe("across midnight in the user's time zone", () => {
    // 17:30 UTC on the 14th is already 00:30 on the 15th in Bangkok.
    const justAfterMidnightInBangkok = Date.UTC(2026, 10, 14, 17, 30);

    it("counts days from the Bangkok date", () => {
      expect(parseQuickAdd("งาน วันนี้", justAfterMidnightInBangkok, "Asia/Bangkok", "mon").dueDate).toBe("2026-11-15");
      expect(parseQuickAdd("งาน พรุ่งนี้", justAfterMidnightInBangkok, "Asia/Bangkok", "mon").dueDate).toBe(
        "2026-11-16",
      );
    });

    it("counts days from the UTC date in UTC", () => {
      expect(parseQuickAdd("งาน วันนี้", justAfterMidnightInBangkok, "UTC", "mon").dueDate).toBe("2026-11-14");
    });

    it("finds the next weekday from the local date", () => {
      // It is already Sunday in Bangkok, so วันอาทิตย์ is a week away.
      expect(parseQuickAdd("งาน วันอาทิตย์", justAfterMidnightInBangkok, "Asia/Bangkok", "sun").dueDate).toBe(
        "2026-11-22",
      );
    });

    it("gives a time with no date the local today", () => {
      expect(parseQuickAdd("งาน 9:00", justAfterMidnightInBangkok, "Asia/Bangkok", "mon").dueDate).toBe("2026-11-15");
    });
  });
});

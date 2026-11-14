import { describe, expect, it } from "vitest";
import { highlightParts, snippetAround } from "./highlight";

describe("highlightParts", () => {
  it("marks every place the query appears, Thai words inside a sentence too", () => {
    expect(highlightParts("ส่งงานให้ลูกค้า งานด่วน", "งาน")).toEqual([
      { text: "ส่ง", match: false },
      { text: "งาน", match: true },
      { text: "ให้ลูกค้า ", match: false },
      { text: "งาน", match: true },
      { text: "ด่วน", match: false },
    ]);
  });

  it("ignores letter case and keeps the text as it was written", () => {
    expect(highlightParts("Call LINE support", "line")).toEqual([
      { text: "Call ", match: false },
      { text: "LINE", match: true },
      { text: " support", match: false },
    ]);
  });

  it("treats regular expression characters as plain text", () => {
    expect(highlightParts("ลด 50% (วันเดียว)", "(วัน")).toEqual([
      { text: "ลด 50% ", match: false },
      { text: "(วัน", match: true },
      { text: "เดียว)", match: false },
    ]);
  });

  it("returns the whole text unmarked when there is no match or no query", () => {
    expect(highlightParts("ซื้อนม", "ไข่")).toEqual([{ text: "ซื้อนม", match: false }]);
    expect(highlightParts("ซื้อนม", "  ")).toEqual([{ text: "ซื้อนม", match: false }]);
  });
});

describe("snippetAround", () => {
  it("cuts a long text down to 50 characters, starting 20 before the first match", () => {
    const notes = `${"ก".repeat(60)}เบอร์ช่างแอร์ 081${"ข".repeat(60)}`;

    expect(snippetAround(notes, "ช่างแอร์")).toBe(`…${"ก".repeat(15)}เบอร์ช่างแอร์ 081${"ข".repeat(18)}…`);
  });

  it("keeps a short text whole and gives nothing without a match", () => {
    expect(snippetAround("เบอร์ช่างแอร์", "แอร์")).toBe("เบอร์ช่างแอร์");
    expect(snippetAround("เบอร์ช่างแอร์", "ไฟ")).toBeNull();
  });
});

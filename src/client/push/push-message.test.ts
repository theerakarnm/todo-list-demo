import { describe, expect, it } from "vitest";
import { pickClientToFocus, readPushMessage, safeAppPath } from "./push-message";

describe("safeAppPath", () => {
  it.each(["/task/abc", "/today", "/app/today?task=1"])("accepts %s", (path) => {
    expect(safeAppPath(path)).toBe(path);
  });

  it.each(["https://evil.example/x", "//evil.example/x", "/\\evil.example", "today", "", undefined, 5])(
    "turns %s into the Today page",
    (path) => {
      expect(safeAppPath(path)).toBe("/today");
    },
  );
});

describe("readPushMessage", () => {
  const generic = { title: "JotList", body: "มีการแจ้งเตือนใหม่", url: "/today", tag: undefined };

  it("reads title, body, url and tag", () => {
    const text = JSON.stringify({ title: "ส่งรายงาน", body: "งาน · วันนี้", url: "/task/t1", tag: "task-t1" });

    expect(readPushMessage(text)).toEqual({ title: "ส่งรายงาน", body: "งาน · วันนี้", url: "/task/t1", tag: "task-t1" });
  });

  it("falls back to Today for a missing or foreign url", () => {
    expect(readPushMessage(JSON.stringify({ title: "a", body: "b", url: "https://evil.example" })).url).toBe("/today");
    expect(readPushMessage(JSON.stringify({ title: "a", body: "b" })).url).toBe("/today");
  });

  it("keeps a message with a title but no body or tag", () => {
    expect(readPushMessage(JSON.stringify({ title: "a" }))).toEqual({ title: "a", body: "", url: "/today", tag: undefined });
  });

  it.each([
    ["no data", undefined],
    ["empty data", ""],
    ["text that is not JSON", "hello"],
    ["JSON that is not an object", '"text"'],
    ["null", "null"],
    ["no title", JSON.stringify({ body: "b", url: "/task/t1" })],
    ["an empty title", JSON.stringify({ title: "", body: "b" })],
  ])("shows a generic notification for %s", (_case, text) => {
    expect(readPushMessage(text)).toEqual(generic);
  });
});

describe("pickClientToFocus", () => {
  const origin = "https://jotlist.example";
  const tab = (path: string) => ({ url: origin + path });

  it("picks an open app tab", () => {
    const app = tab("/app/inbox");

    expect(pickClientToFocus([tab("/"), app], origin)).toBe(app);
  });

  it("returns undefined when no app tab is open", () => {
    expect(pickClientToFocus([tab("/login"), { url: "https://other.example/app" }], origin)).toBeUndefined();
    expect(pickClientToFocus([], origin)).toBeUndefined();
  });
});

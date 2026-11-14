import { describe, expect, it } from "vitest";
import { parsePushMessage, pickClientToFocus, safeAppPath } from "./push-message";

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

describe("parsePushMessage", () => {
  it("reads title, body, url and tag", () => {
    const message = parsePushMessage({ title: "ส่งรายงาน", body: "งาน · วันนี้", url: "/task/t1", tag: "task-t1" });

    expect(message).toEqual({ title: "ส่งรายงาน", body: "งาน · วันนี้", url: "/task/t1", tag: "task-t1" });
  });

  it("falls back to Today for a missing or foreign url", () => {
    expect(parsePushMessage({ title: "a", body: "b", url: "https://evil.example" })?.url).toBe("/today");
    expect(parsePushMessage({ title: "a", body: "b" })?.url).toBe("/today");
  });

  it("returns nothing without a title", () => {
    expect(parsePushMessage({ body: "b" })).toBeNull();
    expect(parsePushMessage(null)).toBeNull();
    expect(parsePushMessage("text")).toBeNull();
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

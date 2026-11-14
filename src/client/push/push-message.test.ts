import { describe, expect, it, vi } from "vitest";
import { openAppPath, pickClientToFocus, readPushMessage, safeAppPath } from "./push-message";

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

    expect(readPushMessage(text)).toEqual({
      title: "ส่งรายงาน",
      body: "งาน · วันนี้",
      url: "/task/t1",
      tag: "task-t1",
    });
  });

  it("falls back to Today for a missing or foreign url", () => {
    expect(readPushMessage(JSON.stringify({ title: "a", body: "b", url: "https://evil.example" })).url).toBe("/today");
    expect(readPushMessage(JSON.stringify({ title: "a", body: "b" })).url).toBe("/today");
  });

  it("keeps a message with a title but no body or tag", () => {
    const message = readPushMessage(JSON.stringify({ title: "a" }));

    expect(message).toEqual({ title: "a", body: "", url: "/today", tag: undefined });
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

describe("openAppPath", () => {
  const origin = "https://jotlist.example";

  function appTab(navigateResult: () => Promise<unknown>) {
    return { url: `${origin}/app/inbox`, focus: vi.fn(async () => ({})), navigate: vi.fn(navigateResult) };
  }

  it("focuses an open app tab and navigates it to the path", async () => {
    const tab = appTab(async () => ({}));
    const openWindow = vi.fn(async () => null);

    await openAppPath([tab], origin, "/task/t1", openWindow);

    expect(tab.focus).toHaveBeenCalled();
    expect(tab.navigate).toHaveBeenCalledWith("/task/t1");
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("opens a new window when no app tab is open", async () => {
    const openWindow = vi.fn(async () => null);

    await openAppPath([{ url: `${origin}/login`, focus: vi.fn(), navigate: vi.fn() }], origin, "/today", openWindow);

    expect(openWindow).toHaveBeenCalledWith("/today");
  });

  it.each([
    ["navigate gives no tab back", () => Promise.resolve(null)],
    ["navigate fails", () => Promise.reject(new TypeError("not controlled"))],
  ])("opens a new window when %s", async (_case, navigateResult) => {
    const openWindow = vi.fn(async () => null);

    await openAppPath([appTab(navigateResult)], origin, "/task/t1", openWindow);

    expect(openWindow).toHaveBeenCalledWith("/task/t1");
  });

  it("opens a new window when the tab cannot be focused", async () => {
    const tab = appTab(async () => ({}));
    tab.focus.mockRejectedValue(new Error("not allowed"));
    const openWindow = vi.fn(async () => null);

    await openAppPath([tab], origin, "/task/t1", openWindow);

    expect(openWindow).toHaveBeenCalledWith("/task/t1");
  });
});

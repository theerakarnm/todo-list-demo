import { describe, expect, it } from "vitest";
import { pageDefaults } from "./page-defaults";

describe("pageDefaults", () => {
  it("starts Quick Add in the project whose page is open", () => {
    expect(pageDefaults("/app/projects/p-1", "2026-11-14")).toEqual({ projectId: "p-1" });
  });

  it("starts Quick Add on today's date on Today", () => {
    expect(pageDefaults("/app/today", "2026-11-14")).toEqual({ dueDate: "2026-11-14" });
  });

  it("starts empty (Inbox, no date) anywhere else", () => {
    expect(pageDefaults("/app/inbox", "2026-11-14")).toEqual({});
    expect(pageDefaults("/app/upcoming", "2026-11-14")).toEqual({});
  });
});

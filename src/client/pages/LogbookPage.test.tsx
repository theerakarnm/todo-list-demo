import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { stubApi } from "../test/fake-api";
import { renderWithStore } from "../test/render";
import LogbookPage from "./LogbookPage";

const completedAt = Date.UTC(2026, 10, 14, 3, 0);

function pageOf(count: number, offset: number) {
  return Array.from({ length: count }, (_, i) =>
    aTask({ id: `done-${offset + i}`, title: `งานที่ ${offset + i}`, completedAt: completedAt - (offset + i) * 1000 }),
  );
}

describe("LogbookPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("pages 50 at a time with load more", async () => {
    const calls = stubApi({
      "GET /api/logbook": (request) =>
        new URL(request.url).searchParams.has("before")
          ? { tasks: pageOf(3, 50), next: null }
          : { tasks: pageOf(50, 0), next: { before: completedAt - 49_000, beforeId: "done-49" } },
    });
    renderWithStore(<LogbookPage />, storeWith({}), "/app/logbook");

    expect(await screen.findByRole("link", { name: "งานที่ 0" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /ทำเครื่องหมายว่ายังไม่เสร็จ/ })).toHaveLength(50);
    fireEvent.click(screen.getByRole("button", { name: th.pages.completed.loadMore }));

    expect(await screen.findByRole("link", { name: "งานที่ 52" })).toBeTruthy();
    expect(calls[1]?.search.get("beforeId")).toBe("done-49");
    expect(screen.queryByRole("button", { name: th.pages.completed.loadMore })).toBeNull();
  });

  it("unticking a task takes it out of the Logbook and restores it", async () => {
    const calls = stubApi({
      "GET /api/logbook": () => ({ tasks: [aTask({ id: "done-1", title: "จ่ายค่าไฟ", completedAt })], next: null }),
      "PATCH /api/tasks/:id": () => aTask({ id: "done-1", title: "จ่ายค่าไฟ", updatedAt: 9 }),
    });
    renderWithStore(<LogbookPage />, storeWith({}), "/app/logbook");

    fireEvent.click(await screen.findByRole("button", { name: "ทำเครื่องหมายว่ายังไม่เสร็จ: จ่ายค่าไฟ" }));

    await waitFor(() => expect(screen.queryByRole("link", { name: "จ่ายค่าไฟ" })).toBeNull());
    await waitFor(() => expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ completed: false }));
  });
});

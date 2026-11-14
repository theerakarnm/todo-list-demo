import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SYNC_QUERY_KEY } from "../data/sync-query";
import type { SyncStore } from "../data/sync-store";
import { aProject, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { apiError, echoCreatedRow, stubApi } from "../test/fake-api";
import { renderWithStore } from "../test/render";
import { QuickAddDialog } from "./QuickAddDialog";
import type { QuickAddDefaults } from "./quick-add-context";

const home = aProject({ id: "p-home", name: "บ้าน" });

function renderQuickAdd(defaults: QuickAddDefaults = {}, putTask = echoCreatedRow) {
  const calls = stubApi({ "PUT /api/tasks/:id": putTask });
  const onClose = vi.fn();
  const rendered = renderWithStore(
    <QuickAddDialog defaults={defaults} onClose={onClose} />,
    storeWith({ projects: [home] }),
  );
  const input = screen.getByRole("textbox", { name: th.quickAdd.titleField });
  const type = (text: string) => fireEvent.change(input, { target: { value: text } });
  const save = () => fireEvent.submit(input);
  return { ...rendered, calls, onClose, type, save };
}

const chip = (name: string) => screen.getByRole("combobox", { name }).closest("label")?.textContent ?? "";
const dateChip = () => screen.getByLabelText(th.quickAdd.chooseDate).closest("label")?.textContent ?? "";

describe("QuickAddDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 14, 3, 0)); // Saturday 14 Nov, 10:00 in Bangkok
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows what it read from the title in the chips and saves the clean title", async () => {
    const { calls, onClose, type, save } = renderQuickAdd();

    type("โทรนัดช่างแอร์ พรุ่งนี้บ่าย p2");
    expect(chip(th.quickAdd.chooseProject)).toContain("Inbox");
    expect(dateChip()).toContain("พรุ่งนี้");
    expect(chip(th.quickAdd.choosePriority)).toContain("P2");
    save();

    await waitFor(() =>
      expect(calls[0]?.body).toMatchObject({
        title: "โทรนัดช่างแอร์ บ่าย",
        projectId: null,
        dueDate: "2026-11-15",
        dueTime: null,
        priority: "medium",
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("adds a time it read to the date chip", () => {
    const { type } = renderQuickAdd();

    type("ประชุมทีม 14:00");

    expect(dateChip()).toContain("วันนี้ 14:00");
  });

  it("starts from the page's project and date, which the title can still change", async () => {
    const { calls, type, save } = renderQuickAdd({ projectId: home.id, dueDate: "2026-11-17" });
    expect(chip(th.quickAdd.chooseProject)).toContain("บ้าน");
    expect(dateChip()).toContain("อังคาร 17 พ.ย.");

    type("ซ่อมก๊อกน้ำ");
    save();

    await waitFor(() =>
      expect(calls[0]?.body).toMatchObject({ title: "ซ่อมก๊อกน้ำ", projectId: home.id, dueDate: "2026-11-17" }),
    );
  });

  it("lets the chips override what was read", async () => {
    const { calls, type, save } = renderQuickAdd();

    type("ส่งรายงาน p1 พรุ่งนี้");
    const priority = screen.getByRole("combobox", { name: th.quickAdd.choosePriority });
    fireEvent.change(priority, { target: { value: "low" } });
    fireEvent.change(screen.getByRole("combobox", { name: th.quickAdd.chooseProject }), {
      target: { value: home.id },
    });
    fireEvent.click(screen.getByRole("button", { name: th.quickAdd.clearDate }));
    save();

    await waitFor(() =>
      expect(calls[0]?.body).toMatchObject({ priority: "low", projectId: home.id, dueDate: null, dueTime: null }),
    );
  });

  it("does not save a title that is only date words", () => {
    const { calls, onClose, type, save } = renderQuickAdd();

    type("พรุ่งนี้");
    save();

    expect(calls).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("takes the task back off the screen and explains the 1,000 task limit", async () => {
    const { queryClient, type, save } = renderQuickAdd({}, async () => apiError(409, "TASK_LIMIT"));

    type("งานที่ 1001");
    save();

    expect(await screen.findByText(th.errors.api.TASK_LIMIT.replace("{{limit}}", "1,000"))).toBeTruthy();
    expect(Object.keys(queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY)?.tasks ?? {})).toEqual([]);
  });
});

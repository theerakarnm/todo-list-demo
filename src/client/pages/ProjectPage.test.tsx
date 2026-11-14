import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SYNC_QUERY_KEY } from "../data/sync-query";
import type { SyncStore } from "../data/sync-store";
import { aProject, aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { stubApi } from "../test/fake-api";
import { renderWithStore } from "../test/render";
import ProjectPage from "./ProjectPage";

const store = storeWith({
  projects: [aProject({ id: "p1", name: "งาน", color: "blue" })],
  tasks: [
    aTask({ id: "t1", title: "ส่งใบเสนอราคาให้ลูกค้า", projectId: "p1" }),
    aTask({ id: "t2", title: "ไม่อยู่ในโปรเจกต์" }),
    aTask({ id: "t3", title: "เสร็จไปแล้ว", projectId: "p1", completedAt: 5 }),
  ],
});

function renderProject() {
  return renderWithStore(
    <Routes>
      <Route path="/app/projects/:projectId" element={<ProjectPage />} />
      <Route path="/app/today" element={<p>today page</p>} />
    </Routes>,
    store,
    "/app/projects/p1",
  );
}

const projectIn = (queryClient: { getQueryData: (key: typeof SYNC_QUERY_KEY) => unknown }) =>
  (queryClient.getQueryData(SYNC_QUERY_KEY) as SyncStore).projects.p1;

describe("ProjectPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists the project's open tasks", () => {
    renderProject();

    expect(screen.getByRole("textbox", { name: th.pages.project.nameLabel })).toHaveProperty("value", "งาน");
    expect(screen.getByText("เปิดอยู่ / open - 1")).toBeTruthy();
    expect(screen.getByRole("link", { name: "ส่งใบเสนอราคาให้ลูกค้า" })).toBeTruthy();
    expect(screen.queryByText("ไม่อยู่ในโปรเจกต์")).toBeNull();
  });

  it("renames inline when the title is edited and Enter is pressed", async () => {
    const calls = stubApi({ "PATCH /api/projects/:id": () => aProject({ id: "p1", name: "งานบริษัท", updatedAt: 9 }) });
    const { queryClient } = renderProject();

    const title = screen.getByRole("textbox", { name: th.pages.project.nameLabel });
    fireEvent.change(title, { target: { value: "งานบริษัท" } });
    fireEvent.keyDown(title, { key: "Enter" });
    fireEvent.blur(title);

    await waitFor(() => expect(calls[0]?.body).toEqual({ name: "งานบริษัท" }));
    expect(projectIn(queryClient)?.name).toBe("งานบริษัท");
  });

  it("changes colour from the project menu", async () => {
    const calls = stubApi({ "PATCH /api/projects/:id": () => aProject({ id: "p1", color: "orange", updatedAt: 9 }) });
    renderProject();

    fireEvent.click(screen.getByRole("button", { name: th.pages.project.menu }));
    fireEvent.click(screen.getByRole("radio", { name: th.projectColors.orange }));

    await waitFor(() => expect(calls[0]?.body).toEqual({ color: "orange" }));
  });

  it("deletes after a confirm dialog, leaves the page, and Undo restores the project", async () => {
    const calls = stubApi({
      "DELETE /api/projects/:id": () => aProject({ id: "p1", deletedAt: 5, updatedAt: 5 }),
      "POST /api/projects/:id/restore": () => aProject({ id: "p1", name: "งาน", updatedAt: 6 }),
    });
    const { queryClient } = renderProject();

    fireEvent.click(screen.getByRole("button", { name: th.pages.project.menu }));
    fireEvent.click(screen.getByRole("button", { name: "ลบโปรเจกต์ (1 งาน)" }));
    const dialog = within(screen.getByRole("dialog", { name: th.pages.project.confirmTitle }));
    fireEvent.click(dialog.getByRole("button", { name: th.pages.project.confirmDelete }));

    expect(await screen.findByText("today page")).toBeTruthy();
    await waitFor(() => expect(projectIn(queryClient)).toBeUndefined());
    expect((queryClient.getQueryData(SYNC_QUERY_KEY) as SyncStore).tasks.t3).toBeUndefined();
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: th.toast.undo }));
    await waitFor(() => expect(calls.map((call) => call.method)).toEqual(["DELETE", "POST"]));
    expect(projectIn(queryClient)?.name).toBe("งาน");
    expect((queryClient.getQueryData(SYNC_QUERY_KEY) as SyncStore).tasks.t1).toBeDefined();
    expect((queryClient.getQueryData(SYNC_QUERY_KEY) as SyncStore).tasks.t3).toBeDefined();
  });

  it("shows recent completed tasks when asked, with a link to all of them", async () => {
    stubApi({
      "GET /api/logbook": () => ({
        tasks: [aTask({ id: "done", title: "ส่งใบแจ้งหนี้เดือนตุลาคม", projectId: "p1", completedAt: 5 })],
        subtasks: [],
        next: null,
      }),
    });
    renderProject();

    fireEvent.click(screen.getByRole("checkbox", { name: th.pages.project.showCompleted }));

    expect(await screen.findByRole("link", { name: "ส่งใบแจ้งหนี้เดือนตุลาคม" })).toBeTruthy();
    expect(screen.getByText("เสร็จแล้ว / completed - 2")).toBeTruthy();
    expect(screen.getByRole("link", { name: th.pages.project.seeAll }).getAttribute("href")).toBe("/app/logbook?project=p1");
  });
});

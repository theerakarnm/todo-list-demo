import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { aProject, aTask, storeWith } from "../data/test-rows";
import th from "../i18n/th.json";
import { renderWithStore } from "../test/render";
import { SidebarContent } from "./SidebarContent";

describe("SidebarContent", () => {
  it("shows the real projects and active task counts", () => {
    const noop = () => {};
    renderWithStore(
      <SidebarContent onOpenSearch={noop} onOpenQuickAdd={noop} onNewProject={noop} />,
      storeWith({
        projects: [aProject({ id: "p2", name: "ส่วนตัว", position: "a2" }), aProject({ id: "p1", name: "งาน", position: "a1" })],
        tasks: [
          aTask({ id: "t1", projectId: "p1" }),
          aTask({ id: "t2", projectId: "p1", completedAt: 5 }),
          aTask({ id: "t3", dueDate: "2000-01-01" }),
        ],
      }),
    );

    const projects = within(screen.getByRole("navigation", { name: th.nav.projects })).getAllByRole("link");
    expect(projects.map((link) => link.textContent)).toEqual(["งาน1", "ส่วนตัว0"]);
    const views = within(screen.getByRole("navigation", { name: th.nav.smartViews }));
    expect(views.getByRole("link", { name: /Inbox/ }).textContent).toContain("1");
    expect(views.getByRole("link", { name: /Today/ }).textContent).toContain("1");
  });
});

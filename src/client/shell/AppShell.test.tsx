import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../AppProviders";
import th from "../i18n/th.json";
import { routes } from "../routes";
import { stubSystemPrefersDark } from "../theme/test-utils";

async function renderShellAt(path: string) {
  stubSystemPrefersDark(false);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  await screen.findByRole("heading", { level: 1 });
  return { router, sidebar: screen.getByRole("complementary", { name: th.nav.sidebar }) };
}

describe("AppShell desktop sidebar", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("shows the sidebar chrome from the Today mockup", async () => {
    const { sidebar } = await renderShellAt("/app/today");
    const inSidebar = within(sidebar);

    for (const label of [
      th.nav.search,
      th.nav.searchShortcut,
      th.nav.addTask,
      th.nav.addTaskShortcut,
      th.nav.smartViews,
      th.nav.inbox,
      th.nav.today,
      th.nav.upcoming,
      th.nav.completed,
      th.nav.projects,
      th.nav.noProjects,
      th.nav.newProject,
      th.nav.collapse,
    ]) {
      expect(inSidebar.getByText(label)).toBeTruthy();
    }
    expect(inSidebar.getByRole("link", { name: th.nav.settings })).toBeTruthy();
  });

  it("marks the current smart view", async () => {
    const { sidebar } = await renderShellAt("/app/upcoming");

    const current = within(sidebar).getByRole("link", { current: "page" });

    expect(current.textContent).toContain(th.nav.upcoming);
  });

  it("collapses to an icon rail and remembers it on this device", async () => {
    const { sidebar } = await renderShellAt("/app/today");

    act(() => within(sidebar).getByRole("button", { name: th.nav.collapse }).click());

    expect(sidebar.dataset.collapsed).toBe("true");
    expect(within(sidebar).getByRole("button", { name: th.nav.expand })).toBeTruthy();
    expect(localStorage.getItem("jotlist-sidebar-collapsed")).toBe("true");
  });

  it("starts collapsed when it was collapsed before", async () => {
    localStorage.setItem("jotlist-sidebar-collapsed", "true");

    const { sidebar } = await renderShellAt("/app/today");

    expect(sidebar.dataset.collapsed).toBe("true");
  });

  it("opens Search with Ctrl+K and Quick Add with Q", async () => {
    await renderShellAt("/app/today");

    fireEvent.keyDown(window, { code: "KeyK", key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: th.nav.search })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(window, { code: "KeyQ", key: "q" });
    expect(screen.getByRole("dialog", { name: th.nav.addTask })).toBeTruthy();
  });
});

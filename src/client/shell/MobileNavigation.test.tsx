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
  return router;
}

function openDrawer() {
  act(() => screen.getByRole("button", { name: th.nav.openMenu }).click());
  return screen.getByRole("dialog", { name: th.nav.menu });
}

describe("mobile bottom bar", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("has Today, Inbox, Upcoming, Search and Add", async () => {
    await renderShellAt("/app/today");
    const bottomBar = within(screen.getByRole("navigation", { name: th.bottomBar.label }));

    expect(bottomBar.getByRole("link", { name: th.bottomBar.today }).getAttribute("aria-current")).toBe("page");
    expect(bottomBar.getByRole("link", { name: th.bottomBar.inbox })).toBeTruthy();
    expect(bottomBar.getByRole("link", { name: th.bottomBar.upcoming })).toBeTruthy();
    expect(bottomBar.getByRole("button", { name: th.bottomBar.search })).toBeTruthy();
    expect(bottomBar.getByRole("button", { name: th.bottomBar.add })).toBeTruthy();
  });

  it("opens Search and Quick Add", async () => {
    await renderShellAt("/app/today");
    const bottomBar = within(screen.getByRole("navigation", { name: th.bottomBar.label }));

    act(() => bottomBar.getByRole("button", { name: th.bottomBar.add }).click());

    expect(screen.getByRole("dialog", { name: th.nav.addTask })).toBeTruthy();
  });
});

describe("mobile drawer", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens from the menu button as a modal with the full sidebar", async () => {
    await renderShellAt("/app/today");

    const drawer = openDrawer();

    expect(drawer.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("button", { name: th.nav.openMenu }).getAttribute("aria-expanded")).toBe("true");
    expect(within(drawer).getByRole("navigation", { name: th.nav.smartViews })).toBeTruthy();
    expect(within(drawer).getByRole("navigation", { name: th.nav.projects })).toBeTruthy();
  });

  it("closes with Esc", async () => {
    await renderShellAt("/app/today");
    const drawer = openDrawer();

    fireEvent.keyDown(drawer, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes when the overlay is clicked", async () => {
    await renderShellAt("/app/today");
    const drawer = openDrawer();

    fireEvent.click(drawer);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("stays open when its content is clicked", async () => {
    await renderShellAt("/app/today");
    const drawer = openDrawer();

    fireEvent.click(within(drawer).getByText(th.nav.smartViews));

    expect(screen.getByRole("dialog", { name: th.nav.menu })).toBeTruthy();
  });

  it("closes after navigating to another page", async () => {
    const router = await renderShellAt("/app/today");
    const drawer = openDrawer();

    act(() => within(drawer).getByRole("link", { name: /Inbox/ }).click());

    await screen.findByRole("heading", { level: 1, name: th.pages.inbox.title });
    expect(router.state.location.pathname).toBe("/app/inbox");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

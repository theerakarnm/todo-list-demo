import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { AppProviders } from "../AppProviders";
import { routes } from "../routes";
import { stubSystemPrefersDark } from "../theme/test-utils";

/** Renders the whole app at `path`, as a browser opening that address would. */
export function renderAppAt(path: string) {
  stubSystemPrefersDark(false);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

/** Waits for the page's h1, then returns the router so the test can check the address. */
export async function openPage(path: string) {
  const router = renderAppAt(path);
  await screen.findByRole("heading", { level: 1 });
  return router;
}

// The toast region outside <main> is an alert too (empty until a toast comes), so look inside the page.
/** The page's own inline error. */
export function findPageAlert() {
  return within(screen.getByRole("main")).findByRole("alert");
}

export function getPageAlert() {
  return within(screen.getByRole("main")).getByRole("alert");
}

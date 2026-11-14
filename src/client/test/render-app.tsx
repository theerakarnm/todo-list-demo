import { render, screen } from "@testing-library/react";
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

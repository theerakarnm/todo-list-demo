import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { AppProviders } from "./AppProviders";
import th from "./i18n/th.json";
import { routes } from "./routes";
import { stubSystemPrefersDark } from "./theme/test-utils";

function renderAt(path: string) {
  stubSystemPrefersDark(false);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

describe("routes", () => {
  it.each([
    ["/", th.pages.landing.title],
    ["/login", th.pages.login.title],
    ["/signup", th.pages.signup.title],
    ["/onboarding/1", th.pages.onboardingName.title],
    ["/onboarding/2", th.pages.onboardingProjects.title],
    ["/privacy", th.pages.privacy.title],
    ["/terms", th.pages.terms.title],
    ["/app/today", th.pages.today.title],
    ["/app/inbox", th.pages.inbox.title],
    ["/app/upcoming", th.pages.upcoming.title],
    ["/app/logbook", th.pages.completed.title],
    ["/app/projects/abc", th.pages.project.title],
    ["/app/settings", th.pages.settings.title],
    ["/no-such-page", th.pages.notFound.title],
  ])("%s shows its page", async (path, title) => {
    renderAt(path);

    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeTruthy();
  });

  it("sends /app to Today", async () => {
    const router = renderAt("/app");

    await screen.findByRole("heading", { level: 1, name: th.pages.today.title });
    expect(router.state.location.pathname).toBe("/app/today");
  });
});

import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { AppProviders } from "./AppProviders";
import th from "./i18n/th.json";
import { routes } from "./routes";
import { signedInAs, signedOut, testMe } from "./test/fake-api";
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
    ["/", th.landing.hero.line1 + th.landing.hero.line2 + th.landing.hero.line3 + th.landing.hero.highlight],
    ["/login", th.pages.login.title],
    ["/signup", th.pages.signup.title],
    ["/forgot-password", th.pages.forgotPassword.title],
    ["/reset-password", th.pages.resetPassword.title],
    ["/verify-email", th.pages.verifyEmail.title],
    ["/privacy", th.pages.privacy.title],
    ["/terms", th.pages.terms.title],
    ["/no-such-page", th.pages.notFound.title],
  ])("%s shows its page to a signed-out visitor", async (path, title) => {
    signedOut();
    renderAt(path);

    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeTruthy();
  });

  it.each([
    ["/onboarding/1", th.pages.onboardingName.title],
    ["/onboarding/2", th.pages.onboardingProjects.title],
  ])("%s shows its page to a new user", async (path, title) => {
    signedInAs(testMe({ settings: { onboardedAt: null } }));
    renderAt(path);

    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeTruthy();
  });

  it.each([
    ["/app/today", th.pages.today.title],
    ["/app/inbox", th.pages.inbox.title],
    ["/app/upcoming", th.pages.upcoming.title],
    ["/app/logbook", th.pages.completed.title],
    ["/app/projects/abc", th.pages.project.title],
    ["/app/settings", th.pages.settings.title],
  ])("%s shows its page to a signed-in user", async (path, title) => {
    renderAt(path);

    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeTruthy();
  });

  it("explains an unknown address instead of saying the page is being built", async () => {
    renderAt("/no-such-page");

    expect(await screen.findByText(th.pages.notFound.description)).toBeTruthy();
    expect(screen.queryByText(th.pages.comingSoon)).toBeNull();
  });

  it("sends /app to Today", async () => {
    const router = renderAt("/app");

    await screen.findByRole("heading", { level: 1, name: th.pages.today.title });
    expect(router.state.location.pathname).toBe("/app/today");
  });

  it("opens Today at /today, the address a digest notification carries", async () => {
    const router = renderAt("/today");

    await screen.findByRole("heading", { level: 1, name: th.pages.today.title });
    expect(router.state.location.pathname).toBe("/app/today");
  });

  it("opens a task in the TaskDrawer at /task/:id, the address a reminder carries", async () => {
    const router = renderAt("/task/t1");

    await screen.findByRole("heading", { level: 1, name: th.pages.today.title });
    expect(router.state.location.pathname).toBe("/app/today");
    expect(router.state.location.search).toBe("?task=t1");
    expect(await screen.findByRole("dialog", { name: th.drawer.label })).toBeTruthy();
  });
});

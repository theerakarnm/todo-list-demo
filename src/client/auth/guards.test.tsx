import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import th from "../i18n/th.json";
import { signedInAs, signedOut, testMe } from "../test/fake-api";
import { openPage } from "../test/render-app";

function currentPath(router: Awaited<ReturnType<typeof openPage>>) {
  const { pathname, search } = router.state.location;
  return pathname + search;
}

describe("signed-out visitors", () => {
  it("are sent from an app page to Login, which remembers where they wanted to go", async () => {
    signedOut();

    const router = await openPage("/app/projects/abc?view=list");

    expect(screen.getByRole("heading", { level: 1, name: th.pages.login.title })).toBeTruthy();
    expect(currentPath(router)).toBe(`/login?next=${encodeURIComponent("/app/projects/abc?view=list")}`);
  });
});

describe("signed-in users", () => {
  it("go back to the page they wanted after signing in", async () => {
    const router = await openPage(`/login?next=${encodeURIComponent("/app/upcoming")}`);

    expect(currentPath(router)).toBe("/app/upcoming");
  });

  it.each(["//evil.example/app", "https://evil.example/app", "/\\evil.example", "app/today"])(
    "ignore an unsafe next address (%s) and go to the start page",
    async (next) => {
      signedInAs(testMe({ settings: { startPage: "inbox" } }));

      const router = await openPage(`/login?next=${encodeURIComponent(next)}`);

      expect(currentPath(router)).toBe("/app/inbox");
    },
  );

  it.each(["/login", "/signup"])("visiting %s go to their start page", async (path) => {
    signedInAs(testMe({ settings: { startPage: "inbox" } }));

    const router = await openPage(path);

    expect(router.state.location.pathname).toBe("/app/inbox");
  });

  it("opening /app land on their start page", async () => {
    signedInAs(testMe({ settings: { startPage: "inbox" } }));

    const router = await openPage("/app");

    expect(router.state.location.pathname).toBe("/app/inbox");
  });

  it("who have not finished onboarding are sent to onboarding step 1", async () => {
    signedInAs(testMe({ settings: { onboardedAt: null } }));

    const router = await openPage("/app/today");

    expect(router.state.location.pathname).toBe("/onboarding/1");
  });

  it("who have not finished onboarding keep the page they wanted in ?next=", async () => {
    signedInAs(testMe({ settings: { onboardedAt: null } }));

    const router = await openPage("/app/projects/abc?view=list");

    expect(currentPath(router)).toBe(`/onboarding/1?next=${encodeURIComponent("/app/projects/abc?view=list")}`);
  });

  it("sent from Login to onboarding still end up on the page in ?next=", async () => {
    signedInAs(testMe({ settings: { onboardedAt: null } }));

    const router = await openPage(`/login?next=${encodeURIComponent("/app/upcoming")}`);

    expect(currentPath(router)).toBe(`/onboarding/1?next=${encodeURIComponent("/app/upcoming")}`);
  });
});

describe("the sidebar", () => {
  it("shows the display name and email of the signed-in user", async () => {
    signedInAs(testMe({ user: { email: "somchai@example.com" }, settings: { displayName: "สมชาย" } }));

    await openPage("/app/today");

    const sidebar = within(screen.getByRole("complementary", { name: th.nav.sidebar }));
    expect(sidebar.getByText("สมชาย")).toBeTruthy();
    expect(sidebar.getByText("somchai@example.com")).toBeTruthy();
  });

  it("shows no email for a LINE-only account", async () => {
    signedInAs(testMe({ user: { email: null, hasPassword: false, hasLine: true }, settings: { displayName: "LINE คน" } }));

    await openPage("/app/today");

    const sidebar = within(screen.getByRole("complementary", { name: th.nav.sidebar }));
    expect(sidebar.getByText("LINE คน")).toBeTruthy();
    expect(sidebar.queryByText("narin@example.com")).toBeNull();
  });
});

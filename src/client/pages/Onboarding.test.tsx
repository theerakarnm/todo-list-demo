import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import th from "../i18n/th.json";
import { answer, apiError, lastJsonSentTo, signedInAs, signedOut, testMe } from "../test/fake-api";
import { openPage } from "../test/render-app";

const newUser = testMe({ settings: { displayName: "narin", onboardedAt: null } });
const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

afterEach(() => localStorage.clear());

function click(name: string) {
  act(() => screen.getByRole("button", { name }).click());
}

async function finishStepOne(displayName?: string) {
  signedInAs(newUser);
  const router = await openPage("/onboarding/1");
  if (displayName) fireEvent.change(screen.getByLabelText(th.onboarding.nameLabel), { target: { value: displayName } });
  click(th.onboarding.continue);
  await screen.findByRole("heading", { level: 1, name: th.pages.onboardingProjects.title });
  return router;
}

describe("onboarding step 1", () => {
  it("prefills the display name", async () => {
    signedInAs(newUser);

    await openPage("/onboarding/1");

    expect(screen.getByLabelText<HTMLInputElement>(th.onboarding.nameLabel).value).toBe("narin");
    expect(screen.getByText(th.onboarding.step1)).toBeTruthy();
  });

  it("applies the picked theme right away", async () => {
    signedInAs(newUser);
    await openPage("/onboarding/1");

    act(() => screen.getByRole("radio", { name: th.theme.dark }).click());

    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

describe("onboarding step 2", () => {
  it("has the three starter projects ticked", async () => {
    await finishStepOne();

    const projects = within(screen.getByRole("group", { name: th.onboarding.projectsCaption }));
    for (const name of ["งาน", "ส่วนตัว", "เป้าหมายปีนี้"]) {
      expect(projects.getByRole<HTMLInputElement>("checkbox", { name }).checked).toBe(true);
    }
  });

  it("creates the ticked projects with the name, theme and browser time zone, then opens the start page", async () => {
    answer("POST /api/onboarding/complete", { body: { settings: {} } });
    const router = await finishStepOne("นรินทร์");
    act(() => screen.getByRole("checkbox", { name: "ส่วนตัว" }).click());
    signedInAs(testMe({ settings: { startPage: "inbox" } }));

    click(th.onboarding.createWorkspace);

    await screen.findByRole("heading", { level: 1, name: th.pages.inbox.title });
    expect(router.state.location.pathname).toBe("/app/inbox");
    expect(await lastJsonSentTo("POST /api/onboarding/complete")).toEqual({
      displayName: "นรินทร์",
      theme: "system",
      timezone: browserTimeZone,
      starterProjects: ["งาน", "เป้าหมายปีนี้"],
    });
  });

  it("Skip creates no projects but still finishes onboarding", async () => {
    answer("POST /api/onboarding/complete", { body: { settings: {} } });
    await finishStepOne();
    signedInAs(testMe());

    click(th.onboarding.skip);

    await screen.findByRole("heading", { level: 1, name: th.pages.today.title });
    expect(await lastJsonSentTo("POST /api/onboarding/complete")).toMatchObject({ starterProjects: [] });
  });

  it("shows the server's message when saving fails", async () => {
    answer("POST /api/onboarding/complete", apiError(429, "RATE_LIMITED", "ส่งคำขอถี่เกินไป"));
    await finishStepOne();

    click(th.onboarding.createWorkspace);

    expect((await screen.findByRole("alert")).textContent).toContain("ส่งคำขอถี่เกินไป");
  });
});

describe("onboarding is shown once", () => {
  it("sends an onboarded user to the start page", async () => {
    signedInAs(testMe({ settings: { startPage: "inbox" } }));

    const router = await openPage("/onboarding/2");

    expect(router.state.location.pathname).toBe("/app/inbox");
  });

  it("sends a signed-out visitor to Login", async () => {
    signedOut();

    const router = await openPage("/onboarding/1");

    expect(router.state.location.pathname).toBe("/login");
  });
});

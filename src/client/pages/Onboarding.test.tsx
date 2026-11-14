import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import th from "../i18n/th.json";
import { answer, apiError, lastJsonSentTo, signedInAs, signedOut, testMe } from "../test/fake-api";
import { findPageAlert, openPage } from "../test/render-app";

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
  it("offers six starter projects in the mockup order, the first three ticked", async () => {
    await finishStepOne();

    const projects = within(screen.getByRole("group", { name: th.onboarding.projectsCaption }));
    const boxes = projects.getAllByRole<HTMLInputElement>("checkbox");
    expect(boxes.map((box) => [box.closest("label")?.textContent, box.checked])).toEqual([
      ["งาน", true],
      ["ส่วนตัว", true],
      ["เป้าหมายปีนี้", true],
      ["เรียนรู้", false],
      ["ครอบครัว", false],
      ["การเงิน", false],
    ]);
  });

  it("sends an extra project once it is ticked", async () => {
    answer("POST /api/onboarding/complete", { settings: {} });
    await finishStepOne();
    act(() => screen.getByRole("checkbox", { name: "การเงิน" }).click());

    click(th.onboarding.createWorkspace);

    await vi.waitFor(async () =>
      expect((await lastJsonSentTo("POST /api/onboarding/complete")).starterProjects.at(-1)).toEqual({ key: "finance", name: "การเงิน" }),
    );
  });

  it("creates the ticked projects with the name, theme and browser time zone, then opens the start page", async () => {
    answer("POST /api/onboarding/complete", { settings: {} });
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
      starterProjects: [
        { key: "work", name: "งาน" },
        { key: "yearGoals", name: "เป้าหมายปีนี้" },
      ],
    });
  });

  it("Skip creates no projects but still finishes onboarding", async () => {
    answer("POST /api/onboarding/complete", { settings: {} });
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

    expect((await findPageAlert()).textContent).toContain("ส่งคำขอถี่เกินไป");
  });
});

describe("onboarding keeps the page the user wanted", () => {
  async function openStepOneWith(next: string) {
    signedInAs(newUser);
    const router = await openPage(`/onboarding/1?next=${encodeURIComponent(next)}`);
    click(th.onboarding.continue);
    await screen.findByRole("heading", { level: 1, name: th.pages.onboardingProjects.title });
    return router;
  }

  it("carries ?next= from step 1 to step 2 and goes there when finished", async () => {
    answer("POST /api/onboarding/complete", { settings: {} });
    const router = await openStepOneWith("/app/upcoming");
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent("/app/upcoming")}`);
    signedInAs(testMe());

    click(th.onboarding.createWorkspace);

    await screen.findByRole("heading", { level: 1, name: th.pages.upcoming.title });
    expect(router.state.location.pathname).toBe("/app/upcoming");
  });

  it("goes there after Skip too", async () => {
    answer("POST /api/onboarding/complete", { settings: {} });
    const router = await openStepOneWith("/app/upcoming");
    signedInAs(testMe());

    click(th.onboarding.skip);

    await screen.findByRole("heading", { level: 1, name: th.pages.upcoming.title });
    expect(router.state.location.pathname).toBe("/app/upcoming");
  });

  it.each(["//evil.example", "https://evil.example", "/\\evil.example"])("ignores the unsafe next %s", async (next) => {
    answer("POST /api/onboarding/complete", { settings: {} });
    const router = await openStepOneWith(next);
    signedInAs(testMe({ settings: { startPage: "inbox" } }));

    click(th.onboarding.skip);

    await screen.findByRole("heading", { level: 1, name: th.pages.inbox.title });
    expect(router.state.location.pathname).toBe("/app/inbox");
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

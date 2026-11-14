import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import th from "../i18n/th.json";
import { answer, answerLater, apiError, lastJsonSentTo, signedInAs, testMe } from "../test/fake-api";
import { openPage } from "../test/render-app";

const t = th.settingsGeneral;

afterEach(() => localStorage.clear());

function pick(name: string) {
  act(() => screen.getByRole("radio", { name }).click());
}

function isPicked(name: string) {
  return screen.getByRole<HTMLInputElement>("radio", { name }).checked;
}

describe("Settings → General", () => {
  it("shows the saved settings", async () => {
    signedInAs(testMe({ settings: { startPage: "inbox", weekStart: "sun", timezone: "Asia/Tokyo" } }));

    await openPage("/app/settings?tab=general");

    expect(isPicked(t.startPage.inbox)).toBe(true);
    expect(isPicked(t.weekStart.sun)).toBe(true);
    expect(screen.getByLabelText<HTMLSelectElement>(t.timezoneLabel).value).toBe("Asia/Tokyo");
  });

  it("follows the theme saved on the account", async () => {
    signedInAs(testMe({ settings: { theme: "dark" } }));

    await openPage("/app/settings?tab=general");

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(isPicked(th.theme.dark)).toBe(true);
  });

  it("applies a new theme at once and saves it", async () => {
    const save = answerLater("PATCH /api/settings");
    await openPage("/app/settings?tab=general");

    pick(th.theme.dark);

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(await lastJsonSentTo("PATCH /api/settings")).toEqual({ theme: "dark" });
    save.reply({ body: { settings: testMe({ settings: { theme: "dark" } }).settings } });
  });

  it.each([
    [t.startPage.inbox, { startPage: "inbox" }],
    [t.weekStart.sun, { weekStart: "sun" }],
  ] as const)("saves %s", async (label, changes) => {
    answer("PATCH /api/settings", { body: { settings: testMe({ settings: changes }).settings } });
    await openPage("/app/settings?tab=general");

    pick(label);

    await waitFor(() => expect(isPicked(label)).toBe(true));
    expect(await lastJsonSentTo("PATCH /api/settings")).toEqual(changes);
  });

  it("offers every IANA time zone and saves the one picked", async () => {
    answer("PATCH /api/settings", { body: { settings: testMe({ settings: { timezone: "Europe/London" } }).settings } });
    await openPage("/app/settings?tab=general");
    const select = screen.getByLabelText<HTMLSelectElement>(t.timezoneLabel);

    expect(select.options.length).toBeGreaterThanOrEqual(Intl.supportedValuesOf("timeZone").length);
    fireEvent.change(select, { target: { value: "Europe/London" } });

    expect(await lastJsonSentTo("PATCH /api/settings")).toEqual({ timezone: "Europe/London" });
  });

  it("goes back to the old value and shows the error when the server refuses", async () => {
    answer("PATCH /api/settings", apiError(429, "RATE_LIMITED", "ส่งคำขอถี่เกินไป"));
    await openPage("/app/settings?tab=general");

    pick(th.theme.dark);

    expect((await screen.findByRole("alert")).textContent).toContain("ส่งคำขอถี่เกินไป");
    expect(isPicked(th.theme.system)).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

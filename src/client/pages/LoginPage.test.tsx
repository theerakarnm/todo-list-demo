import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import th from "../i18n/th.json";
import { answer, apiError, lastJsonSentTo, signedInAs, signedOut, testMe } from "../test/fake-api";
import { findPageAlert, getPageAlert, openPage } from "../test/render-app";
import { goToExternalPage } from "../auth/external-page";

vi.mock("../auth/external-page", () => ({ goToExternalPage: vi.fn() }));

beforeEach(() => {
  signedOut();
  vi.mocked(goToExternalPage).mockClear();
});

function fillIn(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function logIn(email = "narin@example.com", password = "correct-horse-1") {
  fillIn(th.auth.emailLabel, email);
  fillIn(th.auth.passwordLabel, password);
  act(() => screen.getByRole("button", { name: th.auth.login.submit }).click());
}

describe("Login page", () => {
  it("has the mockup's fields, links and LINE button", async () => {
    await openPage("/login");

    expect(screen.getByRole("heading", { level: 1, name: th.pages.login.title })).toBeTruthy();
    expect(screen.getByRole("button", { name: th.auth.continueWithLine })).toBeTruthy();
    expect(screen.getByRole("link", { name: th.auth.login.forgotPassword }).getAttribute("href")).toBe("/forgot-password");
    expect(screen.getByRole("link", { name: th.auth.login.signUp }).getAttribute("href")).toBe("/signup");
  });

  it("shows and hides the password", async () => {
    await openPage("/login");
    const password = screen.getByLabelText<HTMLInputElement>(th.auth.passwordLabel);

    act(() => screen.getByRole("button", { name: th.auth.showPasswordLabel }).click());
    expect(password.type).toBe("text");
    act(() => screen.getByRole("button", { name: th.auth.hidePasswordLabel }).click());
    expect(password.type).toBe("password");
  });

  it("signs in with email and password, then goes to the page in ?next=", async () => {
    answer("POST /api/auth/sign-in/email", {});
    const router = await openPage(`/login?next=${encodeURIComponent("/app/inbox")}`);
    signedInAs(testMe());

    logIn();

    await screen.findByRole("heading", { level: 1, name: th.pages.inbox.title });
    expect(router.state.location.pathname).toBe("/app/inbox");
    expect(await lastJsonSentTo("POST /api/auth/sign-in/email")).toEqual({
      email: "narin@example.com",
      password: "correct-horse-1",
    });
  });

  it("marks the password and shows the Thai text for a wrong password", async () => {
    answer("POST /api/auth/sign-in/email", apiError(401, "INVALID_CREDENTIALS"));
    await openPage("/login");

    logIn();

    expect((await findPageAlert()).textContent).toContain(th.errors.api.INVALID_CREDENTIALS);
    expect(screen.getByLabelText(th.auth.passwordLabel).getAttribute("aria-invalid")).toBe("true");
  });

  it.each([
    ["EMAIL_NOT_VERIFIED", 403],
    ["RATE_LIMITED", 429],
  ] as const)("shows the Thai text for %s", async (code, status) => {
    answer("POST /api/auth/sign-in/email", apiError(status, code));
    await openPage("/login");

    logIn();

    expect((await findPageAlert()).textContent).toContain(th.errors.api[code]);
  });

  it("starts LINE sign-in and comes back to ?next= afterwards", async () => {
    answer("POST /api/auth/sign-in/social", { url: "https://access.line.me/oauth2/v2.1/authorize?x=1", redirect: true });
    await openPage(`/login?next=${encodeURIComponent("/app/upcoming")}`);

    act(() => screen.getByRole("button", { name: th.auth.continueWithLine }).click());

    await vi.waitFor(() => expect(goToExternalPage).toHaveBeenCalledWith("https://access.line.me/oauth2/v2.1/authorize?x=1"));
    expect(await lastJsonSentTo("POST /api/auth/sign-in/social")).toEqual({
      provider: "line",
      callbackURL: "/app/upcoming",
      errorCallbackURL: "/login",
    });
  });

  it.each([
    ["access_denied", th.auth.lineErrors.cancelled],
    ["unable_to_get_user_info", th.auth.lineErrors.failed],
  ])("explains a LINE error that comes back as ?error=%s", async (error, message) => {
    await openPage(`/login?error=${error}`);

    expect(getPageAlert().textContent).toContain(message);
  });
});

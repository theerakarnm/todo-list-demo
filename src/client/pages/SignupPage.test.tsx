import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goToExternalPage } from "../auth/external-page";
import th from "../i18n/th.json";
import { answer, apiError, lastJsonSentTo, requestsTo, signedOut, TEST_TURNSTILE_SITE_KEY } from "../test/fake-api";
import { stubTurnstile } from "../test/fake-turnstile";
import { findPageAlert, openPage } from "../test/render-app";

vi.mock("../auth/external-page", () => ({ goToExternalPage: vi.fn() }));

let widget: ReturnType<typeof stubTurnstile>;

beforeEach(() => {
  signedOut();
  widget = stubTurnstile();
});

async function openSignupWithTurnstileSolved() {
  await openPage("/signup");
  await waitFor(() => expect(widget.siteKey).toBe(TEST_TURNSTILE_SITE_KEY));
  act(() => widget.solve("turnstile-token-1"));
}

function signUp(email = "narin@example.com", password = "correct-horse-1") {
  fireEvent.change(screen.getByLabelText(th.auth.emailLabel), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(th.auth.passwordLabel), { target: { value: password } });
  act(() => screen.getByRole("button", { name: th.auth.signup.submit }).click());
}

describe("Signup page", () => {
  it("has the mockup's copy, the LINE button and a link to Login", async () => {
    await openPage("/signup");

    expect(screen.getByRole("heading", { level: 1, name: th.pages.signup.title })).toBeTruthy();
    expect(screen.getByText(th.auth.signup.subtitle)).toBeTruthy();
    expect(screen.getByText(th.auth.passwordHint)).toBeTruthy();
    expect(screen.getByRole("button", { name: th.auth.continueWithLine })).toBeTruthy();
    expect(screen.getByRole("link", { name: th.auth.signup.logIn }).getAttribute("href")).toBe("/login");
  });

  it("waits for Turnstile before the account can be created", async () => {
    await openPage("/signup");

    expect(screen.getByRole<HTMLButtonElement>("button", { name: th.auth.signup.submit }).disabled).toBe(true);
  });

  it("sends the sign-up with the Turnstile token, then asks the user to check their email", async () => {
    answer("POST /api/auth/sign-up/email", {});
    await openSignupWithTurnstileSolved();

    signUp();

    expect(await screen.findByRole("heading", { name: th.auth.signup.checkEmailTitle })).toBeTruthy();
    expect(screen.getByText(/narin@example\.com/)).toBeTruthy();
    const [request] = requestsTo("POST /api/auth/sign-up/email");
    expect(request?.headers.get("x-turnstile-token")).toBe("turnstile-token-1");
    expect(request?.headers.get("x-timezone")).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(await lastJsonSentTo("POST /api/auth/sign-up/email")).toEqual({
      name: "",
      email: "narin@example.com",
      password: "correct-horse-1",
    });
  });

  it("says the email is taken, links to Login and resets Turnstile", async () => {
    answer("POST /api/auth/sign-up/email", apiError(409, "EMAIL_TAKEN"));
    await openSignupWithTurnstileSolved();

    signUp();

    const alert = await findPageAlert();
    expect(alert.textContent).toBe("อีเมลนี้ถูกใช้งานแล้ว · เข้าสู่ระบบแทน");
    expect(screen.getByRole("link", { name: "เข้าสู่ระบบแทน" }).getAttribute("href")).toBe("/login");
    expect(screen.getByLabelText(th.auth.emailLabel).getAttribute("aria-invalid")).toBe("true");
    expect(widget.turnstile.reset).toHaveBeenCalledWith("widget-1");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: th.auth.signup.submit }).disabled).toBe(true);
  });

  it("points a LINE account's email to LINE sign-in or forgot password", async () => {
    answer("POST /api/auth/sign-up/email", apiError(409, "EMAIL_TAKEN_LINE"));
    answer("POST /api/auth/sign-in/social", { url: "https://access.line.me/authorize" });
    await openSignupWithTurnstileSolved();

    signUp();

    await findPageAlert();
    expect(screen.getByRole("link", { name: "ลืมรหัสผ่าน" }).getAttribute("href")).toBe("/forgot-password");
    act(() => screen.getByRole("button", { name: "เข้าสู่ระบบด้วย LINE" }).click());
    await waitFor(() => expect(goToExternalPage).toHaveBeenCalledWith("https://access.line.me/authorize"));
  });

  it.each([
    ["RATE_LIMITED", 429],
    ["TURNSTILE_FAILED", 400],
  ] as const)("shows the Thai text for %s", async (code, status) => {
    answer("POST /api/auth/sign-up/email", apiError(status, code));
    await openSignupWithTurnstileSolved();

    signUp();

    expect((await findPageAlert()).textContent).toContain(th.errors.api[code]);
  });
});

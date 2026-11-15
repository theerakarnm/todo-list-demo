import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import th from "../i18n/th.json";
import { answer, apiError, lastJsonSentTo, requestsTo, signedOut, TEST_TURNSTILE_SITE_KEY } from "../test/fake-api";
import { stubTurnstile } from "../test/fake-turnstile";
import { findPageAlert, getPageAlert, openPage } from "../test/render-app";

let widget: ReturnType<typeof stubTurnstile>;

beforeEach(() => {
  signedOut();
  widget = stubTurnstile();
});

describe("Forgot password page", () => {
  async function requestResetLink(email: string) {
    await openPage("/forgot-password");
    await waitFor(() => expect(widget.siteKey).toBe(TEST_TURNSTILE_SITE_KEY));
    act(() => widget.solve("turnstile-token-1"));
    fireEvent.change(screen.getByLabelText(th.auth.emailLabel), { target: { value: email } });
    act(() => screen.getByRole("button", { name: th.auth.forgotPassword.submit }).click());
  }

  it("sends the reset request with the Turnstile token and says to check the inbox", async () => {
    answer("POST /api/auth/request-password-reset", { status: true });

    await requestResetLink("narin@example.com");

    expect(await screen.findByRole("heading", { name: th.auth.forgotPassword.sentTitle })).toBeTruthy();
    expect(screen.getByText(/narin@example\.com/)).toBeTruthy();
    expect(await lastJsonSentTo("POST /api/auth/request-password-reset")).toEqual({ email: "narin@example.com" });
    expect(requestsTo("POST /api/auth/request-password-reset")[0]?.headers.get("x-turnstile-token")).toBe(
      "turnstile-token-1",
    );
  });

  it("shows the rate-limit message and resets Turnstile", async () => {
    answer("POST /api/auth/request-password-reset", apiError(429, "RATE_LIMITED"));

    await requestResetLink("narin@example.com");

    expect((await findPageAlert()).textContent).toContain(th.errors.api.RATE_LIMITED);
    expect(widget.turnstile.reset).toHaveBeenCalled();
  });

  it("links back to Login", async () => {
    await openPage("/forgot-password");

    expect(screen.getByRole("link", { name: th.auth.backToLogin }).getAttribute("href")).toBe("/login");
  });
});

describe("Reset password page", () => {
  function setNewPassword(password = "new-horse-22") {
    fireEvent.change(screen.getByLabelText(th.auth.resetPassword.newPasswordLabel), { target: { value: password } });
    act(() => screen.getByRole("button", { name: th.auth.resetPassword.submit }).click());
  }

  it("saves the new password with the token from the link, then offers Login", async () => {
    answer("POST /api/auth/reset-password", { status: true });
    await openPage("/reset-password?token=abc123");

    setNewPassword();

    expect(await screen.findByRole("heading", { name: th.auth.resetPassword.doneTitle })).toBeTruthy();
    expect(screen.getByRole("link", { name: th.auth.resetPassword.logIn }).getAttribute("href")).toBe("/login");
    expect(await lastJsonSentTo("POST /api/auth/reset-password")).toEqual({ token: "abc123", newPassword: "new-horse-22" });
  });

  it("has a show/hide button for the new password", async () => {
    await openPage("/reset-password?token=abc123");

    act(() => screen.getByRole("button", { name: th.auth.showPasswordLabel }).click());

    expect(screen.getByLabelText<HTMLInputElement>(th.auth.resetPassword.newPasswordLabel).type).toBe("text");
  });

  it("explains an expired link and links to a new one", async () => {
    answer("POST /api/auth/reset-password", apiError(400, "INVALID_TOKEN"));
    await openPage("/reset-password?token=old");

    setNewPassword();

    expect((await findPageAlert()).textContent).toContain(th.errors.api.INVALID_TOKEN);
    expect(screen.getByRole("link", { name: th.auth.resetPassword.requestNewLink }).getAttribute("href")).toBe(
      "/forgot-password",
    );
  });

  it("asks for a new link when the address has no token", async () => {
    await openPage("/reset-password");

    expect(getPageAlert().textContent).toContain(th.auth.resetPassword.invalidLink);
    expect(screen.queryByLabelText(th.auth.resetPassword.newPasswordLabel)).toBeNull();
  });
});

describe("Verify email page", () => {
  it("confirms the email and continues into the app", async () => {
    await openPage("/verify-email");

    expect(screen.getByRole("heading", { name: th.auth.verifyEmail.doneTitle })).toBeTruthy();
    expect(screen.getByRole("link", { name: th.auth.verifyEmail.continue }).getAttribute("href")).toBe("/app");
  });

  it("explains an expired link and how to get a new one", async () => {
    await openPage("/verify-email?error=token_expired");

    expect(screen.getByRole("heading", { name: th.auth.verifyEmail.expiredTitle })).toBeTruthy();
    expect(screen.getByRole("link", { name: th.auth.verifyEmail.logIn }).getAttribute("href")).toBe("/login");
  });
});

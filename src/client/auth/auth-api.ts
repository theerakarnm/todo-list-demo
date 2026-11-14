import { readJson } from "../api/request-error";

/** Better Auth's routes are not part of the typed Hono client, so they are called directly. */
async function postAuth<T>(path: string, body: unknown, headers: HeadersInit = {}): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson(response) as Promise<T>;
}

export function signInWithEmail(email: string, password: string) {
  return postAuth("sign-in/email", { email, password });
}

/** The Turnstile token goes in this header (see src/worker/middleware/require-turnstile.ts). */
function turnstileHeader(token: string) {
  return { "x-turnstile-token": token };
}

/** Creates an unverified account and sends the verification email. The display name comes from the email; the browser's time zone goes along. */
export function signUpWithEmail(email: string, password: string, turnstileToken: string) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return postAuth("sign-up/email", { name: "", email, password }, { ...turnstileHeader(turnstileToken), "x-timezone": timezone });
}

/** Emails a reset link when an account has this email. Answers the same either way, so it reveals nothing. */
export function requestPasswordReset(email: string, turnstileToken: string) {
  return postAuth("request-password-reset", { email }, turnstileHeader(turnstileToken));
}

/** Sets a new password with the token from the reset email. */
export function resetPassword(token: string, newPassword: string) {
  return postAuth("reset-password", { token, newPassword });
}

/** Settings → Account. Other devices are signed out; this one stays signed in. */
export function changePassword(currentPassword: string, newPassword: string) {
  return postAuth("change-password", { currentPassword, newPassword, revokeOtherSessions: true });
}

/** Asks Better Auth where LINE's sign-in page is; LINE sends the user back to `callbackURL`. */
export function startLineSignIn(callbackURL: string) {
  return postAuth<{ url: string }>("sign-in/social", { provider: "line", callbackURL, errorCallbackURL: "/login" });
}

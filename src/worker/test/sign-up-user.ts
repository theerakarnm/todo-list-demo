import { type FakeInternet, PASSING_TURNSTILE_TOKEN } from "./fake-internet";
import { type TestBrowser, testBrowser } from "./test-browser";

export const TEST_PASSWORD = "correct-horse-1";

/** Headers for sign-up and forgot-password requests, which need a Turnstile token. */
export const PASSES_TURNSTILE = { "x-turnstile-token": PASSING_TURNSTILE_TOKEN };

export function newTestEmail(name = "user") {
  return `${name}-${crypto.randomUUID()}@example.com`;
}

/**
 * Signs up through the real routes, clicks the verification link and signs in.
 * Returns a browser that holds the session cookie.
 */
export async function signUpVerifiedUser(
  internet: FakeInternet,
  email = newTestEmail(),
  browser: TestBrowser = testBrowser(),
): Promise<TestBrowser> {
  await browser.postJson(
    "/api/auth/sign-up/email",
    { name: email.split("@")[0], email, password: TEST_PASSWORD },
    PASSES_TURNSTILE,
  );
  const link = new URL(internet.linkInLastEmailTo(email));
  await testBrowser().request(link.pathname + link.search);
  const signedIn = await browser.postJson("/api/auth/sign-in/email", { email, password: TEST_PASSWORD });
  if (!signedIn.ok) throw new Error(`Test sign-in failed: HTTP ${signedIn.status}`);
  return browser;
}

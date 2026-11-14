import type { FakeInternet } from "./fake-internet";
import { type TestBrowser, testBrowser } from "./test-browser";

export const TEST_PASSWORD = "correct-horse-1";

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
  await browser.postJson("/api/auth/sign-up/email", { name: email.split("@")[0], email, password: TEST_PASSWORD });
  const link = new URL(internet.linkInLastEmailTo(email));
  await testBrowser().request(link.pathname + link.search);
  const signedIn = await browser.postJson("/api/auth/sign-in/email", { email, password: TEST_PASSWORD });
  if (!signedIn.ok) throw new Error(`Test sign-in failed: HTTP ${signedIn.status}`);
  return browser;
}

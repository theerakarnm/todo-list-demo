import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { PASSES_TURNSTILE, TEST_PASSWORD, newTestEmail } from "../test/sign-up-user";
import { testBrowser } from "../test/test-browser";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function timezoneAfterSigningUp(timezoneHeader?: string) {
  const email = newTestEmail();
  const browser = testBrowser();
  const headers = timezoneHeader ? { ...PASSES_TURNSTILE, "x-timezone": timezoneHeader } : PASSES_TURNSTILE;
  await browser.postJson("/api/auth/sign-up/email", { name: "", email, password: TEST_PASSWORD }, headers);
  const link = new URL(internet.linkInLastEmailTo(email));
  await testBrowser().request(link.pathname + link.search);
  await browser.postJson("/api/auth/sign-in/email", { email, password: TEST_PASSWORD });
  const me = await (await browser.request("/api/me")).json<{ settings: { timezone: string } }>();
  return me.settings.timezone;
}

describe("the browser time zone at sign-up", () => {
  it("becomes the time zone of the first settings row", async () => {
    expect(await timezoneAfterSigningUp("Asia/Tokyo")).toBe("Asia/Tokyo");
  });

  it("is ignored when unknown, and Asia/Bangkok stays", async () => {
    expect(await timezoneAfterSigningUp("Mars/Olympus")).toBe("Asia/Bangkok");
  });

  it("falls back to Asia/Bangkok when it is not sent", async () => {
    expect(await timezoneAfterSigningUp()).toBe("Asia/Bangkok");
  });
});

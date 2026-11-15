import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { PASSES_TURNSTILE } from "../test/sign-up-user";
import { testBrowser } from "../test/test-browser";

const password = "correct-horse-1";

let internet: FakeInternet;
let email: string;

beforeEach(() => {
  internet = fakeInternet();
  // The database lives for the whole file, so every test signs up a new address.
  email = `somchai-${crypto.randomUUID()}@example.com`;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function signUp(browser = testBrowser()) {
  return browser.postJson("/api/auth/sign-up/email", { name: "somchai", email, password }, PASSES_TURNSTILE);
}

function signIn(browser = testBrowser(), withPassword = password) {
  return browser.postJson("/api/auth/sign-in/email", { email, password: withPassword });
}

/** Opens the link from the last email, as a click in the mail app would. */
function openEmailLink(browser = testBrowser()) {
  const link = new URL(internet.linkInLastEmailTo(email));
  return browser.request(link.pathname + link.search);
}

describe("email sign-up", () => {
  it("sends a Thai verification email that lands on /verify-email", async () => {
    expect((await signUp()).status).toBe(200);

    const sent = internet.sentEmails.at(-1);
    expect(sent?.to).toBe(email);
    expect(sent?.subject).toMatch(/[\u0E00-\u0E7F]/);
    const link = new URL(internet.linkInLastEmailTo(email));
    expect(link.pathname).toBe("/api/auth/verify-email");
    expect(link.searchParams.get("callbackURL")).toBe("/verify-email");
  });

  it("makes the verification link valid for 24 hours", async () => {
    await signUp();

    // The link's token is a signed JWT; its `exp` claim (seconds) is the expiry.
    const token = new URL(internet.linkInLastEmailTo(email)).searchParams.get("token") ?? "";
    const { exp } = JSON.parse(atob(token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "")) as { exp: number };
    const hoursAhead = (exp * 1000 - Date.now()) / 3_600_000;
    expect(hoursAhead).toBeGreaterThan(23.9);
    expect(hoursAhead).toBeLessThanOrEqual(24);
  });

  it("cannot sign in until the email is verified", async () => {
    await signUp();

    expect((await signIn()).status).toBe(403);

    const verified = await openEmailLink();
    expect(verified.status).toBe(302);
    expect(verified.headers.get("Location")).toBe("/verify-email");
    expect((await signIn()).status).toBe(200);
  });

  it("refuses a password shorter than 8 characters", async () => {
    const response = await testBrowser().postJson(
      "/api/auth/sign-up/email",
      { name: "short", email, password: "1234567" },
      PASSES_TURNSTILE,
    );

    expect(response.status).toBe(400);
  });
});

describe("the welcome email", () => {
  const welcomeEmails = () => internet.sentEmails.filter((sent) => sent.to === email && sent.subject === "ยินดีต้อนรับสู่ JotList");

  it("is sent once after verification, which still redirects and signs the user in", async () => {
    await signUp();
    const browser = testBrowser();

    const verified = await openEmailLink(browser);

    expect(verified.status).toBe(302);
    expect(verified.headers.get("Location")).toBe("/verify-email");
    expect(welcomeEmails()).toHaveLength(1);
    expect(welcomeEmails()[0]?.html).toContain("https://jotlist.test/today");
    const session = await (await browser.request("/api/auth/get-session")).json<{ user: { email: string } }>();
    expect(session.user.email).toBe(email);
  });

  it("is not sent again when the link is opened again or the user signs in", async () => {
    await signUp();
    await openEmailLink();

    await openEmailLink();
    await signIn();

    expect(welcomeEmails()).toHaveLength(1);
  });

  it("never breaks verification when the welcome email cannot be sent", async () => {
    await signUp();
    internet.on("https://api.resend.com/emails", () => Response.json({ message: "down" }, { status: 500 }));
    const logs = vi.spyOn(console, "error").mockImplementation(() => {});
    const browser = testBrowser();

    const verified = await openEmailLink(browser);

    expect(verified.status).toBe(302);
    expect(verified.headers.get("Location")).toBe("/verify-email");
    expect((await signIn()).status).toBe(200);
    const logged = logs.mock.calls.map((call) => String(call[0]));
    expect(logged.some((line) => line.includes("welcome_email.failed"))).toBe(true);
    expect(logged.join("")).not.toContain(email);
    logs.mockRestore();
  });
});

describe("the session cookie", () => {
  it("is HttpOnly, Secure and SameSite=Lax, and keeps the user signed in", async () => {
    await signUp();
    await openEmailLink();
    const browser = testBrowser();

    const response = await signIn(browser);

    const sessionCookie = response.headers.getSetCookie().find((cookie) => cookie.includes("session_token="));
    expect(sessionCookie).toMatch(/; HttpOnly/i);
    expect(sessionCookie).toMatch(/; Secure/i);
    expect(sessionCookie).toMatch(/; SameSite=Lax/i);
    const session = await (await browser.request("/api/auth/get-session")).json<{ user: { email: string } }>();
    expect(session.user.email).toBe(email);
  });
});

import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newTestEmail, PASSES_TURNSTILE, signUpVerifiedUser, TEST_PASSWORD } from "../test/sign-up-user";
import { testBrowser } from "../test/test-browser";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function signUp(email: string) {
  return testBrowser().postJson(
    "/api/auth/sign-up/email",
    { name: "someone", email, password: TEST_PASSWORD },
    PASSES_TURNSTILE,
  );
}

function signIn(email: string, password: string) {
  return testBrowser().postJson("/api/auth/sign-in/email", { email, password });
}

/** A user who only ever signed in with LINE: no password. */
async function seedLineOnlyUser(email: string) {
  const userId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO user (id, name, email, email_verified) VALUES (?, 'LINE user', ?, 1)").bind(userId, email),
    env.DB.prepare(
      "INSERT INTO account (id, account_id, provider_id, user_id) VALUES (?, ?, 'line', ?)",
    ).bind(crypto.randomUUID(), `U${userId}`, userId),
  ]);
}

const thai = expect.stringMatching(/[\u0E00-\u0E7F]/);

describe("sign-up with an email that is already used", () => {
  it("answers 409 EMAIL_TAKEN for an email and password account", async () => {
    const email = newTestEmail();
    await signUpVerifiedUser(internet, email);

    const response = await signUp(email);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: { code: "EMAIL_TAKEN", message: "อีเมลนี้ถูกใช้งานแล้ว · เข้าสู่ระบบแทน" },
    });
  });

  it("answers 409 EMAIL_TAKEN for a sign-up that is not verified yet, and sends no second email", async () => {
    const email = newTestEmail();
    await signUp(email);

    const response = await signUp(email);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: "EMAIL_TAKEN" } });
    expect(internet.sentEmails).toHaveLength(1);
  });

  it("answers 409 EMAIL_TAKEN_LINE with the LINE and forgot-password hint for a LINE-only account", async () => {
    const email = newTestEmail();
    await seedLineOnlyUser(email);

    const response = await signUp(email);

    expect(response.status).toBe(409);
    const body = await response.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("EMAIL_TAKEN_LINE");
    expect(body.error.message).toContain("LINE");
    expect(body.error.message).toContain("ลืมรหัสผ่าน");
  });

  it("matches the email in any letter case", async () => {
    const email = newTestEmail();
    await signUpVerifiedUser(internet, email);

    const response = await signUp(email.toUpperCase());

    expect(await response.json()).toMatchObject({ error: { code: "EMAIL_TAKEN" } });
  });
});

describe("sign-in errors", () => {
  it("answers 401 INVALID_CREDENTIALS in Thai for a wrong password", async () => {
    const email = newTestEmail();
    await signUpVerifiedUser(internet, email);

    const response = await signIn(email, "wrong-password-9");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { code: "INVALID_CREDENTIALS", message: thai } });
  });

  it("answers 401 INVALID_CREDENTIALS for an unknown email", async () => {
    const response = await signIn(newTestEmail(), TEST_PASSWORD);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: { code: "INVALID_CREDENTIALS" } });
  });

  it("answers 403 EMAIL_NOT_VERIFIED in Thai before the email is verified", async () => {
    const email = newTestEmail();
    await signUp(email);

    const response = await signIn(email, TEST_PASSWORD);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: { code: "EMAIL_NOT_VERIFIED", message: thai } });
  });

  it("sends the verification email again when an unverified user signs in", async () => {
    const email = newTestEmail();
    await signUp(email);

    await signIn(email, TEST_PASSWORD);

    expect(internet.sentEmails.filter((sent) => sent.to === email)).toHaveLength(2);
    const link = new URL(internet.linkInLastEmailTo(email));
    expect(link.searchParams.get("callbackURL")).toBe("/verify-email");
  });

  it("answers 400 VALIDATION_ERROR in Thai for a malformed email", async () => {
    const response = await signIn("not-an-email", TEST_PASSWORD);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "VALIDATION_ERROR", message: thai } });
  });
});

describe("password reset errors", () => {
  it("answers 400 INVALID_TOKEN in Thai for an unknown token", async () => {
    const response = await testBrowser().postJson("/api/auth/reset-password", {
      token: "made-up-token",
      newPassword: "new-password-1",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "INVALID_TOKEN", message: thai } });
  });
});

import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../app";
import { handleError } from "../errors";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { newTestEmail, signUpVerifiedUser } from "../test/sign-up-user";
import { testBrowser } from "../test/test-browser";
import type { AppEnv } from "../types";
import { requireSession } from "./require-session";

// The real app plus one throwaway route behind the middleware.
const appWithTestRoute = new Hono<AppEnv>()
  .route("/", app)
  .get("/api/test/who-am-i", requireSession, (c) =>
    c.json({ userId: c.var.user.id, email: c.var.user.email, sessionUserId: c.var.session.userId }),
  );
appWithTestRoute.onError(handleError);

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requireSession", () => {
  it("answers 401 UNAUTHORIZED in Thai without a session", async () => {
    const response = await testBrowser({ target: appWithTestRoute }).request("/api/test/who-am-i");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: expect.stringMatching(/[\u0E00-\u0E7F]/) },
    });
  });

  it("puts the signed-in user and session on the context", async () => {
    const email = newTestEmail();
    const browser = await signUpVerifiedUser(internet, email, testBrowser({ target: appWithTestRoute }));

    const response = await browser.request("/api/test/who-am-i");
    const body = await response.json<{ userId: string; email: string; sessionUserId: string }>();

    expect(body.email).toBe(email);
    expect(body.sessionUserId).toBe(body.userId);
  });
});

import { env } from "cloudflare:test";
import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { handleError } from "../errors";
import { createTestUser } from "../test/users";
import type { AppEnv } from "../types";
import { currentUser, DEV_USER_ID } from "./current-user";

function whoAmIApp() {
  const app = new Hono<AppEnv>().use(currentUser).get("/api/me", (c) => c.json({ userId: c.get("userId") }));
  app.onError(handleError);
  return app;
}

function whoAmI(headers: Record<string, string> = {}, appEnv = "development") {
  return whoAmIApp().request("/api/me", { headers }, { ...env, APP_ENV: appEnv });
}

afterEach(() => vi.restoreAllMocks());

describe("currentUser in development", () => {
  it("uses the dev user and creates it with Bangkok settings on first use", async () => {
    const response = await whoAmI();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: DEV_USER_ID });
    const settings = await env.DB.prepare("SELECT timezone FROM user_settings WHERE user_id = ?")
      .bind(DEV_USER_ID)
      .first<{ timezone: string }>();
    expect(settings?.timezone).toBe("Asia/Bangkok");
  });

  it("lets a test pick another existing user with x-dev-user-id", async () => {
    const userId = await createTestUser();

    const response = await whoAmI({ "x-dev-user-id": userId });

    expect(await response.json()).toEqual({ userId });
  });

  it("answers 401 when x-dev-user-id names nobody", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await whoAmI({ "x-dev-user-id": "nobody" });

    expect(response.status).toBe(401);
  });
});

describe("currentUser outside development", () => {
  it("answers 401 UNAUTHORIZED, even with x-dev-user-id", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const userId = await createTestUser();

    const response = await whoAmI({ "x-dev-user-id": userId }, "production");

    expect(response.status).toBe(401);
    const body = await response.json<{ error: { code: string } }>();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

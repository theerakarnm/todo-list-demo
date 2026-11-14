import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { updateSettingsSchema } from "../shared/schemas/settings";
import { handleError } from "./errors";
import type { AppEnv } from "./types";
import { validate } from "./validate";

const THAI_VALIDATION_MESSAGE = "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";

function settingsApp() {
  const app = new Hono<AppEnv>().patch("/api/settings", validate("json", updateSettingsSchema), (c) =>
    c.json(c.req.valid("json")),
  );
  app.onError(handleError);
  return app;
}

function patchSettings(body: string) {
  return settingsApp().request("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

afterEach(() => vi.restoreAllMocks());

describe("validate", () => {
  it("passes the parsed body to the route", async () => {
    const response = await patchSettings(JSON.stringify({ displayName: "  สมชาย  ", timezone: "Asia/Bangkok" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ displayName: "สมชาย", timezone: "Asia/Bangkok" });
  });

  it("answers an unknown time zone with VALIDATION_ERROR in Thai, not Zod's English message", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await patchSettings(JSON.stringify({ timezone: "Mars/Olympus_Mons" }));

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ error: { code: "VALIDATION_ERROR", message: THAI_VALIDATION_MESSAGE } });
    expect(text).not.toContain("Unknown time zone");
  });

  it("answers a malformed JSON body with VALIDATION_ERROR too", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await patchSettings("{not json");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "VALIDATION_ERROR", message: THAI_VALIDATION_MESSAGE } });
  });
});

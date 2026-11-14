import { env } from "cloudflare:test";
import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";
import { app } from "../app";

describe("GET /api/health", () => {
  it("reports ok, the app version and a working database", async () => {
    const response = await exports.default.fetch("https://jotlist.test/api/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, version: packageJson.version, db: "ok" });
  });

  it("answers 503 with db error when D1 fails", async () => {
    const brokenDb = {
      prepare() {
        throw new Error("D1 is down");
      },
    } as unknown as D1Database;

    const response = await app.request("/api/health", {}, { ...env, DB: brokenDb });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, version: packageJson.version, db: "error" });
  });
});

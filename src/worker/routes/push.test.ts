import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiAs, bodyOf } from "../test/api";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { createTestUser } from "../test/users";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function subscriptionOwner(endpoint: string) {
  return env.DB.prepare("SELECT user_id FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).first("user_id");
}

describe("GET /api/push/public-key", () => {
  it("returns the VAPID public key, never the private one", async () => {
    const userId = await createTestUser();

    const response = await apiAs(userId).get("/api/push/public-key");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ publicKey: env.VAPID_PUBLIC_KEY });
  });
});

describe("POST /api/push/subscribe", () => {
  it("saves this browser's subscription for the user", async () => {
    const userId = await createTestUser();
    const subscription = await internet.push.subscribe();

    const response = await apiAs(userId).post("/api/push/subscribe", subscription);

    expect(response.status).toBe(204);
    expect(await subscriptionOwner(subscription.endpoint)).toBe(userId);
  });

  it("keeps one row per endpoint when the same browser subscribes again", async () => {
    const userId = await createTestUser();
    const subscription = await internet.push.subscribe();

    await apiAs(userId).post("/api/push/subscribe", subscription);
    const again = await apiAs(userId).post("/api/push/subscribe", subscription);

    expect(again.status).toBe(204);
    const count = await env.DB.prepare("SELECT count(*) AS n FROM push_subscriptions WHERE endpoint = ?")
      .bind(subscription.endpoint)
      .first("n");
    expect(count).toBe(1);
  });

  it("moves the endpoint to the user who signed in last on that browser", async () => {
    const first = await createTestUser();
    const second = await createTestUser();
    const subscription = await internet.push.subscribe();
    await apiAs(first).post("/api/push/subscribe", subscription);

    await apiAs(second).post("/api/push/subscribe", subscription);

    expect(await subscriptionOwner(subscription.endpoint)).toBe(second);
  });

  it.each([
    ["an http endpoint", { endpoint: "http://push.test/send/1" }],
    ["a missing auth key", { keys: { p256dh: "BA" } }],
    ["a p256dh that is not a P-256 point", { keys: { p256dh: "not-a-key", auth: "AAAAAAAAAAAAAAAAAAAAAA" } }],
  ])("answers 400 VALIDATION_ERROR for %s", async (_name, overrides) => {
    const userId = await createTestUser();
    const subscription = { ...(await internet.push.subscribe()), ...overrides };

    const response = await apiAs(userId).post("/api/push/subscribe", subscription);

    expect(response.status).toBe(400);
    expect((await bodyOf<{ error: { code: string } }>(response)).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/push/subscribe", () => {
  it("removes the caller's subscription for that endpoint", async () => {
    const userId = await createTestUser();
    const subscription = await internet.push.subscribe();
    await apiAs(userId).post("/api/push/subscribe", subscription);

    const response = await apiAs(userId).delete("/api/push/subscribe", { endpoint: subscription.endpoint });

    expect(response.status).toBe(204);
    expect(await subscriptionOwner(subscription.endpoint)).toBeNull();
  });

  it("leaves another user's subscription alone", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const subscription = await internet.push.subscribe();
    await apiAs(owner).post("/api/push/subscribe", subscription);

    const response = await apiAs(intruder).delete("/api/push/subscribe", { endpoint: subscription.endpoint });

    expect(response.status).toBe(204);
    expect(await subscriptionOwner(subscription.endpoint)).toBe(owner);
  });
});

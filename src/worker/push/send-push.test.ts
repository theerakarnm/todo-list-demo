import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type FakeInternet, fakeInternet } from "../test/fake-internet";
import { sendPush } from "./send-push";
import { vapidFrom } from "./vapid";

let internet: FakeInternet;

beforeEach(() => {
  internet = fakeInternet();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const vapid = () => {
  const settings = vapidFrom(env);
  if (!settings) throw new Error("The test VAPID keys are missing from vitest.config.ts");
  return settings;
};

async function browserSubscription() {
  const { endpoint, keys } = await internet.push.subscribe();
  return { endpoint, ...keys };
}

describe("sendPush", () => {
  it("delivers the payload so the browser can decrypt it", async () => {
    const subscription = await browserSubscription();
    const payload = { title: "โทรนัดช่างแอร์", body: "กล่องรับงาน", url: "/task/1", tag: "task-1" };

    const result = await sendPush(subscription, JSON.stringify(payload), vapid());

    expect(result).toEqual({ status: 201 });
    expect(internet.push.payloadsTo(subscription.endpoint)).toEqual([payload]);
  });

  it("sends the VAPID, encoding, TTL and urgency headers", async () => {
    const subscription = await browserSubscription();

    await sendPush(subscription, "{}", vapid());

    const headers = internet.push.received[0]?.headers;
    expect(headers?.get("Authorization")).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
    expect(headers?.get("Content-Encoding")).toBe("aes128gcm");
    expect(Number(headers?.get("TTL"))).toBeGreaterThan(0);
    expect(headers?.get("Urgency")).toBe("high");
  });

  it("returns the push service's error status instead of throwing", async () => {
    const subscription = await browserSubscription();
    internet.push.answer(subscription.endpoint, 410);

    const result = await sendPush(subscription, "{}", vapid());

    expect(result).toEqual({ status: 410 });
  });
});

import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { fromBase64Url } from "./base64url";
import { importP256PublicKey } from "./keys";
import { vapidAuthorization, vapidFrom } from "./vapid";

const NOW = Date.UTC(2026, 10, 14, 1, 0);
const ENDPOINT = "https://push.example.net/push/JzLQ3raZJfFBR0aqvOMsLrt54w4rJUsV";

function decodeJson(part: string) {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(part)));
}

async function authorizationParts() {
  const vapid = vapidFrom(env);
  if (!vapid) throw new Error("The test VAPID keys are missing from vitest.config.ts");
  const header = await vapidAuthorization(ENDPOINT, vapid, NOW);
  const match = header.match(/^vapid t=([\w-]+\.[\w-]+\.[\w-]+), k=([\w-]+)$/);
  if (!match) throw new Error(`Not a VAPID Authorization header: ${header}`);
  const [, jwt = "", publicKey = ""] = match;
  return { jwt, publicKey };
}

describe("vapidAuthorization", () => {
  it("sends the VAPID public key as k", async () => {
    const { publicKey } = await authorizationParts();

    expect(publicKey).toBe(env.VAPID_PUBLIC_KEY);
  });

  it("signs an ES256 JWT for the push service origin, valid for at most 12 hours", async () => {
    const { jwt } = await authorizationParts();
    const [header = "", claims = ""] = jwt.split(".");

    expect(decodeJson(header)).toEqual({ typ: "JWT", alg: "ES256" });
    const { aud, exp, sub } = decodeJson(claims);
    expect(aud).toBe("https://push.example.net");
    expect(sub).toBe("mailto:test@jotlist.test");
    expect(exp).toBeGreaterThan(NOW / 1000);
    expect(exp).toBeLessThanOrEqual(NOW / 1000 + 12 * 60 * 60);
  });

  it("makes a signature the VAPID public key verifies", async () => {
    const { jwt, publicKey } = await authorizationParts();
    const [header, claims, signature = ""] = jwt.split(".");
    const key = await importP256PublicKey(publicKey, "ECDSA");

    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(`${header}.${claims}`),
    );

    expect(valid).toBe(true);
  });
});

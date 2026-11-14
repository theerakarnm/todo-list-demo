import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

function stubSiteverify(answer: object) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => Response.json(answer));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("verifyTurnstile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the secret, token and client IP to siteverify", async () => {
    const fetchMock = stubSiteverify({ success: true });

    await verifyTurnstile("secret-key", "token-1", "203.0.113.7");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init?.method).toBe("POST");
    const form = init?.body as FormData;
    expect(form.get("secret")).toBe("secret-key");
    expect(form.get("response")).toBe("token-1");
    expect(form.get("remoteip")).toBe("203.0.113.7");
  });

  it("is true when Cloudflare says success", async () => {
    stubSiteverify({ success: true });

    expect(await verifyTurnstile("secret-key", "token-1", null)).toBe(true);
  });

  it("is false when Cloudflare rejects the token", async () => {
    stubSiteverify({ success: false, "error-codes": ["invalid-input-response"] });

    expect(await verifyTurnstile("secret-key", "token-1", null)).toBe(false);
  });
});

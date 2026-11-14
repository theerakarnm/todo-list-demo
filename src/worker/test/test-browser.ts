import { env } from "cloudflare:test";
import { app } from "../app";

export const TEST_ORIGIN = "https://jotlist.test";

/** The test env with a fake Resend key, so auth emails go to the fake internet (see fake-internet.ts). */
export const testEnv: Env = { ...env, RESEND_API_KEY: "re_fake_test_key" };

type TestBrowserOptions = {
  bindings?: Env;
  /** The Hono app to call. A test can pass an app with extra routes. */
  target?: { request(url: string, init: RequestInit, env: Env): Response | Promise<Response> };
};

/** A stand-in for one browser: it calls the app and keeps the cookies it is given. */
export function testBrowser({ bindings = testEnv, target = app }: TestBrowserOptions = {}) {
  const cookies = new Map<string, string>();

  function rememberCookies(response: Response) {
    for (const setCookie of response.headers.getSetCookie()) {
      const [pair = ""] = setCookie.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      if (value === "" || /max-age=0/i.test(setCookie)) cookies.delete(name);
      else cookies.set(name, value);
    }
  }

  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Origin", TEST_ORIGIN);
    if (cookies.size > 0) {
      headers.set("Cookie", [...cookies].map(([name, value]) => `${name}=${value}`).join("; "));
    }
    const response = await target.request(new URL(path, TEST_ORIGIN).href, { ...init, headers }, bindings);
    rememberCookies(response);
    return response;
  }

  function sendJson(method: string, path: string, body: unknown, headers: HeadersInit = {}) {
    return request(path, {
      method,
      headers: { ...Object.fromEntries(new Headers(headers)), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return {
    cookies,
    request,
    sendJson,
    postJson: (path: string, body: unknown, headers?: HeadersInit) => sendJson("POST", path, body, headers),
  };
}

export type TestBrowser = ReturnType<typeof testBrowser>;

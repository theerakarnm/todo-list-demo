import { vi } from "vitest";
import type { Me } from "../auth/use-me";
import type { ErrorCode } from "../../shared/error-codes";

type Route = `${"GET" | "POST" | "PATCH" | "DELETE"} /api/${string}`;
type Reply = { status?: number; body?: unknown };

const replies = new Map<string, Reply>();
const sent: { route: string; request: Request }[] = [];

export const TEST_TURNSTILE_SITE_KEY = "test-site-key";

/** A signed-in, onboarded email user, as `GET /api/me` returns it. */
export function testMe({ user, settings }: { user?: Partial<Me["user"]>; settings?: Partial<Me["settings"]> } = {}): Me {
  return {
    user: {
      id: "user-1",
      name: "narin",
      email: "narin@example.com",
      image: null,
      hasPassword: true,
      hasLine: false,
      ...user,
    },
    settings: {
      displayName: "นรินทร์ ก.",
      avatarKey: null,
      timezone: "Asia/Bangkok",
      theme: "system",
      startPage: "today",
      weekStart: "mon",
      digestEnabled: false,
      digestTime: "08:00",
      onboardedAt: 1_700_000_000_000,
      ...settings,
    },
  };
}

/** The API's error shape. The message stands in for the server's Thai text. */
export function apiError(status: number, code: ErrorCode, message = `ข้อความ ${code}`): Reply {
  return { status, body: { error: { code, message } } };
}

/** Sets what the fake server answers for one route, e.g. `answer("POST /api/auth/sign-in/email", { body: {} })`. */
export function answer(route: Route, reply: Reply) {
  replies.set(route, reply);
}

export function signedInAs(me: Me) {
  answer("GET /api/me", { body: me });
}

export function signedOut() {
  answer("GET /api/me", apiError(401, "UNAUTHORIZED"));
}

/** Every request the app sent to this route, oldest first. */
export function requestsTo(route: Route) {
  return sent.filter((entry) => entry.route === route).map((entry) => entry.request);
}

export async function lastJsonSentTo(route: Route) {
  const request = requestsTo(route).at(-1);
  if (!request) throw new Error(`No request was sent to ${route}`);
  return request.clone().json();
}

/**
 * Replaces `fetch` with a fake API server. Runs before every client test (test/setup.ts):
 * by default the user is signed in and onboarded.
 */
export function installFakeApi() {
  replies.clear();
  sent.length = 0;
  signedInAs(testMe());
  answer("GET /api/config", { body: { turnstileSiteKey: TEST_TURNSTILE_SITE_KEY } });

  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(new URL(input instanceof Request ? input.url : input, "http://localhost"), init);
    const route = `${request.method} ${new URL(request.url).pathname}`;
    sent.push({ route, request: request.clone() });
    const reply = replies.get(route) ?? apiError(404, "NOT_FOUND");
    const body = reply.body === undefined ? null : JSON.stringify(reply.body);
    return new Response(body, { status: reply.status ?? 200, headers: { "Content-Type": "application/json" } });
  });
}

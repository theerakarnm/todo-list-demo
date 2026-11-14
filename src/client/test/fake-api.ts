import { vi } from "vitest";
import type { ErrorCode } from "../../shared/error-codes";
import type { Me } from "../auth/use-me";

type Method = "GET" | "PUT" | "POST" | "PATCH" | "DELETE";
/** A route such as "PATCH /api/tasks/:id"; `:name` matches one path segment. */
type Route = `${Method} /api/${string}`;
type Params = Record<string, string>;
/** Answers with a Response, or with any other value as a 200 JSON body. */
type Handler = (request: Request, params: Params) => unknown;
/** A handler, a Response (each request gets a copy) or a JSON body for 200. */
type Answer = Handler | Response | object;

/** A recorded request, with its parsed JSON body. */
export type ApiCall = { method: string; path: string; search: URLSearchParams; body: unknown; request: Request };

const handlers = new Map<Route, Handler>();
const calls: ApiCall[] = [];

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

/** An answer in the API's error shape. The message stands in for the server's Thai text. */
export function apiError(status: number, code: ErrorCode, message = `ข้อความ ${code}`) {
  return Response.json({ error: { code, message } }, { status });
}

function toHandler(reply: Answer): Handler {
  if (typeof reply === "function") return reply as Handler;
  if (reply instanceof Response) return () => reply.clone();
  return () => reply;
}

/** Sets what the fake server answers for one route, e.g. `answer("POST /api/auth/sign-in/email", {})`. */
export function answer(route: Route, reply: Answer) {
  handlers.set(route, toHandler(reply));
}

/** Answers several routes at once and returns the log of every request the app sends. */
export function stubApi(routes: Partial<Record<Route, Answer>>) {
  for (const [route, reply] of Object.entries(routes)) answer(route as Route, reply as Answer);
  return calls;
}

/** The route answers only when the test calls `reply(...)`, so it can look at the screen while the request is in flight. */
export function answerLater(route: Route) {
  let reply: (value: Response | object) => void = () => {};
  const answered = new Promise<Response | object>((resolve) => (reply = resolve));
  answer(route, () => answered);
  return { reply };
}

/** A handler for PUT create routes: answers with the sent row, as the server stores it. */
export async function echoCreatedRow(request: Request, params: Params) {
  return { completedAt: null, createdAt: 1, updatedAt: 1, deletedAt: null, ...(await request.json()), id: params.id };
}

export function signedInAs(me: Me) {
  answer("GET /api/me", me);
}

export function signedOut() {
  answer("GET /api/me", apiError(401, "UNAUTHORIZED"));
}

/** Every request the app sent to this route, oldest first. */
export function requestsTo(route: Route) {
  return calls.filter((call) => `${call.method} ${call.path}` === route).map((call) => call.request);
}

/** The JSON body of the last request to this route; waits for the request if it has not been sent yet. */
export async function lastJsonSentTo(route: Route) {
  const request = await vi.waitFor(() => {
    const last = requestsTo(route).at(-1);
    if (!last) throw new Error(`No request was sent to ${route}`);
    return last;
  });
  return request.clone().json();
}

function matchRoute(route: Route, method: string, path: string): Params | null {
  const [routeMethod, routePath = ""] = route.split(" ");
  if (routeMethod !== method) return null;
  const names: string[] = [];
  const pattern = routePath.replace(/:(\w+)/g, (_, name: string) => {
    names.push(name);
    return "([^/]+)";
  });
  const match = path.match(new RegExp(`^${pattern}$`));
  if (!match) return null;
  return Object.fromEntries(names.map((name, index) => [name, match[index + 1] ?? ""]));
}

async function respond(request: Request) {
  const { pathname } = new URL(request.url);
  for (const [route, handler] of handlers) {
    const params = matchRoute(route, request.method, pathname);
    if (!params) continue;
    const result = await handler(request, params);
    if (result instanceof Response) return result;
    return result === undefined ? new Response(null) : Response.json(result);
  }
  return apiError(404, "NOT_FOUND");
}

/**
 * Replaces `fetch` with a fake API server. Runs before every client test (test/setup.ts):
 * by default the user is signed in and onboarded; other routes answer 404 until a test sets them.
 */
export function installFakeApi() {
  handlers.clear();
  calls.length = 0;
  signedInAs(testMe());
  answer("GET /api/config", { turnstileSiteKey: TEST_TURNSTILE_SITE_KEY });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(new URL(input instanceof Request ? input.url : input, "http://localhost"), init);
      const url = new URL(request.url);
      const text = await request.clone().text();
      calls.push({
        method: request.method,
        path: url.pathname,
        search: url.searchParams,
        body: text ? JSON.parse(text) : undefined,
        request: request.clone(),
      });
      return respond(request);
    }),
  );
}

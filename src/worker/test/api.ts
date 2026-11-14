import { exports } from "cloudflare:workers";
import { sessionCookieOf } from "./users";

type Method = "GET" | "PUT" | "PATCH" | "DELETE" | "POST";

/** Calls the real Worker as `userId`, with the session cookie createTestUser made for them. */
export function apiAs(userId: string) {
  const send = (method: Method, path: string, body?: unknown) =>
    exports.default.fetch(`https://jotlist.test${path}`, {
      method,
      headers: { Cookie: sessionCookieOf(userId), "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  return {
    get: (path: string) => send("GET", path),
    put: (path: string, body: unknown) => send("PUT", path, body),
    patch: (path: string, body: unknown) => send("PATCH", path, body),
    delete: (path: string, body?: unknown) => send("DELETE", path, body),
    post: (path: string, body?: unknown) => send("POST", path, body),
  };
}

/** Reads a JSON response body as T. */
export function bodyOf<T>(response: Response) {
  return response.json<T>();
}

import { vi } from "vitest";
import type { ErrorCode } from "../../shared/error-codes";

type Handler = (request: Request, params: Record<string, string>) => unknown;

/** A recorded call, with its parsed JSON body. */
export type ApiCall = { method: string; path: string; search: URLSearchParams; body: unknown };

function matchRoute(pattern: string, method: string, path: string) {
  const [patternMethod, patternPath = ""] = pattern.split(" ");
  if (patternMethod !== method) return null;
  const names: string[] = [];
  const regex = new RegExp(
    `^${patternPath.replace(/:(\w+)/g, (_, name: string) => {
      names.push(name);
      return "([^/]+)";
    })}$`,
  );
  const match = path.match(regex);
  if (!match) return null;
  return Object.fromEntries(names.map((name, index) => [name, match[index + 1] ?? ""]));
}

/**
 * Replaces fetch with a fake API for component tests. Routes look like
 * "PATCH /api/tasks/:id"; a handler returns a JSON body or a Response.
 * Unknown routes answer 404. Returns the list of calls made.
 */
export function stubApi(routes: Record<string, Handler>) {
  const calls: ApiCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(new URL(String(input), "http://localhost"), init);
      const url = new URL(request.url);
      const text = await request.clone().text();
      calls.push({ method: request.method, path: url.pathname, search: url.searchParams, body: text ? JSON.parse(text) : undefined });

      for (const [pattern, handler] of Object.entries(routes)) {
        const params = matchRoute(pattern, request.method, url.pathname);
        if (!params) continue;
        const result = await handler(request, params);
        return result instanceof Response ? result : Response.json(result);
      }
      return apiError("NOT_FOUND", 404);
    }),
  );
  return calls;
}

/** An answer in the API's error shape. */
export function apiError(code: ErrorCode, status: number) {
  return Response.json({ error: { code, message: code } }, { status });
}

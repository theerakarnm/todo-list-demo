import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, handleError, handleNotFound } from "./errors";
import { requestId } from "./middleware/request-id";
import type { AppEnv } from "./types";

function appThatThrows(error: unknown) {
  const app = new Hono<AppEnv>().use(requestId);
  app.get("/api/boom", () => {
    throw error;
  });
  app.notFound(handleNotFound);
  app.onError(handleError);
  return app;
}

afterEach(() => vi.restoreAllMocks());

describe("error middleware", () => {
  it("turns an ApiError into its status and the shared error shape", async () => {
    const response = await appThatThrows(new ApiError("TASK_LIMIT")).request("/api/boom");

    expect(response.status).toBe(409);
    const body = await response.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("TASK_LIMIT");
    expect(body.error.message).toContain("1,000");
  });

  it("hides unexpected errors behind INTERNAL_ERROR", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await appThatThrows(new Error("secret detail")).request("/api/boom");

    expect(response.status).toBe(500);
    const body = await response.json<{ error: { code: string; message: string } }>();
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("secret detail");
  });

  it("logs one structured line with the request id and no personal data", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await appThatThrows(new Error("user@example.com")).request(
      "/api/boom?q=private-search",
      { method: "GET" },
    );

    expect(log).toHaveBeenCalledTimes(1);
    const line = String(log.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toEqual({
      level: "error",
      requestId: response.headers.get("X-Request-Id"),
      code: "INTERNAL_ERROR",
      path: "/api/boom",
      method: "GET",
      status: 500,
    });
    expect(line).not.toContain("user@example.com");
    expect(line).not.toContain("private-search");
  });
});

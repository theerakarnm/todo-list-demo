import { env } from "cloudflare:test";
import { exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiAs, bodyOf } from "../test/api";
import { attachmentForm, createTask, pngFile } from "../test/images";
import { createTestUser, sessionCookieOf } from "../test/users";

function getFile(path: string, userId?: string, headers: Record<string, string> = {}) {
  const cookie: Record<string, string> = userId ? { Cookie: sessionCookieOf(userId) } : {};
  return exports.default.fetch(`https://jotlist.test/api/files/${path}`, { headers: { ...cookie, ...headers } });
}

async function uploadedKey(userId: string) {
  const response = await apiAs(userId).postForm(`/api/tasks/${await createTask(userId)}/attachments`, attachmentForm(pngFile(200)));
  expect(response.status).toBe(201);
  return (await bodyOf<{ r2Key: string }>(response)).r2Key;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("GET /api/files/:key", () => {
  it("streams the owner's image with its type, a private cache header and an ETag", async () => {
    const userId = await createTestUser();
    const key = await uploadedKey(userId);

    const response = await getFile(key, userId);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=3600");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("ETag")).toBe((await env.FILES.head(key))?.httpEtag);
    expect((await response.arrayBuffer()).byteLength).toBe(200);
  });

  it("also accepts the key URL-encoded as one path segment", async () => {
    const userId = await createTestUser();
    const key = await uploadedKey(userId);

    const response = await getFile(encodeURIComponent(key), userId);

    expect(response.status).toBe(200);
    await response.arrayBuffer();
  });

  it("answers 304 without a body when the browser already has this version", async () => {
    const userId = await createTestUser();
    const key = await uploadedKey(userId);
    const etag = (await getFile(key, userId)).headers.get("ETag") ?? "";

    const response = await getFile(key, userId, { "If-None-Match": etag });

    expect(response.status).toBe(304);
    expect(response.headers.get("ETag")).toBe(etag);
    expect(await response.text()).toBe("");
  });

  it("answers 404, never 403, for another user's key, so keys cannot be probed", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const key = await uploadedKey(owner);

    const response = await getFile(key, intruder);

    expect(response.status).toBe(404);
    expect((await bodyOf<{ error: { code: string } }>(response)).error.code).toBe("NOT_FOUND");
  });

  it("answers 404 for a missing object under the user's own prefix and for a path that climbs out of it", async () => {
    const owner = await createTestUser();
    const intruder = await createTestUser();
    const key = await uploadedKey(owner);

    expect((await getFile(`u/${intruder}/t/missing`, intruder)).status).toBe(404);
    expect((await getFile(encodeURIComponent(`u/${intruder}/../${key.slice(2)}`), intruder)).status).toBe(404);
  });

  it("answers 401 when signed out", async () => {
    const userId = await createTestUser();
    const key = await uploadedKey(userId);

    expect((await getFile(key)).status).toBe(401);
  });
});

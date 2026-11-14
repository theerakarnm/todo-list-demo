import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { LIMITS } from "../../shared/constants";
import { apiAs, bodyOf } from "../test/api";
import { pngFile, renamedExeFile } from "../test/images";
import { createTestUser } from "../test/users";

type Avatar = { avatarKey: string | null };
type Me = { settings: { avatarKey: string | null } };
type ApiError = { error: { code: string } };

function avatarForm(file: File) {
  const form = new FormData();
  form.set("file", file);
  return form;
}

async function putAvatar(userId: string, file = pngFile(512)) {
  const response = await apiAs(userId).putForm("/api/me/avatar", avatarForm(file));
  expect(response.status).toBe(200);
  return (await bodyOf<Avatar>(response)).avatarKey ?? "";
}

async function avatarKeyInMe(userId: string) {
  return (await bodyOf<Me>(await apiAs(userId).get("/api/me"))).settings.avatarKey;
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("PUT /api/me/avatar", () => {
  it("stores the photo under the user's avatar prefix and shows its key in /api/me", async () => {
    const userId = await createTestUser();

    const avatarKey = await putAvatar(userId);

    expect(avatarKey).toMatch(new RegExp(`^u/${userId}/avatar/[0-9a-f-]{36}$`));
    expect(await avatarKeyInMe(userId)).toBe(avatarKey);
    const object = await env.FILES.head(avatarKey);
    expect(object?.httpMetadata?.contentType).toBe("image/png");
    expect(object?.size).toBe(512);
  });

  it("replaces the previous photo and deletes its file", async () => {
    const userId = await createTestUser();
    const firstKey = await putAvatar(userId);

    const secondKey = await putAvatar(userId);

    expect(secondKey).not.toBe(firstKey);
    expect(await env.FILES.head(firstKey)).toBeNull();
    expect(await env.FILES.head(secondKey)).not.toBeNull();
  });

  it("rejects a file that is not an image, or is over 5 MB, and keeps the old photo", async () => {
    const userId = await createTestUser();
    const avatarKey = await putAvatar(userId);

    const notImage = await apiAs(userId).putForm("/api/me/avatar", avatarForm(renamedExeFile()));
    const tooLarge = await apiAs(userId).putForm("/api/me/avatar", avatarForm(pngFile(LIMITS.attachmentBytes + 1)));

    expect(notImage.status).toBe(415);
    expect((await bodyOf<ApiError>(notImage)).error.code).toBe("UNSUPPORTED_FILE");
    expect(tooLarge.status).toBe(413);
    expect(await avatarKeyInMe(userId)).toBe(avatarKey);
    expect((await env.FILES.list({ prefix: `u/${userId}/` })).objects.map((object) => object.key)).toEqual([avatarKey]);
  });
});

describe("PUT /api/me/avatar without a settings row", () => {
  const avatarFiles = async (userId: string) =>
    (await env.FILES.list({ prefix: `u/${userId}/avatar/` })).objects.map((object) => object.key);
  const deleteSettingsRow = (userId: string) =>
    env.DB.prepare("DELETE FROM user_settings WHERE user_id = ?").bind(userId).run();

  it("saves the photo when the row was missing before the request", async () => {
    const userId = await createTestUser();
    await deleteSettingsRow(userId);

    const avatarKey = await putAvatar(userId);

    const row = await env.DB.prepare("SELECT avatar_key FROM user_settings WHERE user_id = ?").bind(userId).first();
    expect(row?.avatar_key).toBe(avatarKey);
    expect(await avatarFiles(userId)).toEqual([avatarKey]);
  });

  it("deletes the uploaded file and answers 404 when the row is gone by the time the key is saved", async () => {
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    const userId = await createTestUser();
    const put = env.FILES.put.bind(env.FILES);
    // The row disappears (e.g. the account is being deleted) while the file uploads.
    vi.spyOn(env.FILES, "put").mockImplementation(async (...args: Parameters<R2Bucket["put"]>) => {
      const stored = await put(...args);
      await deleteSettingsRow(userId);
      return stored;
    });

    const response = await apiAs(userId).putForm("/api/me/avatar", avatarForm(pngFile(512)));

    expect(response.status).toBe(404);
    expect(await avatarFiles(userId)).toEqual([]);
  });
});

describe("DELETE /api/me/avatar", () => {
  it("removes the photo file and clears the key", async () => {
    const userId = await createTestUser();
    const avatarKey = await putAvatar(userId);

    const response = await apiAs(userId).delete("/api/me/avatar");

    expect(response.status).toBe(200);
    expect(await bodyOf<Avatar>(response)).toEqual({ avatarKey: null });
    expect(await env.FILES.head(avatarKey)).toBeNull();
    expect(await avatarKeyInMe(userId)).toBeNull();
  });

  it("is fine without a photo", async () => {
    const userId = await createTestUser();

    expect((await apiAs(userId).delete("/api/me/avatar")).status).toBe(200);
  });
});

import { describe, expect, it, vi } from "vitest";
import { answer, apiError, requestsTo } from "../test/fake-api";
import { ApiRequestError } from "./request-error";
import { uploadForm } from "./upload";

function form() {
  const body = new FormData();
  body.append("id", "a1");
  body.append("file", new Blob([new Uint8Array(4)], { type: "image/webp" }));
  return body;
}

describe("uploadForm", () => {
  it("sends the form, reports progress and returns the JSON answer", async () => {
    answer("POST /api/tasks/:id/attachments", (_request, { id }) => Response.json({ taskId: id }, { status: 201 }));
    const onProgress = vi.fn();

    const result = await uploadForm("POST", "/api/tasks/t1/attachments", form(), onProgress);

    expect(result).toEqual({ taskId: "t1" });
    expect(onProgress).toHaveBeenLastCalledWith(1);
    const sent = await requestsTo("POST /api/tasks/t1/attachments")[0]?.formData();
    expect(sent?.get("id")).toBe("a1");
    expect((sent?.get("file") as Blob | undefined)?.type).toBe("image/webp");
  });

  it("throws the API's error code when the server says no", async () => {
    answer("PUT /api/me/avatar", apiError(413, "FILE_TOO_LARGE"));

    const upload = uploadForm("PUT", "/api/me/avatar", form());

    await expect(upload).rejects.toBeInstanceOf(ApiRequestError);
    await expect(upload).rejects.toMatchObject({ status: 413, code: "FILE_TOO_LARGE" });
  });

  it("throws a TypeError, like fetch, when there is no answer at all", async () => {
    answer("PUT /api/me/avatar", () => {
      throw new TypeError("offline");
    });

    await expect(uploadForm("PUT", "/api/me/avatar", form())).rejects.toBeInstanceOf(TypeError);
  });
});

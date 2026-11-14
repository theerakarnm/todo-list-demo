import { act, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import th from "../i18n/th.json";
import { answerLater, apiError, requestsTo, stubApi } from "../test/fake-api";
import { aFile, stubBrowserImages } from "../test/fake-images";
import { renderHookWithStore } from "../test/render";
import { useUploadImages } from "./attachment-mutations";
import { localUpload } from "./local-uploads";
import { SYNC_QUERY_KEY } from "./sync-query";
import type { SyncStore } from "./sync-store";
import { anAttachment, aTask, storeWith } from "./test-rows";
import type { Attachment } from "./types";

const storeIn = (queryClient: { getQueryData: (key: typeof SYNC_QUERY_KEY) => unknown }) =>
  queryClient.getQueryData(SYNC_QUERY_KEY) as SyncStore;

const imagesIn = (queryClient: Parameters<typeof storeIn>[0]) => Object.values(storeIn(queryClient).attachments);

const UPLOAD = "POST /api/tasks/:id/attachments";

/** Answers an upload like the server: the stored row, with its R2 key. */
async function storedRow(request: Request, { id: taskId = "" }: Record<string, string>) {
  const form = await request.formData();
  const id = String(form.get("id"));
  return Response.json(anAttachment({ id, taskId, position: "a5", updatedAt: 9 }), { status: 201 });
}

function renderUpload(attachments: Attachment[] = []) {
  return renderHookWithStore(useUploadImages, storeWith({ tasks: [aTask({ id: "t1" })], attachments }));
}

describe("useUploadImages", () => {
  let images: ReturnType<typeof stubBrowserImages>;
  beforeEach(() => {
    images = stubBrowserImages({ width: 4000, height: 3000 });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the image at once from a local preview, then keeps the server's row", async () => {
    const upload = answerLater(UPLOAD);
    const { result, queryClient } = renderUpload();

    act(() => result.current("t1", [aFile("receipt.jpg", "image/jpeg")]));

    await waitFor(() => expect(imagesIn(queryClient)).toHaveLength(1));
    const [local] = imagesIn(queryClient);
    expect(local).toMatchObject({ taskId: "t1", r2Key: "" });
    expect(localUpload(local?.id ?? "")).toEqual({ previewUrl: "blob:preview-1", progress: 0 });

    const sent = await vi.waitFor(async () => {
      const request = requestsTo("POST /api/tasks/t1/attachments")[0];
      if (!request) throw new Error("not sent yet");
      return request.formData();
    });
    expect(sent.get("id")).toBe(local?.id);
    expect([sent.get("width"), sent.get("height")]).toEqual(["2048", "1536"]);
    expect((sent.get("file") as Blob).type).toBe("image/webp");

    upload.reply(Response.json(anAttachment({ id: local?.id ?? "", taskId: "t1", updatedAt: 9 }), { status: 201 }));
    await waitFor(() => expect(imagesIn(queryClient)[0]?.r2Key).toBe(`u/user-1/t/t1/${local?.id}`));
    expect(localUpload(local?.id ?? "")).toBeUndefined();
    expect(images.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });

  it("takes the image back off and explains when the account is out of space", async () => {
    stubApi({ [UPLOAD]: apiError(409, "STORAGE_LIMIT") });
    const { result, queryClient } = renderUpload();

    act(() => result.current("t1", [aFile("receipt.jpg", "image/jpeg")]));

    expect(await screen.findByText(th.errors.api.STORAGE_LIMIT)).toBeTruthy();
    expect(imagesIn(queryClient)).toEqual([]);
    expect(images.revokeObjectURL).toHaveBeenCalledWith("blob:preview-1");
  });

  it("refuses a file that is not an image without sending anything", async () => {
    const { result, queryClient } = renderUpload();

    act(() => result.current("t1", [aFile("bill.pdf", "application/pdf")]));

    expect(await screen.findByText(th.errors.api.UNSUPPORTED_FILE)).toBeTruthy();
    expect(imagesIn(queryClient)).toEqual([]);
    expect(requestsTo("POST /api/tasks/t1/attachments")).toHaveLength(0);
  });

  it("refuses an image the browser cannot read", async () => {
    const { result, queryClient } = renderUpload();

    act(() => result.current("t1", [aFile("logo.svg", "image/svg+xml")]));

    expect(await screen.findByText(th.errors.api.UNSUPPORTED_FILE)).toBeTruthy();
    expect(imagesIn(queryClient)).toEqual([]);
  });

  it("sends a HEIC the browser cannot decode as it is", async () => {
    stubApi({ [UPLOAD]: storedRow });
    const { result } = renderUpload();

    act(() => result.current("t1", [aFile("IMG_0001.HEIC", "image/heic")]));

    const sent = await vi.waitFor(async () => {
      const request = requestsTo("POST /api/tasks/t1/attachments")[0];
      if (!request) throw new Error("not sent yet");
      return request.formData();
    });
    expect((sent.get("file") as Blob).type).toBe("image/heic");
    expect(sent.get("width")).toBeNull();
  });

  it("uploads only up to 10 images per task and says why the rest were left out", async () => {
    stubApi({ [UPLOAD]: storedRow });
    const nine = Array.from({ length: 9 }, (_, index) => anAttachment({ id: `a${index}`, taskId: "t1" }));
    const { result, queryClient } = renderUpload(nine);

    act(() => result.current("t1", [aFile("10.jpg", "image/jpeg"), aFile("11.jpg", "image/jpeg")]));

    expect(await screen.findByText(th.errors.api.ATTACHMENT_LIMIT.replace("{{limit}}", "10"))).toBeTruthy();
    expect(imagesIn(queryClient)).toHaveLength(10);
    await waitFor(() => expect(requestsTo("POST /api/tasks/t1/attachments")).toHaveLength(1));
  });
});

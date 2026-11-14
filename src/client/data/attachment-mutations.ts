import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { LIMITS } from "../../shared/constants";
import { api } from "../api/client";
import { errorCodeMessage } from "../api/error-message";
import { request } from "../api/request";
import { uploadForm } from "../api/upload";
import { isImageFile, prepareImage } from "../images/prepare-image";
import { useToast } from "../toast/ToastProvider";
import { endLocalUpload, setUploadProgress, startLocalUpload } from "./local-uploads";
import { useOptimisticMutation } from "./optimistic";
import { positionAtEnd } from "./positions";
import { attachmentsOfTask } from "./selectors";
import { putRows, removeRows } from "./store-updates";
import { SYNC_QUERY_KEY } from "./sync-query";
import type { SyncStore } from "./sync-store";
import type { Attachment } from "./types";
import { uuidv7 } from "./uuidv7";

type NewImage = { attachment: Attachment; file: File };

/** Resizes the picked file in the browser, then uploads it with the client's id. */
async function uploadImage({ attachment, file }: NewImage) {
  const image = await prepareImage(file);
  const form = new FormData();
  form.append("id", attachment.id);
  form.append("file", image.blob);
  if (image.width && image.height) {
    form.append("width", String(image.width));
    form.append("height", String(image.height));
  }
  return uploadForm<Attachment>("POST", `/api/tasks/${attachment.taskId}/attachments`, form, (progress) =>
    setUploadProgress(attachment.id, progress),
  );
}

/** A row shown right away; the server's row (with its R2 key) replaces it. */
function localRow(taskId: string, file: File, position: string): Attachment {
  return {
    id: uuidv7(),
    taskId,
    r2Key: "",
    mime: file.type,
    bytes: file.size,
    width: null,
    height: null,
    position,
    createdAt: Date.now(),
    // Any copy from the server is newer than this optimistic one.
    updatedAt: 0,
    deletedAt: null,
  };
}

/**
 * Adds images to a task: each shows at once from a local preview with its
 * upload progress. Files that are not images, or over the 10 per task, are
 * left out with a Thai toast; the server checks everything again.
 */
export function useUploadImages() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const upload = useOptimisticMutation({
    request: uploadImage,
    apply: (store, { attachment }) => putRows(store, { attachments: [attachment] }),
    confirm: (attachment) => ({ attachments: [attachment] }),
    onSettled: ({ attachment }) => endLocalUpload(attachment.id),
  });

  return (taskId: string, files: File[]) => {
    const store = queryClient.getQueryData<SyncStore>(SYNC_QUERY_KEY);
    const images = files.filter(isImageFile);
    if (images.length < files.length) showToast({ tone: "error", message: errorCodeMessage(t, "UNSUPPORTED_FILE") });

    let gallery = store ? attachmentsOfTask(store, taskId) : [];
    const room = Math.max(0, LIMITS.attachmentsPerTask - gallery.length);
    if (images.length > room) showToast({ tone: "error", message: errorCodeMessage(t, "ATTACHMENT_LIMIT") });

    for (const file of images.slice(0, room)) {
      const attachment = localRow(taskId, file, positionAtEnd(gallery));
      gallery = [...gallery, attachment];
      startLocalUpload(attachment.id, file);
      upload.mutate({ attachment, file });
    }
  };
}

/** Deletes an image and offers Undo for 5 seconds. Undo restores it on the server (ARCHITECTURE §7). */
export function useDeleteImage() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const remove = useOptimisticMutation({
    request: (attachment: Attachment) => request(api.api.attachments[":id"].$delete({ param: { id: attachment.id } })),
    apply: (store, attachment) => removeRows(store, { attachments: [attachment.id] }),
    // The tombstone also removes a copy an upload still on its way brings back.
    confirm: (tombstone) => ({ attachments: [tombstone] }),
  });
  const restore = useOptimisticMutation({
    request: (attachment: Attachment) =>
      request(api.api.attachments[":id"].restore.$post({ param: { id: attachment.id } })),
    apply: (store, attachment) => putRows(store, { attachments: [attachment] }),
    confirm: (attachment) => ({ attachments: [attachment] }),
  });

  return (attachment: Attachment) => {
    remove.mutate(attachment);
    showToast({ message: t("toast.imageDeleted"), onUndo: () => restore.mutate(attachment) });
  };
}

/** Drag-to-reorder in the gallery: only the moved image gets a new position. */
export function useMoveImage() {
  const move = useOptimisticMutation({
    request: ({ attachment, position }: { attachment: Attachment; position: string }) =>
      request(api.api.attachments[":id"].$patch({ param: { id: attachment.id }, json: { position } })),
    apply: (store, { attachment, position }) => {
      const current = store.attachments[attachment.id];
      return current ? putRows(store, { attachments: [{ ...current, position }] }) : store;
    },
    confirm: (attachment) => ({ attachments: [attachment] }),
  });
  return (attachment: Attachment, position: string) => move.mutate({ attachment, position });
}

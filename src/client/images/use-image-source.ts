import { useRef } from "react";
import { useLocalUpload } from "../data/local-uploads";
import type { Attachment } from "../data/types";
import { fileUrl } from "./file-url";

/**
 * The src of a task image: the local preview while it uploads, then the stored file.
 * The upload can end a moment before the server's row (with its key) reaches the
 * store; meanwhile the last preview stays, so the <img> keeps its picture and
 * never asks for a file without a key.
 */
export function useImageSource(attachment: Attachment) {
  const upload = useLocalUpload(attachment.id);
  const lastPreview = useRef<string | undefined>(undefined);
  if (upload) lastPreview.current = upload.previewUrl;
  if (upload) return upload.previewUrl;
  return attachment.r2Key ? fileUrl(attachment.r2Key) : lastPreview.current;
}

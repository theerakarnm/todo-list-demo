import { useSyncExternalStore } from "react";

/** The id the new profile photo's upload is kept under (task images use their attachment id). */
export const AVATAR_UPLOAD_ID = "avatar";

/** An image on its way to the server: a preview of the picked file, and how much is sent (0 to 1). */
export type LocalUpload = { previewUrl: string; progress: number };

// Kept outside the sync store: progress changes many times a second,
// and only the one thumbnail showing it should re-render.
const uploads = new Map<string, LocalUpload>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Shows `file` under `id` until the upload ends. */
export function startLocalUpload(id: string, file: Blob) {
  uploads.set(id, { previewUrl: URL.createObjectURL(file), progress: 0 });
  notify();
}

export function setUploadProgress(id: string, progress: number) {
  const upload = uploads.get(id);
  if (!upload) return;
  uploads.set(id, { ...upload, progress });
  notify();
}

/** Done or failed: the preview's memory is given back. */
export function endLocalUpload(id: string) {
  const upload = uploads.get(id);
  if (!upload) return;
  URL.revokeObjectURL(upload.previewUrl);
  uploads.delete(id);
  notify();
}

export function localUpload(id: string) {
  return uploads.get(id);
}

/** The upload of this image while it is on its way, else undefined. */
export function useLocalUpload(id: string) {
  return useSyncExternalStore(subscribe, () => uploads.get(id));
}

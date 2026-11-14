import { readJson } from "./request-error";

/**
 * Sends a multipart form with XMLHttpRequest, because fetch cannot report upload
 * progress. Errors match `request()`: an error response throws ApiRequestError,
 * no answer at all throws a TypeError. `onProgress` gets 0 to 1.
 */
export function uploadForm<Result>(
  method: "POST" | "PUT",
  url: string,
  form: FormData,
  onProgress?: (fraction: number) => void,
): Promise<Result> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      const response = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => JSON.parse(xhr.responseText) as Result,
      };
      readJson(response).then(resolve, reject);
    };
    xhr.onerror = () => reject(new TypeError("Upload failed: no answer from the server"));
    xhr.send(form);
  });
}

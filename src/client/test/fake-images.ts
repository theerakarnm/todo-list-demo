import { vi } from "vitest";

/**
 * jsdom cannot decode or draw images. This stands in for the browser's
 * createImageBitmap, OffscreenCanvas and object URLs, so the real resize code
 * runs: every picked image decodes as `size` (HEIC and SVG files fail, like in Chrome)
 * and encodes as a small WebP. Returns the object URL spies.
 */
export function stubBrowserImages(size = { width: 4000, height: 3000 }) {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async (file: Blob) => {
      if (/hei[cf]|svg/.test(file.type) || !file.type.startsWith("image/")) {
        throw new DOMException("The source image could not be decoded.", "InvalidStateError");
      }
      return { ...size, close: () => {} };
    }),
  );
  vi.stubGlobal(
    "OffscreenCanvas",
    class {
      constructor(
        readonly width: number,
        readonly height: number,
      ) {}
      getContext() {
        return { drawImage: () => {}, fillRect: () => {} };
      }
      async convertToBlob({ type }: { type: string }) {
        return new Blob([new Uint8Array(100)], { type });
      }
    },
  );

  let previews = 0;
  const createObjectURL = vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:preview-${++previews}`);
  const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  return { createObjectURL, revokeObjectURL };
}

/** A picked file, e.g. `aFile("receipt.jpg", "image/jpeg")`. */
export function aFile(name: string, type: string, bytes = 2000) {
  return new File([new Uint8Array(bytes)], name, { type });
}

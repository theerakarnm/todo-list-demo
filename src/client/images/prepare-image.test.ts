import { describe, expect, it, vi } from "vitest";
import { LIMITS } from "../../shared/constants";
import type { ImageCodec } from "./canvas-codec";
import { prepareAvatar, prepareImage } from "./prepare-image";

// jsdom has no canvas, so these tests swap the browser's decoder and encoder
// for fakes and check the decisions: what is refused, resized or sent as it is.

function fakeCodec({ width = 4000, height = 3000, decodes = true, encodedBytes = 1000 } = {}) {
  const close = vi.fn();
  const codec = {
    decode: vi.fn(async () => {
      if (!decodes) throw new DOMException("cannot decode", "InvalidStateError");
      return { width, height, close } as unknown as ImageBitmap;
    }),
    encode: vi.fn(async () => new Blob([new Uint8Array(encodedBytes)], { type: "image/webp" })),
  } satisfies ImageCodec;
  return { codec, close };
}

const photo = (type = "image/jpeg", name = "photo.jpg", bytes = 10) => new File([new Uint8Array(bytes)], name, { type });
const tooLarge = LIMITS.attachmentBytes + 1;

describe("prepareImage", () => {
  it("downscales a photo to 2048 px on the long side as WebP", async () => {
    const { codec, close } = fakeCodec({ width: 4000, height: 3000 });

    const prepared = await prepareImage(photo(), codec);

    expect(prepared).toMatchObject({ width: 2048, height: 1536, mime: "image/webp" });
    expect(codec.encode).toHaveBeenCalledWith(
      expect.anything(),
      { x: 0, y: 0, width: 4000, height: 3000 },
      { width: 2048, height: 1536 },
    );
    expect(close).toHaveBeenCalled();
  });

  it("refuses a file that is not an image before decoding it", async () => {
    const { codec } = fakeCodec();

    await expect(prepareImage(photo("application/pdf", "bill.pdf"), codec)).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE",
    });
    expect(codec.decode).not.toHaveBeenCalled();
  });

  it("refuses an image the browser cannot decode", async () => {
    const { codec } = fakeCodec({ decodes: false });

    await expect(prepareImage(photo("image/svg+xml", "logo.svg"), codec)).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE",
    });
  });

  it.each([
    ["its type", "image/heic", "IMG_0001.HEIC"],
    ["its name when the browser gives no type", "", "IMG_0002.heic"],
    ["a HEIF type", "image/heif", "IMG_0003.heif"],
  ])("sends a HEIC the browser cannot decode as it is, known by %s", async (_how, type, name) => {
    const { codec } = fakeCodec({ decodes: false });
    const file = photo(type, name);

    const prepared = await prepareImage(file, codec);

    expect(prepared.blob).toBe(file);
    expect(prepared.width).toBeUndefined();
  });

  it("refuses an image still over 5 MB after processing", async () => {
    const { codec } = fakeCodec({ encodedBytes: tooLarge });

    await expect(prepareImage(photo(), codec)).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });

  it("refuses a HEIC sent as it is when it is over 5 MB", async () => {
    const { codec } = fakeCodec({ decodes: false });

    await expect(prepareImage(photo("image/heic", "big.heic", tooLarge), codec)).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });
});

describe("prepareAvatar", () => {
  it("crops the centre square and makes it 512 px", async () => {
    const { codec } = fakeCodec({ width: 3000, height: 2000 });

    const prepared = await prepareAvatar(photo(), codec);

    expect(prepared).toMatchObject({ width: 512, height: 512, mime: "image/webp" });
    expect(codec.encode).toHaveBeenCalledWith(
      expect.anything(),
      { x: 500, y: 0, width: 2000, height: 2000 },
      { width: 512, height: 512 },
    );
  });

  it("does not upscale a small photo", async () => {
    const { codec } = fakeCodec({ width: 300, height: 400 });

    await prepareAvatar(photo(), codec);

    expect(codec.encode).toHaveBeenCalledWith(
      expect.anything(),
      { x: 0, y: 50, width: 300, height: 300 },
      { width: 300, height: 300 },
    );
  });

  it("refuses a file that is not an image", async () => {
    const { codec } = fakeCodec();

    await expect(prepareAvatar(photo("text/plain", "notes.txt"), codec)).rejects.toMatchObject({
      code: "UNSUPPORTED_FILE",
    });
  });
});

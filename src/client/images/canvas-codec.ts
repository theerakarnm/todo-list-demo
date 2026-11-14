import type { ImageSize } from "./fit-within";

/** The part of the source image to draw, in source pixels. */
export type Crop = { x: number; y: number; width: number; height: number };

/** Decodes and re-encodes images. The browser's canvas in the app; a fake in tests (jsdom has no canvas). */
export type ImageCodec = {
  decode: (file: Blob) => Promise<ImageBitmap>;
  encode: (image: ImageBitmap, crop: Crop, size: ImageSize) => Promise<Blob>;
};

const QUALITY = 0.85;

type Canvas = OffscreenCanvas | HTMLCanvasElement;

function createCanvas({ width, height }: ImageSize): Canvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function canvasToBlob(canvas: Canvas, type: string): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality: QUALITY });
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob failed"))), type, QUALITY),
  );
}

export const canvasCodec: ImageCodec = {
  // Photos from phones are turned the right way up from their EXIF orientation.
  decode: (file) => createImageBitmap(file, { imageOrientation: "from-image" }),

  async encode(image, crop, size) {
    const canvas = createCanvas(size);
    const context = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size.width, size.height);
    const webp = await canvasToBlob(canvas, "image/webp");
    if (webp.type === "image/webp") return webp;

    // Safari cannot encode WebP (it gives a large PNG instead), so it sends JPEG.
    // JPEG has no transparency: paint white behind the image rather than black.
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "white";
    context.fillRect(0, 0, size.width, size.height);
    return canvasToBlob(canvas, "image/jpeg");
  },
};

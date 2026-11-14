/** Images are downscaled so their long side is at most this many pixels (ARCHITECTURE §16). */
export const MAX_IMAGE_SIDE = 2048;

export type ImageSize = { width: number; height: number };

/**
 * The size of a width x height image shrunk to fit a square of `maxSide`,
 * keeping its aspect ratio. Never upscales; whole pixels, at least 1.
 */
export function fitWithin(width: number, height: number, maxSide = MAX_IMAGE_SIDE): ImageSize {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

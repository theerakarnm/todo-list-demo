/** The image types JotList accepts (ARCHITECTURE.md §16). */
export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif";

/** How many bytes from the start of a file sniffImageMime looks at. */
export const SNIFF_BYTES = 12;

/** Major brands of the ISO-BMFF `ftyp` box. Only the major brand counts, so AVIF and MP4 stay out. */
const HEIF_BRANDS: Record<string, ImageMime> = {
  heic: "image/heic",
  heix: "image/heic",
  hevc: "image/heic",
  hevx: "image/heic",
  heim: "image/heic",
  heis: "image/heic",
  mif1: "image/heif",
  msf1: "image/heif",
};

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function asciiAt(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/**
 * The image type a file really is, read from its first bytes (its "magic
 * bytes"), not from its name or the type the browser claims. Null for anything else.
 */
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WEBP") return "image/webp";
  if (asciiAt(bytes, 4, 4) === "ftyp") return HEIF_BRANDS[asciiAt(bytes, 8, 4)] ?? null;
  return null;
}

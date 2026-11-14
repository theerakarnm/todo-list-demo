import { LIMITS } from "../../shared/constants";
import { type Crop, canvasCodec, type ImageCodec } from "./canvas-codec";
import { fitWithin, MAX_IMAGE_SIDE } from "./fit-within";
import { ImageFileError } from "./image-file-error";

/** A profile photo is a square of this many pixels (ARCHITECTURE §16). */
const AVATAR_SIDE = 512;

/** What is uploaded. The size is left out when the original file is sent as it is. */
export type PreparedImage = { blob: Blob; mime: string; width?: number; height?: number };

/** iPhones save HEIC; some browsers give such a file no type, so its name counts too. */
function isHeic(file: File) {
  return /^image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** A quick look before any work: only images are accepted (the server checks the real bytes). */
export function isImageFile(file: File) {
  return file.type.startsWith("image/") || isHeic(file);
}

function assertWithinSizeLimit(prepared: PreparedImage) {
  if (prepared.blob.size > LIMITS.attachmentBytes) throw new ImageFileError("FILE_TOO_LARGE");
  return prepared;
}

/**
 * Decodes the file, draws the `cropOf` part at the size `sizeOf` gives and encodes it.
 * A HEIC this browser cannot decode is sent as it is; any other undecodable file is refused.
 */
async function reencode(
  file: File,
  codec: ImageCodec,
  cropOf: (width: number, height: number) => Crop,
  maxSide: number,
): Promise<PreparedImage> {
  if (!isImageFile(file)) throw new ImageFileError("UNSUPPORTED_FILE");

  const image = await codec.decode(file).catch(() => null);
  if (!image) {
    if (!isHeic(file)) throw new ImageFileError("UNSUPPORTED_FILE");
    return assertWithinSizeLimit({ blob: file, mime: file.type || "image/heic" });
  }

  try {
    const crop = cropOf(image.width, image.height);
    const size = fitWithin(crop.width, crop.height, maxSide);
    const blob = await codec.encode(image, crop, size);
    return assertWithinSizeLimit({ blob, mime: blob.type, ...size });
  } finally {
    image.close();
  }
}

/** A task image: at most 2048 px on the long side, as WebP. */
export function prepareImage(file: File, codec = canvasCodec) {
  return reencode(file, codec, (width, height) => ({ x: 0, y: 0, width, height }), MAX_IMAGE_SIDE);
}

/** A profile photo: the centre square, at most 512 px, as WebP. */
export function prepareAvatar(file: File, codec = canvasCodec) {
  const centreSquare = (width: number, height: number) => {
    const side = Math.min(width, height);
    return { x: (width - side) / 2, y: (height - side) / 2, width: side, height: side };
  };
  return reencode(file, codec, centreSquare, AVATAR_SIDE);
}

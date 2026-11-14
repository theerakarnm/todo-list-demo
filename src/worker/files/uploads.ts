import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { LIMITS } from "../../shared/constants";
import { idSchema } from "../../shared/schemas/fields";
import { ApiError } from "../errors";
import { type ImageMime, SNIFF_BYTES, sniffImageMime } from "./sniff-image";

// Multipart bodies of the upload routes. They hold a File, so they live on the
// server; the client builds the FormData itself. The image type and size are
// checked from the file's own bytes, never from what the browser claims.

/** Wider than any real photo; the client sends the size after its own resize. */
const MAX_IMAGE_SIDE = 65_535;

/** Multipart fields arrive as strings. */
const imageSideSchema = z.coerce.number().int().min(1).max(MAX_IMAGE_SIDE);

/** `POST /api/tasks/:id/attachments` */
export const uploadAttachmentSchema = z.object({
  id: idSchema,
  file: z.instanceof(File),
  width: imageSideSchema.optional(),
  height: imageSideSchema.optional(),
});

/** `PUT /api/me/avatar`. The client has already cropped the photo square at 512 px. */
export const uploadAvatarSchema = z.object({ file: z.instanceof(File) });

/** Room for the multipart boundaries and the small fields next to the file. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

/**
 * Refuses an upload body that is clearly too big before it is read: from its
 * Content-Length, or while it streams in when there is none. The exact file
 * size is checked again after parsing.
 */
export const imageBodyLimit = bodyLimit({
  maxSize: LIMITS.attachmentBytes + MULTIPART_OVERHEAD_BYTES,
  onError: () => {
    throw new ApiError("FILE_TOO_LARGE");
  },
});

/** The checks every image upload gets, in this order: a real image (415), then not over 5 MB (413). */
export async function assertImageFile(file: File): Promise<ImageMime> {
  const mime = sniffImageMime(new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()));
  if (!mime) throw new ApiError("UNSUPPORTED_FILE");
  if (file.size > LIMITS.attachmentBytes) throw new ApiError("FILE_TOO_LARGE");
  return mime;
}

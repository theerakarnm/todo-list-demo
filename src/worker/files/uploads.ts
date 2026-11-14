import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { LIMITS } from "../../shared/constants";
import { idSchema } from "../../shared/schemas/fields";
import { ApiError } from "../errors";

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

import { z } from "zod";
import { idSchema } from "../../shared/schemas/fields";

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

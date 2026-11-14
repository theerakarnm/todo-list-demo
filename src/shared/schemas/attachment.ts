import { z } from "zod";
import { positionSchema } from "./fields";

/** Body of `PATCH /api/attachments/:id`: drag-to-reorder in the gallery. */
export const updateAttachmentSchema = z.object({ position: positionSchema });

export type UpdateAttachmentInput = z.infer<typeof updateAttachmentSchema>;

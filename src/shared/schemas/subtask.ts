import { z } from "zod";
import { LIMITS } from "../constants";
import { idSchema, positionSchema, titleSchema } from "./fields";

const subtaskFields = z.object({
  taskId: idSchema,
  title: titleSchema(LIMITS.subtaskTitleLength),
  position: positionSchema,
});

/** Body of `PUT /api/subtasks/:id` (create-or-update). */
export const createSubtaskSchema = subtaskFields;

/** Body of `PATCH /api/subtasks/:id`. A subtask cannot move to another task. */
export const updateSubtaskSchema = subtaskFields
  .omit({ taskId: true })
  .extend({ completed: z.boolean() })
  .partial();

export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;

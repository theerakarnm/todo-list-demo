import { z } from "zod";
import { LIMITS, PRIORITIES } from "../constants";
import { idSchema, localDateSchema, localTimeSchema, positionSchema, titleSchema } from "./fields";

const taskFields = z.object({
  title: titleSchema(LIMITS.taskTitleLength),
  notes: z.string().max(LIMITS.taskNotesLength),
  priority: z.enum(PRIORITIES),
  projectId: idSchema.nullable(),
  dueDate: localDateSchema.nullable(),
  dueTime: localTimeSchema.nullable(),
  position: positionSchema,
});

const dueTimeNeedsDueDate = {
  check: (task: { dueDate?: string | null; dueTime?: string | null }) => !task.dueTime || !!task.dueDate,
  options: { message: "A due time needs a due date", path: ["dueTime"] },
};

/** Body of `PUT /api/tasks/:id` (create-or-update). */
export const createTaskSchema = taskFields
  .extend({
    notes: taskFields.shape.notes.default(""),
    priority: taskFields.shape.priority.default("none"),
    projectId: taskFields.shape.projectId.default(null),
    dueDate: taskFields.shape.dueDate.default(null),
    dueTime: taskFields.shape.dueTime.default(null),
  })
  .refine(dueTimeNeedsDueDate.check, dueTimeNeedsDueDate.options);

/** Body of `PATCH /api/tasks/:id`. */
export const updateTaskSchema = taskFields
  .extend({ completed: z.boolean() })
  .partial()
  .refine(dueTimeNeedsDueDate.check, dueTimeNeedsDueDate.options);

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

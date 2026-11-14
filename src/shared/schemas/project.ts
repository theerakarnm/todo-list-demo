import { z } from "zod";
import { LIMITS, PROJECT_COLORS } from "../constants";
import { positionSchema, titleSchema } from "./fields";

const projectFields = z.object({
  name: titleSchema(LIMITS.projectNameLength),
  color: z.enum(PROJECT_COLORS),
  position: positionSchema,
});

/** Body of `PUT /api/projects/:id` (create-or-update). */
export const createProjectSchema = projectFields.extend({
  color: projectFields.shape.color.default("black"),
});

/** Body of `PATCH /api/projects/:id`. */
export const updateProjectSchema = projectFields.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

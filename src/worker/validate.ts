import type { ValidationTargets } from "hono";
import { validator } from "hono/validator";
import type { z } from "zod";
import { ApiError } from "./errors";

/**
 * Validates one part of the request (json, query, param...) with a shared Zod schema.
 * Any failure answers VALIDATION_ERROR with the Thai message, so Zod's English
 * messages never reach the user. Read the result with `c.req.valid(target)`.
 */
export function validate<Target extends keyof ValidationTargets, Schema extends z.ZodType>(
  target: Target,
  schema: Schema,
) {
  return validator(target, (value): z.output<Schema> => {
    const result = schema.safeParse(value);
    if (!result.success) throw new ApiError("VALIDATION_ERROR");
    return result.data;
  });
}

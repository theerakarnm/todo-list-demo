import { z } from "zod";
import { LIMITS } from "../constants";
import { idSchema } from "./fields";

const epochMsSchema = z.coerce.number().int().nonnegative();

/** Query of `GET /api/sync`. Leave `since` out for a full load. */
export const syncQuerySchema = z.object({ since: epochMsSchema.optional() });

/**
 * Query of `GET /api/logbook`: the `next` cursor of the previous page.
 * `beforeId` breaks ties between tasks completed in the same millisecond.
 */
export const logbookQuerySchema = z
  .object({ before: epochMsSchema.optional(), beforeId: idSchema.optional() })
  .refine((query) => !query.beforeId || query.before !== undefined, {
    message: "beforeId needs before",
    path: ["beforeId"],
  });

/** Query of `GET /api/search`. */
export const searchQuerySchema = z.object({ q: z.string().trim().min(1).max(LIMITS.searchQueryLength) });

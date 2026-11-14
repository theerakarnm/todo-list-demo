import { z } from "zod";
import { LIMITS } from "../constants";

/** Every id is a UUIDv7 created on the client, so creates are idempotent. */
export const idSchema = z.uuid({ version: "v7" });

/** Fractional-index key used for drag-to-reorder. */
export const positionSchema = z.string().min(1).max(LIMITS.positionLength);

/** A calendar date in the user's time zone, e.g. "2026-11-14". */
export const localDateSchema = z.iso.date();

/** A wall-clock time in the user's time zone, e.g. "09:30". */
export const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export function titleSchema(maxLength: number) {
  return z.string().trim().min(1).max(maxLength);
}

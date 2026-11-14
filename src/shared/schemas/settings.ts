import { z } from "zod";
import { LIMITS, START_PAGES, THEMES, WEEK_STARTS } from "../constants";
import { localTimeSchema, titleSchema } from "./fields";

function isIanaTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Body of `PATCH /api/settings`. */
export const updateSettingsSchema = z
  .object({
    displayName: titleSchema(LIMITS.displayNameLength),
    timezone: z.string().refine(isIanaTimeZone, { message: "Unknown time zone" }),
    theme: z.enum(THEMES),
    startPage: z.enum(START_PAGES),
    weekStart: z.enum(WEEK_STARTS),
    digestEnabled: z.boolean(),
    digestTime: localTimeSchema,
  })
  .partial();

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

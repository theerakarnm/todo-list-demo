import { describe, expect, it } from "vitest";
import { updateSettingsSchema } from "./settings";

describe("updateSettingsSchema", () => {
  it("accepts a partial update", () => {
    expect(updateSettingsSchema.parse({ theme: "dark" })).toEqual({ theme: "dark" });
  });

  it("only accepts known themes, start pages and week starts", () => {
    expect(updateSettingsSchema.safeParse({ theme: "sepia" }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ startPage: "upcoming" }).success).toBe(false);
    expect(updateSettingsSchema.safeParse({ weekStart: "sat" }).success).toBe(false);
  });

  it("accepts IANA time zones and rejects made-up ones", () => {
    expect(updateSettingsSchema.safeParse({ timezone: "Asia/Bangkok" }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ timezone: "Mars/Olympus" }).success).toBe(false);
  });

  it("validates the digest time as HH:MM", () => {
    expect(updateSettingsSchema.safeParse({ digestTime: "08:00" }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ digestTime: "8am" }).success).toBe(false);
  });

  it("trims the display name and rejects an empty one", () => {
    expect(updateSettingsSchema.parse({ displayName: "  แจม " })).toEqual({ displayName: "แจม" });
    expect(updateSettingsSchema.safeParse({ displayName: " " }).success).toBe(false);
  });
});

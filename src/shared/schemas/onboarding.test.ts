import { describe, expect, it } from "vitest";
import { completeOnboardingSchema } from "./onboarding";

const valid = { displayName: " แจม ", theme: "dark", starterProjects: ["งาน", "ส่วนตัว"] };

describe("completeOnboardingSchema", () => {
  it("accepts names from the fixed list and trims the display name", () => {
    expect(completeOnboardingSchema.parse(valid)).toEqual({ ...valid, displayName: "แจม" });
  });

  it("drops an unknown time zone instead of failing", () => {
    expect(completeOnboardingSchema.parse({ ...valid, timezone: "Mars/Olympus" }).timezone).toBeUndefined();
    expect(completeOnboardingSchema.parse({ ...valid, timezone: "Asia/Tokyo" }).timezone).toBe("Asia/Tokyo");
  });

  it("rejects other project names and more than three", () => {
    expect(completeOnboardingSchema.safeParse({ ...valid, starterProjects: ["Work"] }).success).toBe(false);
    expect(completeOnboardingSchema.safeParse({ ...valid, starterProjects: ["งาน", "งาน", "งาน", "งาน"] }).success).toBe(false);
  });
});

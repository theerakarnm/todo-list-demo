import { describe, expect, it } from "vitest";
import { completeOnboardingSchema } from "./onboarding";

const valid = { displayName: " แจม ", theme: "dark", starterProjects: [{ key: "work", name: " งาน " }, { key: "personal", name: "ส่วนตัว" }] };

describe("completeOnboardingSchema", () => {
  it("accepts keys from the fixed list and trims the names", () => {
    expect(completeOnboardingSchema.parse(valid)).toEqual({
      ...valid,
      displayName: "แจม",
      starterProjects: [{ key: "work", name: "งาน" }, { key: "personal", name: "ส่วนตัว" }],
    });
  });

  it("drops an unknown time zone instead of failing", () => {
    expect(completeOnboardingSchema.parse({ ...valid, timezone: "Mars/Olympus" }).timezone).toBeUndefined();
    expect(completeOnboardingSchema.parse({ ...valid, timezone: "Asia/Tokyo" }).timezone).toBe("Asia/Tokyo");
  });

  it("rejects unknown keys, empty names and more than three", () => {
    const work = { key: "work", name: "งาน" };
    expect(completeOnboardingSchema.safeParse({ ...valid, starterProjects: [{ key: "Work", name: "งาน" }] }).success).toBe(false);
    expect(completeOnboardingSchema.safeParse({ ...valid, starterProjects: [{ key: "work", name: " " }] }).success).toBe(false);
    expect(completeOnboardingSchema.safeParse({ ...valid, starterProjects: [work, work, work, work] }).success).toBe(false);
  });
});

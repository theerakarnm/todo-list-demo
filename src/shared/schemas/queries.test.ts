import { describe, expect, it } from "vitest";
import { logbookQuerySchema, searchQuerySchema, syncQuerySchema } from "./queries";

describe("syncQuerySchema", () => {
  it("reads since as epoch milliseconds, and allows leaving it out for a full load", () => {
    expect(syncQuerySchema.parse({ since: "1763100000000" })).toEqual({ since: 1763100000000 });
    expect(syncQuerySchema.parse({})).toEqual({});
    expect(syncQuerySchema.safeParse({ since: "yesterday" }).success).toBe(false);
    expect(syncQuerySchema.safeParse({ since: "-1" }).success).toBe(false);
  });
});

describe("logbookQuerySchema", () => {
  it("reads the before cursor and its tie-break id", () => {
    const beforeId = "019a8c3e-1f2a-7b3c-8d4e-5f6a7b8c9d0e";
    expect(logbookQuerySchema.parse({ before: "1763100000000", beforeId })).toEqual({
      before: 1763100000000,
      beforeId,
    });
    expect(logbookQuerySchema.parse({})).toEqual({});
  });

  it("needs before when beforeId is given", () => {
    expect(logbookQuerySchema.safeParse({ beforeId: "019a8c3e-1f2a-7b3c-8d4e-5f6a7b8c9d0e" }).success).toBe(false);
  });
});

describe("searchQuerySchema", () => {
  it("trims the query and rejects an empty or very long one", () => {
    expect(searchQuerySchema.parse({ q: "  ช่างแอร์ " })).toEqual({ q: "ช่างแอร์" });
    expect(searchQuerySchema.safeParse({ q: "   " }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "ก".repeat(101) }).success).toBe(false);
  });
});

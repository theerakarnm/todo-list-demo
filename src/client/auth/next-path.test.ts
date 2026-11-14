import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("accepts a normal path with a query", () => {
    expect(safeNextPath("/app/today?x=1")).toBe("/app/today?x=1");
  });

  it("rejects missing values and other sites", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
  });

  it.each([
    ["tab", "/\t/evil"],
    ["newline", "/\n/evil"],
    ["carriage return", "/\r/evil"],
    ["null", "/\u0000/evil"],
    ["delete", "/\u007f/evil"],
  ])("rejects a path with a %s", (_name, path) => {
    expect(safeNextPath(path)).toBeNull();
  });
});

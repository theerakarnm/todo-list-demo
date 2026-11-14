import { describe, expect, it } from "vitest";
import { fileUrl } from "./file-url";

describe("fileUrl", () => {
  it("keeps the slashes of the key, which the file route reads as one path", () => {
    expect(fileUrl("u/user-1/t/task-1/image-1")).toBe("/api/files/u/user-1/t/task-1/image-1");
  });

  it("escapes anything else that is not safe in a path segment", () => {
    expect(fileUrl("u/user 1/avatar/a#b?c")).toBe("/api/files/u/user%201/avatar/a%23b%3Fc");
  });
});

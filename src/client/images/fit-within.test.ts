import { describe, expect, it } from "vitest";
import { fitWithin } from "./fit-within";

describe("fitWithin", () => {
  it.each([
    ["a landscape photo", 4000, 3000, { width: 2048, height: 1536 }],
    ["a portrait photo", 3000, 4000, { width: 1536, height: 2048 }],
    ["a small image, never upscaled", 1000, 800, { width: 1000, height: 800 }],
    ["a square already at the limit", 2048, 2048, { width: 2048, height: 2048 }],
    ["a panorama", 20000, 1000, { width: 2048, height: 102 }],
    ["a one-pixel-high strip", 100_000, 10, { width: 2048, height: 1 }],
  ])("scales %s (%ix%i) to fit 2048 px", (_name, width, height, expected) => {
    expect(fitWithin(width, height, 2048)).toEqual(expected);
  });

  it("fits a smaller box, e.g. 512 px", () => {
    expect(fitWithin(1024, 768, 512)).toEqual({ width: 512, height: 384 });
  });
});

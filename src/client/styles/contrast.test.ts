import { describe, expect, it } from "vitest";
import tokensCss from "./tokens.css?raw";

// WCAG 2 contrast ratio between two #rrggbb colours.
function contrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const [red, green, blue] = [1, 3, 5].map((start) => {
      const channel = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter! + 0.05) / (darker! + 0.05);
}

// Reads the custom properties of one CSS block and follows var(--x) references to a hex value.
function themeColors(selector: string) {
  const readBlock = (blockSelector: string) => {
    const start = tokensCss.indexOf(`${blockSelector} {`);
    const block = tokensCss.slice(start, tokensCss.indexOf("}", start));
    return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2]]));
  };
  const variables = { ...readBlock(":root"), ...readBlock(selector) };
  const resolve = (name: string): string => {
    const value = variables[name] ?? "";
    const reference = value.match(/^var\((--[\w-]+)\)$/);
    return reference ? resolve(reference[1]!) : value;
  };
  return resolve;
}

describe.each([
  { theme: "light", selector: ":root" },
  { theme: "dark", selector: '[data-theme="dark"]' },
])("$theme theme colours", ({ selector }) => {
  const color = themeColors(selector);

  it("keeps body and muted text at AA contrast (4.5:1) on the page background", () => {
    expect(contrastRatio(color("--fg"), color("--bg"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color("--fg-muted"), color("--bg"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color("--inverse-fg"), color("--inverse-bg"))).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color("--on-highlight"), color("--highlight"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("dark theme accents", () => {
  const color = themeColors('[data-theme="dark"]');

  it("keeps link hover text at AA contrast", () => {
    expect(contrastRatio(color("--link-hover"), color("--bg"))).toBeGreaterThanOrEqual(4.5);
  });
});

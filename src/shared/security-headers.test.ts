import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS } from "./security-headers";

// Static assets skip the Worker, so public/_headers must repeat the Worker's headers.
describe("public/_headers", () => {
  it("sends the same security headers as the Worker for every static file", () => {
    const headersFile = readFileSync("public/_headers", "utf8");

    expect(headersFile).toMatch(/^\/\*$/m);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(headersFile).toContain(`  ${name}: ${value}\n`);
    }
  });
});

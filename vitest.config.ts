import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: "./wrangler.jsonc" },
          })),
        ],
        test: {
          name: "worker",
          include: ["src/worker/**/*.test.ts"],
        },
      },
      {
        test: {
          name: "client",
          environment: "jsdom",
          include: ["src/client/**/*.test.{ts,tsx}", "src/shared/**/*.test.ts"],
        },
      },
    ],
  },
});

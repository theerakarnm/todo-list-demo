import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const migrationsPath = path.join(import.meta.dirname, "drizzle");

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: { TEST_MIGRATIONS: await readD1Migrations(migrationsPath) },
            },
          })),
        ],
        test: {
          name: "worker",
          include: ["src/worker/**/*.test.ts"],
          setupFiles: ["src/worker/test/apply-migrations.ts"],
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

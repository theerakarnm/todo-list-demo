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
              bindings: {
                TEST_MIGRATIONS: await readD1Migrations(migrationsPath),
                // .dev.vars may hold a real key; tests must never send real email.
                RESEND_API_KEY: "",
                // Same in every checkout, whatever .dev.vars says.
                APP_ENV: "development",
                // Fixed test values, so tests never depend on (or leak) the real keys in .dev.vars.
                BETTER_AUTH_SECRET: "test-better-auth-secret-at-least-32-characters",
                BETTER_AUTH_URL: "",
                EMAIL_FROM: "no-reply@mail.eukron.com",
                LINE_LOGIN_CHANNEL_ID: "test-line-channel-id",
                LINE_LOGIN_CHANNEL_SECRET: "test-line-channel-secret",
                TURNSTILE_SITE_KEY: "test-turnstile-site-key",
                TURNSTILE_SECRET_KEY: "test-turnstile-secret-key",
                // TEST ONLY: a throwaway VAPID key pair made for these tests. Never use it anywhere else.
                VAPID_PUBLIC_KEY: "BNuNFWFtkL1UWRGtGpfZxskSqWn4qYEQepegdeQATWVt-zSoxOL_iDvoP-lgaOj5a21CGwTQeU5FAsi7HUGDhWM",
                VAPID_PRIVATE_KEY: "DDzOUxaFWx2jLv5L9I4oiwMgNwtsRbq6egLPxL1fP0E",
                VAPID_SUBJECT: "mailto:test@jotlist.test",
              },
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
          // CSS is ignored in tests by default; contrast.test.ts reads the design tokens.
          css: { include: [/tokens\.css/] },
          include: ["src/client/**/*.test.{ts,tsx}", "src/shared/**/*.test.ts"],
          setupFiles: ["src/client/test/setup.ts"],
        },
      },
    ],
  },
});

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// End-to-end smoke against the real dev server (Worker + local D1).
// Not part of `bun run test`; run with `bun run test:e2e`.
const PORT = 5199;

// With CLOUDFLARE_ENV=e2e the dev server reads .dev.vars.e2e instead of your .dev.vars
// (both are git-ignored). Test values only: no Resend key, so emails are only logged;
// Cloudflare's always-pass Turnstile test keys; a throwaway auth secret; dummy LINE ids.
const E2E_DEV_VARS = ".dev.vars.e2e";
const e2eDevVars = [
  "APP_ENV=development",
  "BETTER_AUTH_URL=",
  "BETTER_AUTH_SECRET=e2e-better-auth-secret-at-least-32-characters",
  "RESEND_API_KEY=",
  "EMAIL_FROM=no-reply@jotlist.test",
  "TURNSTILE_SITE_KEY=1x00000000000000000000AA",
  "TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA",
  "LINE_LOGIN_CHANNEL_ID=e2e-line-channel-id",
  "LINE_LOGIN_CHANNEL_SECRET=e2e-line-channel-secret",
  "",
].join("\n");
// Every Playwright process loads this file, and the dev server restarts when the file is written.
if (!existsSync(E2E_DEV_VARS) || readFileSync(E2E_DEV_VARS, "utf8") !== e2eDevVars) {
  writeFileSync(E2E_DEV_VARS, e2eDevVars);
}

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  globalSetup: "./e2e/global-setup.ts",
  // One local D1 and one test user: the steps run in order.
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 1000 },
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `bun run dev --port ${PORT} --strictPort`,
    env: { CLOUDFLARE_ENV: "e2e" },
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

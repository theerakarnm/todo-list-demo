import { defineConfig, devices } from "@playwright/test";

// End-to-end smoke against the real dev server (Worker + local D1).
// Not part of `bun run test`; run with `bun run test:e2e`.
const PORT = 5199;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  // One local D1 and one dev user: the steps run in order.
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
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

import { defineConfig, devices } from "@playwright/test";

const WEB = process.env.E2E_BASE_URL ?? "http://localhost:4000";

// The gate (gate.mjs) owns booting the real agent stack against docker infra.
// This config never starts servers itself — it drives the already-running
// web:4000 / api:4003 / admin:4002 / landing:4001 agent-mode apps.
export default defineConfig({
  testDir: "./specs",
  testIgnore: "**/visual/**",
  timeout: 90000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL: WEB,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});

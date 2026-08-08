import { defineConfig, devices } from "@playwright/test";

// Real-stack passkey round-trip. Runs against the live agent stack
// (api :4003 + web :4000, RP ID "localhost") which must already be booted
// (`pnpm agents`) — no mock server, no managed webServer. Chromium only, so
// the CDP WebAuthn virtual authenticator is available.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /passkey\.spec\.ts/,
  timeout: 60000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4000",
    trace: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
});

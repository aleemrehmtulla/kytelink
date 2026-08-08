import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // passkey.spec.ts runs against the live agent stack (:4000/:4003) via
  // playwright.passkey.config.ts, not this mock server — keep it out here.
  testIgnore: /passkey\.spec\.ts/,
  timeout: 45000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
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
  webServer: {
    command: "NEXT_PUBLIC_USE_MOCK_API=true NEXT_PUBLIC_CDN_URL=http://localhost:5002 npx next start -p 3000",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120000,
  },
});

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Integration tests (assets/og-image/quarantine, readyz pings) exercise the
// real docker services. Load the repo-root .env so `pnpm test` runs them when
// docker is up; dotenv never overrides vars already set in the environment.
const here = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(here, "../../.env") });

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});

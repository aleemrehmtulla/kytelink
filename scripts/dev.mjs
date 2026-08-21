import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  assertPortsFree,
  installShutdownHandlers,
  portInUse,
  reapStaleStack,
  root,
  runTurbo,
  writeAppServerEnv,
  writeStackLock,
} from "./run-apps.mjs";
import { ensureInfra, runMigrations } from "./setup.mjs";

const PORTS = { web: 3000, landing: 3001, admin: 3002, api: 3003, cdn: 5002 };

await reapStaleStack("dev");

// Mirrors requiredEnvSchema in packages/schemas — the vars apps/api refuses
// to boot without. Checked here so a fresh clone fails with one clear message
// instead of a crash buried in the Turbo TUI.
const REQUIRED_KEYS = [
  "DATABASE_URL",
  "REDIS_URL",
  "AUTH_SECRET",
  "INTERNAL_API_SECRET",
  "WEB_BASE_URL",
  "API_BASE_URL",
  "LANDING_ZONE_URL",
];

if (!existsSync(join(root, ".env"))) {
  process.stderr.write(
    [
      "",
      "✗ No .env found — Kytelink needs a database before anything can run.",
      "",
      "  Run the one-shot setup (it writes .env, starts Docker services, migrates,",
      "  and seeds — you pick what to enable, Postgres is the only must):",
      "",
      "      pnpm run setup",
      "",
      "  Then run `pnpm dev` again.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  process.stderr.write(
    [
      "",
      `✗ .env is missing required variables: ${missing.join(", ")}`,
      "",
      "  Re-run `pnpm run setup` to regenerate it, or fill them in by hand",
      "  (.env.example documents every variable).",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

// cdn is deliberately excluded: it's shared with `pnpm agents`, whose copy may
// legitimately hold 5002. Its turbo task will fail-fast in its own pane; every
// other port must be free or the whole run stops before spawning anything.
const { cdn: cdnPort, ...exclusivePorts } = PORTS;
await assertPortsFree(exclusivePorts);
if (await portInUse(cdnPort)) {
  process.stdout.write(`cdn already listening on :${cdnPort} — reusing it.\n`);
}

if (!(await ensureInfra(process.env, { quiet: true }))) process.exit(1);
runMigrations(process.env);

process.stdout.write(
  [
    "Starting Kytelink dev environment:",
    `  web      http://localhost:${PORTS.web}`,
    `  landing  http://localhost:${PORTS.landing}`,
    `  admin    http://localhost:${PORTS.admin}`,
    `  api      http://localhost:${PORTS.api}`,
    `  cdn      http://localhost:${PORTS.cdn}`,
    "",
  ].join("\n"),
);

// Server secrets must land in each Next app's .env.local before Turbo boots the
// dev servers; installShutdownHandlers removes them (and kills Turbo) on exit.
writeAppServerEnv();
installShutdownHandlers();
runTurbo("dev");
writeStackLock("dev");

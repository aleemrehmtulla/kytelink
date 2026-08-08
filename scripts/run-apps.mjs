import { spawn } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const root = join(__dirname, "..");

config({ path: join(root, ".env") });

const procs = [];
const writtenEnvFiles = [];

// Next's separate render workers (getStaticProps/SSR) inherit only NEXT_PUBLIC_*
// and app-level .env files — not the parent process env. Write the server-side
// vars each Next app needs into a gitignored app .env.local so internal HMAC
// calls are signed correctly under `pnpm dev`/`pnpm agents`.
export function writeAppServerEnv(overrides = {}) {
  const merged = { ...process.env, ...overrides };
  const serverKeys = [
    "INTERNAL_API_SECRET",
    "API_BASE_URL",
    "WEB_BASE_URL",
    "LANDING_ZONE_URL",
    "ADMIN_BASE_URL",
    "ADMIN_EMAILS",
    "AGENT_MODE",
  ];
  const publicKeys = Object.keys(merged).filter((k) => k.startsWith("NEXT_PUBLIC_"));
  const lines = [...serverKeys, ...publicKeys]
    .filter((k) => merged[k] !== undefined)
    .map((k) => `${k}=${merged[k]}`);
  for (const app of ["web", "admin", "landing"]) {
    const file = join(root, "apps", app, ".env.local");
    writeFileSync(file, lines.join("\n") + "\n");
    writtenEnvFiles.push(file);
  }
}

function cleanupEnvFiles() {
  for (const file of writtenEnvFiles) {
    try {
      rmSync(file, { force: true });
    } catch {
      // best-effort cleanup
    }
  }
}

export function runFilter(name, filter, args, extraEnv = {}) {
  const child = spawn("pnpm", ["--filter", filter, ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  procs.push(child);
  child.on("exit", (code) => {
    process.stdout.write(`[${name}] exited with code ${String(code)}\n`);
  });
  return child;
}

// Human `pnpm dev` runs the apps through Turbo so its interactive TUI (the task
// sidebar + per-app log panes) shows up; each app bakes its own port into its
// `dev` script. Env pre-flight (writeAppServerEnv) must run before this. In a
// non-TTY (CI) Turbo falls back to streamed logs automatically. `pnpm agents`
// stays on runFilter() — it needs port+1000 and per-app AGENT_MODE that a single
// `turbo run` can't inject per task.
export function runTurbo(task, extraEnv = {}) {
  const child = spawn("pnpm", ["exec", "turbo", "run", task], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  procs.push(child);
  child.on("exit", (code) => {
    cleanupEnvFiles();
    process.exit(code ?? 0);
  });
  return child;
}

export function installShutdownHandlers() {
  function shutdown() {
    cleanupEnvFiles();
    for (const child of procs) child.kill("SIGTERM");
    process.exit(0);
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", cleanupEnvFiles);
}

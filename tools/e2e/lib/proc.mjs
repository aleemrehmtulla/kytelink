import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(here, "..", "..", "..");
const logDir = join(here, "..", ".logs");

const RESET = "[0m";
const colors = { cyan: "[36m", green: "[32m", red: "[31m", yellow: "[33m", dim: "[2m" };

export function log(msg, color = "cyan") {
  process.stdout.write(`${colors[color] ?? ""}[gate] ${msg}${RESET}\n`);
}

export function step(msg) {
  process.stdout.write(`\n${colors.cyan}══ ${msg} ${"═".repeat(Math.max(0, 60 - msg.length))}${RESET}\n`);
}

/**
 * Run a command to completion, streaming its output live. We pipe + forward
 * (not raw "inherit") because some tools (pnpm/prisma) exit non-zero when
 * their inherited stdout is a non-TTY pipe; piping is stable everywhere.
 */
function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: repoRoot,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (d) => process.stdout.write(d));
    child.stderr.on("data", (d) => process.stderr.write(d));
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

export function runSync(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...(opts.env ?? {}) },
    ...opts,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  return res.status ?? 1;
}

export async function must(cmd, args, opts = {}) {
  const code = await run(cmd, args, opts);
  if (code !== 0) throw new Error(`command failed (${code}): ${cmd} ${args.join(" ")}`);
}

export function spawnBg(name, cmd, args, opts = {}) {
  mkdirSync(logDir, { recursive: true });
  const out = createWriteStream(join(logDir, `${name}.log`), { flags: "w" });
  const child = spawn(cmd, args, {
    cwd: repoRoot,
    env: { ...process.env, ...(opts.env ?? {}) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.pipe(out);
  child.stderr.pipe(out);
  child._gateName = name;
  return child;
}

export function killAll(children) {
  for (const c of children) {
    try {
      c.kill("SIGTERM");
    } catch {
      /* already gone */
    }
  }
}

export async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

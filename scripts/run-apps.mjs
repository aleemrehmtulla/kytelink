import { spawn, spawnSync } from "node:child_process";
import { writeFileSync, rmSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const root = join(__dirname, "..");

config({ path: join(root, ".env") });

// On macOS, Turbopack's native watcher can exhaust the process's FSEvents
// budget, after which Next's JS-side route-discovery watcher gets EMFILE on
// every fs.watch — zero pages discovered, so every dynamic route 404s in dev.
// Polling sidesteps fs.watch for that watcher; its watch set is tiny (the
// pages dir plus a few config files), so the overhead is negligible.
if (process.platform === "darwin" && process.env.WATCHPACK_POLLING === undefined) {
  process.env.WATCHPACK_POLLING = "true";
}

const procs = [];
const writtenEnvFiles = [];
let lockFile = null;
let shuttingDown = false;

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

// ---------------------------------------------------------------------------
// Process-tree hygiene
//
// Dev stacks here are routinely started by AI agent sessions that can die
// without delivering a single signal (SIGKILL'd shells, closed panes). A plain
// child.kill() only ever reached the pnpm wrapper, so grandchildren like
// `tsx watch` outlived every session — and because tsx watch idles instead of
// exiting when its program crashes (EADDRINUSE against the previous orphan's
// port), each new run stacked one more immortal watcher until the machine ran
// out of file descriptors. Three rules fix that class of bug:
//
//   1. runFilter() children are spawned detached — each is its own process-
//      group leader, so shutdown kills the whole group (pnpm + tsx + node),
//      not just the wrapper.
//   2. Every orchestrator records its process tree in a per-mode lockfile
//      (.dev-dev.lock / .dev-agents.lock). The next run — or `pnpm stop` —
//      reaps whatever a dead session left behind before starting anything.
//   3. Ports are asserted free before anything spawns, so a foreign process
//      on a dev port fails the run loudly up front instead of leaving a
//      crash-looping task behind.
//
// Reaping never trusts a recorded pid by itself: pids get recycled, so a
// process is only killed if its command line still looks like ours.
// ---------------------------------------------------------------------------

const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

function commandOf(pid) {
  const out = spawnSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8" });
  return out.status === 0 ? out.stdout.trim() : "";
}

const isOurs = (command) =>
  command.includes(root) ||
  command.includes("@kytelink/") ||
  /scripts\/(dev|agents|stop)\.mjs/.test(command);

const isOrchestrator = (command) => /scripts\/(dev|agents)\.mjs/.test(command);

function processTable() {
  const out = spawnSync("ps", ["-axo", "pid=,ppid=,pgid=,command="], { encoding: "utf8" });
  if (out.status !== 0) return [];
  return out.stdout
    .split("\n")
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/))
    .filter(Boolean)
    .map(([, pid, ppid, pgid, command]) => ({
      pid: Number(pid),
      ppid: Number(ppid),
      pgid: Number(pgid),
      command,
    }));
}

// Everything reachable from `pid` by walking child links, plus every member of
// the process groups our detached children lead. Both views are needed: turbo
// (attached, for its TUI) is found via ppid links even after re-parenting
// breaks stop short, while detached tasks are found via pgid even when the
// intermediate pnpm wrapper already died.
function collectTargets(table, { pids = [], pgids = [] }) {
  const roots = new Set(pids);
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of table) {
      if (roots.has(p.ppid) && !roots.has(p.pid)) {
        roots.add(p.pid);
        grew = true;
      }
    }
  }
  const groups = new Set(pgids);
  return table.filter((p) => (roots.has(p.pid) || groups.has(p.pgid)) && isOurs(p.command));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function terminate(targets, { graceMs = 3000 } = {}) {
  const signalGroup = (pid, signal) => {
    try {
      process.kill(-pid, signal);
    } catch {
      try {
        process.kill(pid, signal);
      } catch {
        // already gone
      }
    }
  };
  for (const t of targets) signalGroup(t.pid, "SIGTERM");
  const deadline = Date.now() + graceMs;
  let survivors = targets;
  while (Date.now() < deadline) {
    survivors = survivors.filter((t) => isAlive(t.pid));
    if (survivors.length === 0) return;
    await sleep(150);
  }
  // tsx watch (and an API mid-drain on a hung Redis) ignore SIGTERM — this
  // escalation is load-bearing, not paranoia.
  for (const t of survivors) signalGroup(t.pid, "SIGKILL");
}

const lockPathFor = (mode) => join(root, `.dev-${mode}.lock`);

function readLock(mode) {
  try {
    return JSON.parse(readFileSync(lockPathFor(mode), "utf8"));
  } catch {
    return null;
  }
}

export function writeStackLock(mode) {
  lockFile = lockPathFor(mode);
  const pgid = processTable().find((p) => p.pid === process.pid)?.pgid ?? process.pid;
  const lock = {
    pid: process.pid,
    pgid,
    mode,
    startedAt: new Date().toISOString(),
    children: procs.map(({ child, name, detached }) => ({ pid: child.pid, name, detached })),
  };
  writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n");
}

function removeLock() {
  if (lockFile) rmSync(lockFile, { force: true });
}

// Called at the top of dev.mjs/agents.mjs, and by `pnpm stop` with takeover.
// Without takeover, a lockfile whose orchestrator is still alive means a
// second copy of the same stack was requested — that's the caller's mistake,
// so fail loudly instead of killing a session someone may be using.
export async function reapStaleStack(mode, { takeover = false } = {}) {
  const lock = readLock(mode);
  if (!lock) return { reaped: 0 };
  const orchestratorAlive = isAlive(lock.pid) && isOrchestrator(commandOf(lock.pid));
  if (orchestratorAlive && !takeover) {
    process.stderr.write(
      [
        "",
        `✗ A \`pnpm ${mode}\` stack is already running (pid ${lock.pid}, started ${lock.startedAt}).`,
        "",
        "  Stop it first — Ctrl+C in its terminal, or from anywhere:",
        "",
        "      pnpm stop",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }
  const childPids = (lock.children ?? []).map((c) => c.pid);
  const targets = collectTargets(processTable(), {
    pids: [lock.pid, ...childPids],
    pgids: childPids.filter((pid, i) => lock.children[i].detached),
  });
  if (targets.length > 0) {
    process.stdout.write(
      `Reaping ${targets.length} leftover process(es) from a previous \`pnpm ${lock.mode}\` run...\n`,
    );
    await terminate(targets);
  }
  rmSync(lockPathFor(mode), { force: true });
  return { reaped: targets.length };
}

function portInUse(port) {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => resolve(true));
    probe.once("listening", () => probe.close(() => resolve(false)));
    probe.listen(port);
  });
}

function holderOf(port) {
  const out = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fcp"], {
    encoding: "utf8",
  });
  if (out.status !== 0) return null;
  const pid = out.stdout.match(/^p(\d+)/m)?.[1];
  const name = out.stdout.match(/^c(.+)/m)?.[1];
  return pid ? `${name ?? "unknown"} (pid ${pid})` : null;
}

// Fails the run before anything spawns if a port is taken. This is what keeps
// the orphan cascade from ever restarting: without it, a foreign listener on
// the api port turns `tsx watch` into a crash-looping idle watcher.
export async function assertPortsFree(ports) {
  const busy = [];
  for (const [name, port] of Object.entries(ports)) {
    if (await portInUse(port)) busy.push({ name, port, holder: holderOf(port) });
  }
  if (busy.length === 0) return;
  process.stderr.write(
    [
      "",
      "✗ Dev ports are already in use:",
      "",
      ...busy.map(
        ({ name, port, holder }) =>
          `      ${name.padEnd(8)} :${port}  held by ${holder ?? "an unknown process"}`,
      ),
      "",
      "  If that's a leftover Kytelink stack, `pnpm stop` will clean it up.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

export { portInUse };

export function runFilter(name, filter, args, extraEnv = {}) {
  // detached => the child leads its own process group. Its stdin is ignored on
  // purpose: a detached process reading the tty would be stopped with SIGTTIN,
  // and nothing here is interactive.
  const child = spawn("pnpm", ["--filter", filter, ...args], {
    cwd: root,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, ...extraEnv },
    detached: process.platform !== "win32",
    shell: process.platform === "win32",
  });
  procs.push({ child, name, detached: process.platform !== "win32" });
  child.on("exit", (code) => {
    process.stdout.write(`[${name}] exited with code ${String(code)}\n`);
  });
  return child;
}

// Human `pnpm dev` runs the apps through Turbo so its interactive TUI (the task
// sidebar + per-app log panes) shows up; each app bakes its own port into its
// `dev` script. Env pre-flight (writeAppServerEnv) must run before this. Turbo
// stays attached (not detached) — its TUI needs to be in the foreground process
// group to own the tty. In a non-TTY (CI) Turbo falls back to streamed logs
// automatically. `pnpm agents` stays on runFilter() — it needs port+1000 and
// per-app AGENT_MODE that a single `turbo run` can't inject per task.
export function runTurbo(task, extraEnv = {}) {
  const child = spawn("pnpm", ["exec", "turbo", "run", task], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  procs.push({ child, name: "turbo", detached: false });
  child.on("exit", (code) => {
    if (shuttingDown) return;
    cleanupEnvFiles();
    removeLock();
    process.exit(code ?? 0);
  });
  return child;
}

export function installShutdownHandlers() {
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    const targets = collectTargets(processTable(), {
      pids: procs.map(({ child }) => child.pid),
      pgids: procs.filter(({ detached }) => detached).map(({ child }) => child.pid),
    });
    await terminate(targets);
    cleanupEnvFiles();
    removeLock();
    process.exit(0);
  }
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  process.on("SIGHUP", () => void shutdown());
  process.on("exit", cleanupEnvFiles);
}

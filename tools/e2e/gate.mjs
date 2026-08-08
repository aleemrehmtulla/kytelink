#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { killAll, log, must, repoRoot, runSync, spawnBg, step } from "./lib/proc.mjs";
import { waitForDockerHealthy, waitForHttp } from "./lib/wait.mjs";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(repoRoot, ".env") });

// The gate always boots the FULL docker stack, regardless of which compose
// profiles the developer's .env selects — and fills in the local-infra vars a
// minimal (postgres+redis only) .env leaves blank.
process.env.COMPOSE_PROFILES = "core,analytics,uploads,email";
const FULL_STACK_ENV = {
  CLICKHOUSE_URL: "http://localhost:8123",
  CLICKHOUSE_PASSWORD: "kyte",
  AWS_ENDPOINT_URL: "http://localhost:9000",
  AWS_ACCESS_KEY_ID: "minioadmin",
  AWS_SECRET_ACCESS_KEY: "minioadmin",
  AWS_REGION: "auto",
  AWS_S3_BUCKET: "kytelink-assets",
  NEXT_PUBLIC_CDN_URL: "http://localhost:9000/kytelink-assets",
};
for (const [key, value] of Object.entries(FULL_STACK_ENV)) {
  if (!process.env[key]) process.env[key] = value;
}

const flags = new Set(process.argv.slice(2));
const KEEP_INFRA = flags.has("--keep-infra"); // skip docker down -v/up (faster reruns)
const NO_TEARDOWN = flags.has("--no-teardown"); // leave apps + infra running after
const SKIP_E2E = flags.has("--skip-e2e");
const SKIP_INTEGRATION = flags.has("--skip-integration");
const REUSE_APPS = flags.has("--reuse-apps"); // assume the agent stack is already up

// Canonical agent ports (dev port + 1000), per rewrite/24-agents.md.
const PORTS = { web: 4000, landing: 4001, admin: 4002, api: 4003, cdn: 5002 };

const AGENT_ENV = {
  AGENT_MODE: "true",
  AUTH_MOCK_PROVIDERS: "true",
  WEB_BASE_URL: `http://localhost:${PORTS.web}`,
  API_BASE_URL: `http://localhost:${PORTS.api}`,
  LANDING_ZONE_URL: `http://localhost:${PORTS.landing}`,
  ADMIN_BASE_URL: `http://localhost:${PORTS.admin}`,
  NEXT_PUBLIC_API_URL: `http://localhost:${PORTS.api}`,
  NEXT_PUBLIC_WEB_URL: `http://localhost:${PORTS.web}`,
  NEXT_PUBLIC_LANDING_URL: `http://localhost:${PORTS.landing}`,
  // Route OTP/invite mail into mailpit so the real email code path is exercised.
  EMAIL_PROVIDER: "smtp",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  // Client-side capability flags mirror the real docker infra (CH + MinIO up).
  NEXT_PUBLIC_CAP_ANALYTICS: "true",
  NEXT_PUBLIC_CAP_UPLOADS: "true",
  NEXT_PUBLIC_CAP_DOMAINS: "true",
};

const children = [];
let teardownDone = false;

// The Next apps (web/landing/admin) are served with `next start` (production),
// not `next dev`: dev file-watchers exhaust macOS file descriptors (EMFILE) and
// dev render-workers drop non-NEXT_PUBLIC env (so getStaticProps signs internal
// calls with an empty INTERNAL_API_SECRET -> 401 -> 404). A built server process
// gets the full env and does no watching. We still write .env.local per app so
// the server-only secret is available to `next start`.
const NEXT_APPS = ["web", "landing", "admin"];

function appEnvLocalPath(app) {
  return join(repoRoot, "apps", app, ".env.local");
}

function writeAppEnvFiles() {
  const secret = process.env.INTERNAL_API_SECRET ?? "";
  const lines = [
    `INTERNAL_API_SECRET=${secret}`,
    ...Object.entries(AGENT_ENV).map(([k, v]) => `${k}=${v}`),
  ].join("\n");
  for (const app of NEXT_APPS) writeFileSync(appEnvLocalPath(app), `${lines}\n`);
}

function cleanAppEnvFiles() {
  for (const app of NEXT_APPS) {
    try {
      rmSync(appEnvLocalPath(app));
    } catch {
      /* already gone */
    }
  }
}

function clearPort(port) {
  // -sTCP:LISTEN is critical: a bare `lsof -ti tcp:PORT` also returns CLIENT
  // sockets, so the gate (which holds keep-alive connections to the app servers)
  // would kill -9 itself. Only the listening server must be killed.
  const res = spawnSync(
    "bash",
    ["-c", `lsof -ti tcp:${port} -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null; true`],
    { cwd: repoRoot },
  );
  return res.status;
}

function teardown() {
  if (teardownDone) return;
  teardownDone = true;
  step("Teardown");
  // Free app-server memory immediately (hard kill by port) before docker down;
  // idempotency itself is guaranteed by bootInfra's `down -v && up`, not here.
  cleanAppEnvFiles();
  killAll(children);
  if (!REUSE_APPS) for (const p of Object.values(PORTS)) clearPort(p);
  if (!KEEP_INFRA && !NO_TEARDOWN) {
    log("docker compose down -v");
    runSync("docker", ["compose", "down", "-v"]);
  } else {
    log("leaving docker infra up (--keep-infra/--no-teardown)", "dim");
  }
}

process.on("SIGINT", () => {
  teardown();
  process.exit(130);
});

async function bootInfra() {
  step("Infra: clean docker boot");
  if (KEEP_INFRA) {
    log("--keep-infra: skipping down -v; ensuring services up", "yellow");
    await must("docker", ["compose", "up", "-d"]);
  } else {
    await must("docker", ["compose", "down", "-v"]);
    await must("docker", ["compose", "up", "-d"]);
  }
  await waitForDockerHealthy();
  // Explicit HTTP readiness for the services the suites hit directly.
  await waitForHttp("http://localhost:8123/ping", { label: "clickhouse", timeoutMs: 60000 });
  await waitForHttp("http://localhost:8025/readyz", { label: "mailpit", timeoutMs: 60000 });
  await waitForHttp("http://localhost:9000/minio/health/live", { label: "minio", timeoutMs: 60000 });
}

async function migrate() {
  step("Migrate: prisma deploy + clickhouse");
  await must("pnpm", ["--filter", "@kytelink/db", "exec", "prisma", "migrate", "deploy"]);
  await must("pnpm", ["--filter", "@kytelink/clickhouse", "migrate"]);
}

async function seed() {
  step("Seed: base fixtures + agent accounts (AGENT_MODE=true)");
  await must("pnpm", ["--filter", "@kytelink/seed", "seed"], { env: { AGENT_MODE: "true" } });
}

async function integration() {
  if (SKIP_INTEGRATION) {
    log("skipping integration suite (--skip-integration)", "yellow");
    return;
  }
  step("Integration suite: apps/api (docker-backed vitest)");
  await must("pnpm", ["--filter", "@kytelink/api", "test"], { env: { AGENT_MODE: "true", AUTH_MOCK_PROVIDERS: "true" } });
}

// The integration suite (docker-backed vitest) runs against the SAME Redis the
// e2e apps then use. Some integration tests deliberately exhaust rate-limit
// counters (e.g. phase4-routes.test.ts fires 11 preview-verify attempts to prove
// the S6 429), and those counters carry a 15-minute TTL — well past when the e2e
// runs. Left in place, the e2e's first preview-verify from the same proxy IP is
// already over the limit and a correct passcode is rejected. Reset only the
// rate-limit keys (rl:*) between the suites — never a blanket FLUSHDB, which would
// also wipe the seeded beacon-validation sets and profile caches the e2e relies on.
function resetRateLimits() {
  step("Reset rate-limit counters (rl:*) before e2e");
  const lua = "local k=redis.call('keys','rl:*'); for i=1,#k do redis.call('del',k[i]) end; return #k";
  const code = runSync("docker", ["compose", "exec", "-T", "redis", "redis-cli", "EVAL", lua, "0"]);
  if (code !== 0) log("rate-limit reset skipped (redis not reachable)", "yellow");
}

async function bootApps() {
  if (REUSE_APPS) {
    log("--reuse-apps: expecting the agent stack already listening", "yellow");
    await waitForApps();
    return;
  }
  step("Boot apps: build Next apps (production), start agent stack");
  for (const p of Object.values(PORTS)) clearPort(p);
  writeAppEnvFiles();

  // Build web/landing/admin (+ their workspace deps) once. turbo caches, so a
  // second gate run is fast. api runs from source via tsx (no build needed).
  await must(
    "pnpm",
    ["exec", "turbo", "run", "build", "--filter=@kytelink/web", "--filter=@kytelink/landing", "--filter=@kytelink/admin"],
    { env: AGENT_ENV },
  );

  // api + cdn from source (tsx / node); no file watching -> no EMFILE.
  children.push(spawnBg("cdn", "pnpm", ["--filter", "@kytelink/cdn", "run", "dev"], { env: AGENT_ENV }));
  children.push(
    spawnBg("api", "pnpm", ["--filter", "@kytelink/api", "exec", "tsx", "src/index.ts"], {
      env: { ...AGENT_ENV, PORT: String(PORTS.api) },
    }),
  );
  for (const app of NEXT_APPS) {
    children.push(
      spawnBg(app, "pnpm", ["--filter", `@kytelink/${app}`, "exec", "next", "start", "-p", String(PORTS[app])], {
        env: AGENT_ENV,
      }),
    );
  }
  await waitForApps();
}

async function waitForApps() {
  step("Wait for apps healthy");
  await waitForHttp(`http://localhost:${PORTS.api}/readyz`, { label: "api", timeoutMs: 120000 });
  await waitForHttp(`http://localhost:${PORTS.web}/login`, { label: "web", okStatuses: [200], timeoutMs: 120000 });
  await waitForHttp(`http://localhost:${PORTS.admin}/`, { label: "admin", okStatuses: [200, 302, 307, 401, 403, 404], timeoutMs: 120000 });
  await waitForHttp(`http://localhost:${PORTS.landing}/`, { label: "landing", okStatuses: [200, 302, 307, 404], timeoutMs: 120000 });
  await waitForHttp(`http://localhost:${PORTS.web}/agent`, { label: "web/agent", okStatuses: [200], timeoutMs: 60000 });
}

async function e2e() {
  if (SKIP_E2E) {
    log("skipping e2e suite (--skip-e2e)", "yellow");
    return;
  }
  step("E2E suite: Playwright golden path (375px + 1440px)");
  await must("pnpm", ["--filter", "@kytelink/e2e", "exec", "playwright", "test"], {
    env: { ...AGENT_ENV, E2E_BASE_URL: `http://localhost:${PORTS.web}` },
  });
  step("Visual regression: ProfileView baselines (12 themes × 2 viewports)");
  await must("pnpm", ["--filter", "@kytelink/e2e", "exec", "playwright", "test", "--config", "playwright.visual.config.ts"], {
    env: { ...AGENT_ENV, E2E_BASE_URL: `http://localhost:${PORTS.web}` },
  });
}

async function main() {
  const started = Date.now();
  let ok = false;
  try {
    if (!REUSE_APPS) await bootInfra();
    if (!REUSE_APPS) await migrate();
    if (!REUSE_APPS) await seed();
    await integration();
    resetRateLimits();
    await bootApps();
    await e2e();
    const secs = ((Date.now() - started) / 1000).toFixed(0);
    step(`GATE GREEN (${secs}s)`);
    log("all suites passed", "green");
    ok = true;
    // Persist the verdict before teardown so a run is provably green even if the
    // teardown process is interrupted by the shared environment.
    mkdirSync(join(here, ".logs"), { recursive: true });
    writeFileSync(join(here, ".logs", "gate-result.txt"), `GREEN ${new Date().toISOString()} (${secs}s)\n`);
  } catch (err) {
    step("GATE RED");
    log(err instanceof Error ? err.message : String(err), "red");
  } finally {
    teardown();
  }
  // Explicit exit: the built Next servers we spawned can keep the event loop
  // alive even after SIGKILL, so never rely on a natural drain.
  process.exit(ok ? 0 : 1);
}

main();

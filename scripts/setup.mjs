import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const root = join(__dirname, "..");

const ALL_PROFILES = "core,analytics,uploads,email";

export function parseEnvFile(path = join(root, ".env")) {
  if (!existsSync(path)) return null;
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2].replace(/^"(.*)"$/, "$1");
  }
  return env;
}

function setKey(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.trimEnd()}\n${line}\n`;
}

function must(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.stderr.write(`\n✗ \`${command} ${args.join(" ")}\` failed (exit ${String(result.status)}).\n`);
    process.exit(result.status ?? 1);
  }
}

function tcpCheck(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.on("connect", () => done(true));
    socket.on("error", () => done(false));
  });
}

export function hostPortOf(url, fallbackPort) {
  try {
    const parsed = new URL(url);
    return { host: parsed.hostname || "localhost", port: Number(parsed.port) || fallbackPort };
  } catch {
    return { host: "localhost", port: fallbackPort };
  }
}

export async function waitForTcp(label, host, port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await tcpCheck(host, port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  process.stderr.write(`✗ ${label} did not become reachable on ${host}:${String(port)} within ${String(timeoutMs / 1000)}s.\n`);
  return false;
}

// Starts the compose services selected by COMPOSE_PROFILES (from .env or the
// caller), then waits for Postgres/Redis to actually accept connections so
// migrate/seed/dev don't race the containers.
export async function ensureInfra(env, { quiet = false } = {}) {
  const profiles = env.COMPOSE_PROFILES ?? "";
  if (profiles.length > 0) {
    if (!quiet) process.stdout.write(`Starting docker services (${profiles})...\n`);
    const result = spawnSync("docker", ["compose", "up", "-d"], {
      cwd: root,
      stdio: quiet ? "ignore" : "inherit",
      env: { ...process.env, COMPOSE_PROFILES: profiles },
      shell: process.platform === "win32",
    });
    if (result.status !== 0) {
      process.stderr.write(
        "✗ `docker compose up -d` failed. Is Docker running? Start it and re-run, or point\n" +
          "  DATABASE_URL/REDIS_URL in .env at services you run yourself.\n",
      );
      return false;
    }
  }
  const pg = hostPortOf(env.DATABASE_URL ?? "", 5432);
  const redis = hostPortOf(env.REDIS_URL ?? "", 6379);
  const pgOk = await waitForTcp("Postgres", pg.host, pg.port, profiles.includes("core") ? 60000 : 5000);
  const redisOk = await waitForTcp("Redis", redis.host, redis.port, profiles.includes("core") ? 60000 : 5000);
  if (!pgOk || !redisOk) {
    process.stderr.write(
      "\n✗ The database layer isn't reachable. Kytelink cannot run without Postgres and Redis.\n" +
        (profiles.includes("core")
          ? "  Check `docker compose ps` and container logs.\n"
          : "  Your .env points at self-managed Postgres/Redis — make sure they're running,\n" +
            "    or re-run `pnpm run setup` and let Docker manage them.\n"),
    );
    return false;
  }
  return true;
}

export function runMigrations(env) {
  const dbEnv = { ...env };
  if (!dbEnv.DIRECT_URL) dbEnv.DIRECT_URL = dbEnv.DATABASE_URL;
  process.stdout.write("\nApplying database migrations...\n");
  must("pnpm", ["--filter", "@kytelink/db", "exec", "prisma", "migrate", "deploy"], dbEnv);
  if (env.CLICKHOUSE_URL) {
    process.stdout.write("Applying ClickHouse migrations...\n");
    must("pnpm", ["--filter", "@kytelink/clickhouse", "migrate"], env);
  }
}

// The standard sample-data seed (idempotent upserts). This is NOT the one-time
// v1 legacy backfill (`pnpm --filter @kytelink/seed backfill`) — that script
// migrates the old production database and is never part of setup.
export function runSeed(env, { agentMode = false } = {}) {
  process.stdout.write(agentMode ? "Seeding sample data + agent accounts...\n" : "Seeding sample data...\n");
  must("pnpm", ["--filter", "@kytelink/seed", "seed"], { ...env, AGENT_MODE: agentMode ? "true" : "false" });
}

async function ask(rl, question, fallback) {
  if (fallback === undefined) return (await rl.question(question)).trim();
  const suffix = fallback ? " (Y/n) " : " (y/N) ";
  const answer = (await rl.question(`${question}${suffix}`)).trim().toLowerCase();
  if (answer === "") return fallback;
  return answer.startsWith("y");
}

export function buildEnvContent(choices) {
  let content = readFileSync(join(root, ".env.example"), "utf8");
  content = setKey(content, "AUTH_SECRET", randomBytes(32).toString("hex"));
  content = setKey(content, "INTERNAL_API_SECRET", randomBytes(32).toString("hex"));
  if (choices.adminEmail) content = setKey(content, "ADMIN_EMAILS", choices.adminEmail);
  if (choices.databaseUrl) {
    content = setKey(content, "DATABASE_URL", choices.databaseUrl);
    content = setKey(content, "DIRECT_URL", choices.directUrl || choices.databaseUrl);
    content = setKey(content, "REDIS_URL", choices.redisUrl);
  }
  if (!choices.analytics) {
    content = setKey(content, "CLICKHOUSE_URL", "");
    content = setKey(content, "CLICKHOUSE_PASSWORD", "");
  }
  if (!choices.uploads) {
    for (const key of ["AWS_ENDPOINT_URL", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET", "NEXT_PUBLIC_CDN_URL"]) {
      content = setKey(content, key, "");
    }
  }
  if (!choices.email) {
    content = setKey(content, "EMAIL_PROVIDER", "console");
  }
  const profiles = [
    choices.dockerCore ? "core" : null,
    choices.analytics ? "analytics" : null,
    choices.uploads ? "uploads" : null,
    choices.email ? "email" : null,
  ].filter(Boolean);
  return setKey(content, "COMPOSE_PROFILES", profiles.join(","));
}

async function collectChoices(flags) {
  const defaults = {
    dockerCore: true,
    databaseUrl: "",
    directUrl: "",
    redisUrl: "",
    analytics: true,
    uploads: true,
    email: true,
    seed: !flags.has("--no-seed"),
    adminEmail: "",
  };
  if (flags.has("--all") || flags.has("--yes")) return defaults;
  if (flags.has("--minimal")) return { ...defaults, analytics: false, uploads: false, email: false };

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write(
      [
        "",
        "🪁 Kytelink setup",
        "=================",
        "Postgres + Redis are required — everything else is optional and the app",
        "degrades gracefully without it (see SELF-HOSTING.md). Enter accepts the default.",
        "",
      ].join("\n"),
    );
    const choices = { ...defaults };
    choices.dockerCore = await ask(rl, "Run Postgres + Redis in Docker for you?", true);
    if (!choices.dockerCore) {
      choices.databaseUrl = await ask(rl, "  Postgres connection string: ");
      choices.directUrl = await ask(rl, "  Unpooled Postgres URL for migrations (Enter = same): ");
      choices.redisUrl = await ask(rl, "  Redis connection string: ");
      if (!choices.databaseUrl || !choices.redisUrl) {
        process.stderr.write("✗ Postgres and Redis are required — Kytelink cannot run without them.\n");
        process.exit(1);
      }
    }
    choices.analytics = await ask(rl, "Enable analytics? (runs ClickHouse in Docker)", true);
    choices.uploads = await ask(rl, "Enable image uploads? (runs MinIO in Docker)", true);
    choices.email = await ask(rl, "Catch outgoing email in a local inbox? (runs mailpit in Docker)", true);
    choices.seed = await ask(rl, "Seed sample data? (demo kytes + orgs, recommended)", true);
    choices.adminEmail = await ask(rl, "Your email for admin access (Enter to skip): ");
    return choices;
  } finally {
    rl.close();
  }
}

async function main() {
  const flags = new Set(process.argv.slice(2));
  const interactive = !flags.has("--all") && !flags.has("--yes") && !flags.has("--minimal");
  const envPath = join(root, ".env");

  if (existsSync(envPath)) {
    let regenerate = false;
    if (interactive) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        process.stdout.write("Found an existing .env.\n");
        const keep = await ask(rl, "Keep it and just start services + migrate + seed?", true);
        regenerate = !keep;
      } finally {
        rl.close();
      }
    }
    if (!regenerate) {
      const env = parseEnvFile(envPath);
      if (!(await ensureInfra(env))) process.exit(1);
      runMigrations(env);
      if (!flags.has("--no-seed")) runSeed(env);
      printDone();
      return;
    }
    const backup = join(root, `.env.bak-${Date.now()}`);
    copyFileSync(envPath, backup);
    process.stdout.write(`Backed up the old file to ${backup}\n`);
  }

  const choices = await collectChoices(flags);
  writeFileSync(envPath, buildEnvContent(choices));
  process.stdout.write("\n✓ Wrote .env (with freshly generated secrets)\n");

  const env = parseEnvFile(envPath);
  if (!(await ensureInfra(env))) process.exit(1);
  runMigrations(env);
  if (choices.seed) runSeed(env);
  printDone();
}

function printDone() {
  process.stdout.write(
    [
      "",
      "✓ Setup complete. Start everything with:",
      "",
      "    pnpm dev",
      "",
      "  web     http://localhost:3000",
      "  landing http://localhost:3001",
      "  admin   http://localhost:3002",
      "  api     http://localhost:3003",
      "",
    ].join("\n"),
  );
}

const isEntryPoint = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntryPoint) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { ALL_PROFILES };

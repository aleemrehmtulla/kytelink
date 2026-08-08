import { getDb } from "@kytelink/db";
import { parseBoolEnv } from "@kytelink/schemas";
import { runSeed, type SeedSummary } from "./seed-run";
import { seedAgentAccounts } from "./agent-accounts";

export function buildSeedPlan(env: NodeJS.ProcessEnv): string[] {
  const agentMode = parseBoolEnv(env.AGENT_MODE);
  const plan = [
    "[seed] base fixtures: 20 kytes across the agency demo org and personal orgs",
    `[seed] AGENT_MODE=${String(agentMode)}`,
  ];
  if (agentMode) {
    plan.push("[seed] also seeding agent@kytelink.dev and agent-admin@kytelink.dev");
  }
  return plan;
}

function printSummary(summary: SeedSummary): void {
  for (const [key, value] of Object.entries(summary)) {
    console.log(`[seed] ${key}: ${value}`);
  }
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres", "host.docker.internal"]);

export function isLocalDatabase(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

// This seed writes demo orgs, `*.demo` users and (in agent mode) a login
// bypass account. A production database must never receive any of it, and the
// only thing standing between `pnpm run setup` and prod is which DATABASE_URL
// happens to be exported — so refuse anything that is not plainly local.
export function assertSeedTarget(env: NodeJS.ProcessEnv): void {
  if (parseBoolEnv(env.SEED_ALLOW_REMOTE)) return;
  if (isLocalDatabase(env.DATABASE_URL)) return;
  const host = env.DATABASE_URL ? new URL(env.DATABASE_URL).hostname : "<DATABASE_URL unset>";
  throw new Error(
    `refusing to seed sample data into a non-local database (${host}). This seed writes demo ` +
      "orgs and *.demo users that must never reach production. The v1→v2 production migration is " +
      "`pnpm migrate:prod`, not this. Set SEED_ALLOW_REMOTE=true only for a throwaway remote dev database.",
  );
}

async function main(): Promise<void> {
  assertSeedTarget(process.env);
  const db = getDb();
  for (const line of buildSeedPlan(process.env)) {
    console.log(line);
  }
  try {
    const summary = await runSeed(db);
    if (parseBoolEnv(process.env.AGENT_MODE)) {
      await seedAgentAccounts(db);
    }
    printSummary(summary);
    console.log("[seed] done");
  } finally {
    await db.$disconnect();
  }
}

const isEntryPoint =
  process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isEntryPoint) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

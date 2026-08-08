import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvFile, resolveEnvFilePath } from "./env-file";
import {
  BackfillConfigError,
  loadConfig,
  adminInstanceUrl,
  describeDatabase,
  readProfile,
  LEGACY_FIXTURE_DB,
  TARGET_DB,
} from "./config";
import { createDatabase, dropDatabase, ensureReadonlyRole } from "./db-admin";
import { applyDeltaEdits, applySchema, loadFixture } from "./fixture-loader";
import { LegacySource } from "./legacy-source";
import { createTargetClient } from "./target-client";
import { Checkpoint } from "./checkpoint";
import { createStubSeams, type InMemoryAssetStore, type MigrationSeams } from "./seams";
import { createRealSeams, RealAssetSeamConfigError } from "./real-seams";
import { Backfill, type AssetRecord, type BackfillMode, type BackfillReport } from "./backfill";
import { verify, type VerificationReport } from "./verify";
import { runPreflight, type PreflightReport } from "./preflight";
import { purgeTestData, scanTestData } from "./test-data";

const V2_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
const DB_DIR = join(V2_ROOT, "packages", "db");
const DB_SCHEMA = join(DB_DIR, "prisma", "schema.prisma");

// Subcommands that create, load or destroy the synthetic scratch databases.
// Running any of them with the prod profile would drop or overwrite real data.
const FIXTURE_ONLY_COMMANDS = new Set(["setup", "fixture", "edit", "reset", "e2e"]);

function log(section: string, message: string): void {
  process.stdout.write(`[${section}] ${message}\n`);
}

function pushTargetSchema(targetUrl: string): void {
  execSync(`pnpm exec prisma db push --schema "${DB_SCHEMA}" --skip-generate --accept-data-loss`, {
    cwd: DB_DIR,
    env: { ...process.env, DATABASE_URL: targetUrl, DIRECT_URL: targetUrl },
    stdio: "inherit",
  });
}

async function cmdSetup(env: NodeJS.ProcessEnv): Promise<void> {
  const config = loadConfig(env);
  const admin = adminInstanceUrl(env);
  log("setup", `creating fixture db ${LEGACY_FIXTURE_DB} and target db ${TARGET_DB}`);
  await createDatabase(admin, LEGACY_FIXTURE_DB);
  await createDatabase(admin, TARGET_DB);
  await applySchema(config.legacyAdminUrl);
  await ensureReadonlyRole(config.legacyAdminUrl, LEGACY_FIXTURE_DB);
  log("setup", "pushing new schema to target db");
  pushTargetSchema(config.targetUrl);
  log("setup", "done");
}

async function cmdFixture(env: NodeJS.ProcessEnv): Promise<void> {
  const config = loadConfig(env);
  const result = await loadFixture(config.legacyAdminUrl);
  log("fixture", JSON.stringify(result));
}

async function cmdEdit(env: NodeJS.ProcessEnv): Promise<void> {
  const config = loadConfig(env);
  const edited = await applyDeltaEdits(config.legacyAdminUrl);
  log("edit", `simulated warm-up-window source edits on: ${edited.join(", ")}`);
}

function printBackfillReport(report: BackfillReport): void {
  log("backfill", `mode=${report.mode.toUpperCase()}/${report.execute ? "EXECUTE" : "DRY-RUN"} changed=${report.changed}`);
  log("backfill", `legacy: ${JSON.stringify(report.legacyCounts)}`);
  log("backfill", `users migrated=${report.users.migrated} quarantined=${report.users.quarantined.length}`);
  for (const entry of report.users.quarantined) log("backfill", `  quarantine user ${entry.userId}: ${entry.reason}`);
  log("backfill", `usernames assigned=${report.usernames.assigned} nulled=${report.usernames.nulled.length} collisions=${report.usernames.collisions.length}`);
  for (const entry of report.usernames.nulled) log("backfill", `  username nulled ${entry.userId} (${entry.original}): ${entry.reason}`);
  for (const entry of report.usernames.collisions) log("backfill", `  username collision ${entry.normalized}: ${entry.userIds.join(", ")}`);
  log("backfill", `kytes total=${report.kytes.total} published=${report.kytes.published} banned=${report.kytes.banned}`);
  log("backfill", `orgs=${report.organizations} orgMembers=${report.orgMembers} domains=${report.domains}`);
  log("backfill", `assets attempted=${report.assets.attempted} ok=${report.assets.succeeded} skipped=${report.assets.skipped} failed=${report.assets.failed.length}`);
  for (const entry of report.assets.failed) log("backfill", `  asset FAILED ${entry.kyteId} ${entry.url}: ${entry.reason}`);
  log("backfill", `dead avatars (null avatar policy): ${report.assets.deadAvatars.join(", ") || "none"}`);
  log("backfill", `content coercions=${report.coercions.length}: ${report.coercions.join(" | ") || "none"}`);
  log("backfill", `link/icon quarantine entries=${report.quarantine.length}`);
  for (const entry of report.quarantine) log("backfill", `  quarantine ${entry.field}[${entry.index}] on ${entry.userId}: ${entry.reason}`);
  log("backfill", `beacon set cardinality=${report.beaconSetSize}`);
}

// Any run that writes data must go through the real image pipeline, so
// `--execute` forces the real seams. `--real-assets` opts a dry-run into them
// (to validate fetch+normalize without touching the DB) and `--stub-assets`
// forces the networkless fixture stub back on.
function selectSeamsMode(execute: boolean, env: NodeJS.ProcessEnv): "real" | "stub" {
  const argv = process.argv;
  if (argv.includes("--stub-assets")) {
    if (readProfile(env) === "prod") {
      throw new BackfillConfigError(
        "--stub-assets fabricates image bytes and must never touch production data.",
      );
    }
    return "stub";
  }
  if (execute || argv.includes("--real-assets")) return "real";
  return "stub";
}

async function acquireSeams(
  env: NodeJS.ProcessEnv,
  execute: boolean,
): Promise<{ seams: MigrationSeams; purge?: () => Promise<number>; close: () => Promise<void> }> {
  const mode = selectSeamsMode(execute, env);
  if (mode === "stub") {
    log("backfill", "asset seams: STUB (fixture bytes, no network/S3/Redis) — pass --execute or --real-assets for the real pipeline");
    return { seams: createStubSeams(), close: async () => {} };
  }
  log("backfill", "asset seams: REAL (sharp-normalize + SSRF-guarded fetch + S3 + Redis)");
  try {
    const real = createRealSeams(env);
    return { seams: real, purge: real.purgeReadCaches, close: real.close };
  } catch (error) {
    if (error instanceof RealAssetSeamConfigError) {
      log("backfill", `ERROR: ${error.message}`);
    }
    throw error;
  }
}

async function runBackfill(env: NodeJS.ProcessEnv, execute: boolean, mode: BackfillMode): Promise<void> {
  const config = loadConfig(env);
  const source = new LegacySource(config.legacyReadonlyUrl);
  const db = createTargetClient(config.targetUrl);
  const checkpoint = new Checkpoint(config.checkpointDir);
  const { seams, purge, close: closeSeams } = await acquireSeams(env, execute);
  try {
    log("backfill", `profile=${config.profile} source=${describeDatabase(config.legacyReadonlyUrl)} target=${describeDatabase(config.targetUrl)}`);
    log("backfill", `cdn=${config.cdnBaseUrl} state=${config.checkpointDir}`);
    await source.assertReadOnly();
    log("backfill", "source connection verified read-only (probe INSERT rejected)");
    const snapshot = await source.read();
    log("backfill", `read v1: ${snapshot.users.length} users, ${snapshot.accounts.length} accounts, ${snapshot.drafts.length} drafts, ${snapshot.prods.length} published, ${snapshot.domains.length} domains`);
    const backfill = new Backfill(db, checkpoint, seams, config.cdnBaseUrl, config.adminEmails);
    const crashAfterKytes = env.BACKFILL_CRASH_AFTER ? Number(env.BACKFILL_CRASH_AFTER) : undefined;
    const phaseStart = new Map<string, number>();
    const report = await backfill.run(snapshot, execute, {
      crashAfterKytes,
      mode,
      onProgress: (phase, done, total) => {
        let start = phaseStart.get(phase);
        if (start === undefined) {
          start = Date.now();
          phaseStart.set(phase, start);
        }
        const elapsed = (Date.now() - start) / 1000;
        const rate = done / Math.max(elapsed, 0.001);
        const etaMin = rate > 0 ? (total - done) / rate / 60 : 0;
        log("backfill", `${phase} ${done}/${total} (${rate.toFixed(1)}/s, ~${etaMin.toFixed(1)} min left in this phase)`);
      },
    });
    await mkdir(config.manifestDir, { recursive: true });
    await writeFile(join(config.manifestDir, "quarantine.jsonl"), report.quarantine.map((entry) => JSON.stringify(entry)).join("\n"), "utf8");
    await writeFile(join(config.manifestDir, "assets-failed.jsonl"), report.assets.failed.map((entry) => JSON.stringify(entry)).join("\n"), "utf8");
    printBackfillReport(report);
    if (execute && purge) {
      const removed = await purge();
      log("backfill", `purged ${String(removed)} stale profile:*/domain:* cache entries`);
      log(
        "backfill",
        "NOTE apps/web caches profiles with getStaticProps and no revalidate — build/deploy it " +
          "AFTER this run, or its on-disk page cache will keep serving pre-migration HTML.",
      );
    }
  } finally {
    await closeSeams();
    await source.close();
    await db.$disconnect();
  }
}

function printVerificationReport(report: VerificationReport): void {
  log("verify", `RESULT: ${report.pass ? "100% PASS" : "FAIL"}`);
  for (const check of report.checks) {
    log("verify", `[${check.pass ? "PASS" : "FAIL"}] ${check.name}: ${check.detail}`);
  }
  log("verify", "counts (old / expected / actual):");
  for (const [name, value] of Object.entries(report.counts)) {
    log("verify", `  ${name}: old=${value.old} expected=${value.expected} actual=${value.actual} ${value.pass ? "OK" : "MISMATCH"}`);
  }
  log("verify", `checksum mismatches: ${report.checksumMismatches.join(", ") || "none"}`);
  log("verify", `assets verified=${report.assets.verified} failed-list=${report.assets.failedList} missing-rows=${report.assets.missingRows.length} size-mismatch=${report.assets.sizeMismatches.length}`);
  log("verify", `visual-diff manifest entries=${report.manifestEntries}`);
}

function rehydrateStore(store: InMemoryAssetStore, assetMap: Record<string, AssetRecord>): void {
  for (const record of Object.values(assetMap)) {
    if (record.status === "ok" && record.key && record.sizeBytes && record.contentType) {
      void store.put(record.key, new Uint8Array(record.sizeBytes), record.contentType);
    }
  }
}

async function runVerify(env: NodeJS.ProcessEnv, live: boolean): Promise<boolean> {
  const config = loadConfig(env);
  const source = new LegacySource(config.legacyReadonlyUrl);
  const db = createTargetClient(config.targetUrl);
  const checkpoint = new Checkpoint(config.checkpointDir);
  const seams = createStubSeams();
  // --live swaps the checkpoint-rehydrated store and beacon for the real bucket
  // and the real Redis, so "assets" becomes a live HeadObject per object and
  // "beacon-set" a live SCAN. That is gap G1 in LAUNCH-RUNBOOK.md closed.
  const real = live ? createRealSeams(env) : null;
  try {
    const snapshot = await source.read();
    const assetMap = await checkpoint.readJson<Record<string, AssetRecord>>("assets-map", {});
    rehydrateStore(seams.store, assetMap);
    const beaconEntries = await checkpoint.readJson<{ username: string; kyteId: string }[]>("beacon", []);
    for (const entry of beaconEntries) await seams.beacon.add(entry.username, entry.kyteId);
    log("verify", live ? "asset + beacon checks: LIVE (real bucket HEAD, real Redis SCAN)" : "asset + beacon checks: checkpoint-derived (pass --live for real bucket/Redis)");
    const { report, manifest } = await verify({
      db,
      snapshot,
      checkpoint,
      store: real?.store ?? seams.store,
      beacon: real?.beacon ?? seams.beacon,
      adminEmails: config.adminEmails,
      cdnBaseUrl: config.cdnBaseUrl,
      stagingBaseUrl: env.STAGING_BASE_URL ?? "https://staging.kytelink.com",
    });
    await mkdir(config.manifestDir, { recursive: true });
    await writeFile(join(config.manifestDir, "visual-diff-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    printVerificationReport(report);
    return report.pass;
  } finally {
    if (real) await real.close();
    await source.close();
    await db.$disconnect();
  }
}

function printPreflightReport(report: PreflightReport): void {
  const order: Record<string, number> = { blocker: 0, launch: 1, info: 2 };
  for (const check of [...report.checks].sort((a, b) => order[a.severity]! - order[b.severity]!)) {
    const mark = check.severity === "info" ? "····" : check.pass ? "PASS" : check.severity === "blocker" ? "FAIL" : "WARN";
    log("preflight", `[${mark}] ${check.name}: ${check.detail}`);
  }
  const warnings = report.checks.filter((check) => check.severity === "launch" && !check.pass).length;
  log("preflight", `RESULT: ${report.pass ? "READY TO SEED" : "BLOCKED"}`);
  if (warnings > 0) {
    log(
      "preflight",
      `${String(warnings)} WARN above are launch-day concerns (app serving config), not migration blockers — ` +
        "the seed does not read them. Fix them before the DNS flip.",
    );
  }
}

async function cmdPreflight(env: NodeJS.ProcessEnv): Promise<boolean> {
  const config = loadConfig(env);
  log("preflight", `profile=${config.profile} source=${describeDatabase(config.legacyReadonlyUrl)} target=${describeDatabase(config.targetUrl)}`);
  const report = await runPreflight(config, env);
  printPreflightReport(report);
  return report.pass;
}

async function cmdPurgeTestData(env: NodeJS.ProcessEnv): Promise<void> {
  const config = loadConfig(env);
  const db = createTargetClient(config.targetUrl);
  try {
    const scan = await scanTestData(db);
    log("purge", `target=${describeDatabase(config.targetUrl)}`);
    for (const user of scan.users) log("purge", `  user ${user.id} <${user.email}>`);
    for (const org of scan.organizations) log("purge", `  org ${org.id} (${org.name})`);
    for (const kyte of scan.kytes) log("purge", `  kyte ${kyte.id} (${kyte.username ?? "no username"})`);
    if (scan.total === 0) {
      log("purge", "nothing to purge — no sample-seed or agent-mode rows found");
      return;
    }
    if (!process.argv.includes("--yes")) {
      log("purge", `${String(scan.total)} rows would be deleted. Re-run with --yes to delete them.`);
      return;
    }
    await purgeTestData(db, scan);
    const after = await scanTestData(db);
    log("purge", `deleted ${String(scan.total)} rows; ${String(after.total)} remain`);
  } finally {
    await db.$disconnect();
  }
}

async function cmdReset(env: NodeJS.ProcessEnv): Promise<void> {
  const config = loadConfig(env);
  const admin = adminInstanceUrl(env);
  await checkpointReset(config.checkpointDir);
  await dropDatabase(admin, LEGACY_FIXTURE_DB);
  await dropDatabase(admin, TARGET_DB);
  log("reset", "dropped fixture + target databases and cleared checkpoints");
}

async function checkpointReset(dir: string): Promise<void> {
  await new Checkpoint(dir).reset();
}

async function main(): Promise<void> {
  const envFilePath = resolveEnvFilePath(process.argv, process.env);
  if (envFilePath) {
    const loaded = loadEnvFile(envFilePath);
    log("env", `loaded ${String(loaded.keys.length)} variables from ${loaded.path}`);
  }

  const command = process.argv[2] ?? "help";
  const execute = process.argv.includes("--execute");
  const mode: BackfillMode = process.argv.includes("--delta") ? "delta" : "full";
  const env = process.env;

  if (readProfile(env) === "prod" && FIXTURE_ONLY_COMMANDS.has(command)) {
    throw new BackfillConfigError(
      `"${command}" creates, loads or drops the synthetic scratch databases and is fixture-only. ` +
        "It is refused under BACKFILL_PROFILE=prod.",
    );
  }

  switch (command) {
    case "setup":
      await cmdSetup(env);
      break;
    case "fixture":
      await cmdFixture(env);
      break;
    case "edit":
      await cmdEdit(env);
      break;
    case "preflight": {
      const pass = await cmdPreflight(env);
      if (!pass) process.exitCode = 1;
      break;
    }
    case "purge-test-data":
      await cmdPurgeTestData(env);
      break;
    case "backfill":
      await runBackfill(env, execute, mode);
      break;
    case "verify": {
      const pass = await runVerify(env, process.argv.includes("--live"));
      if (!pass) process.exitCode = 1;
      break;
    }
    case "reset":
      await cmdReset(env);
      break;
    case "e2e": {
      await cmdSetup(env);
      await cmdFixture(env);
      await runBackfill(env, true, "full");
      const pass = await runVerify(env, false);
      if (!pass) process.exitCode = 1;
      break;
    }
    default:
      log(
        "help",
        "commands: preflight | purge-test-data [--yes] | backfill [--execute] [--delta] [--real-assets] [--stub-assets] | " +
          "verify [--live] | setup | fixture | edit | e2e | reset\n" +
          "         global: --env-file <path> (or ENV_FILE=<path>) loads a dotenv file without overriding exported vars",
      );
  }
}

main().catch((error) => {
  if (error instanceof BackfillConfigError) {
    process.stderr.write(`\n✗ ${error.message}\n\n`);
    process.exit(1);
  }
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});

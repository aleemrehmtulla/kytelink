import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const STEPS = {
  preflight: "Validate env, both databases, Redis, R2 and the CDN; refuse if the target holds sample-seed rows",
  schema: "Apply the v2 Prisma migrations + ClickHouse migrations, and push owned CDN assets to R2",
  "purge-test-data": "Delete sample-seed / agent-mode rows from the target (add --yes to actually delete)",
  seed: "Full backfill from v1 into the target: users, orgs, kytes, published, domains, accounts, images",
  sweep: "Moderation seed sweep over every seeded published kyte",
  verify: "The launch gate — must print RESULT: 100% PASS",
  gallery: "Build the old-vs-new visual diff gallery for eyeballing",
  delta: "Cutover re-copy of only the rows that changed since the warm-up seed",
  domains:
    "Register migrated custom domains on the Vercel project (dry run; --yes to apply, --reap to also delete the ones whose DNS is wrong)",
};

const ALL_SEQUENCE = ["schema", "preflight", "seed", "sweep", "verify"];
const CUTOVER_SEQUENCE = ["delta", "sweep", "verify"];

function usage() {
  const width = Math.max(...Object.keys(STEPS).map((name) => name.length));
  process.stdout.write(
    [
      "",
      "  pnpm migrate:prod <step> [flags]",
      "",
      ...Object.entries(STEPS).map(([name, detail]) => `    ${name.padEnd(width)}  ${detail}`),
      `    ${"all".padEnd(width)}  the whole migration: ${ALL_SEQUENCE.join(" → ")}`,
      `    ${"cutover".padEnd(width)}  runs: ${CUTOVER_SEQUENCE.join(" → ")}`,
      "",
      "  Flags:",
      "    --env-file <path>   default: v2/.env.PROD",
      "    --yes               required by purge-test-data before it deletes",
      "",
      "  Every step reads .env.PROD. See LAUNCH-RUNBOOK.md for the full cutover order.",
      "",
    ].join("\n"),
  );
}

function resolveEnvFile(argv) {
  const index = argv.indexOf("--env-file");
  const raw = index >= 0 ? argv[index + 1] : (process.env.ENV_FILE ?? ".env.PROD");
  return isAbsolute(raw) ? raw : join(root, raw);
}

const softFailures = [];

function run(label, command, args, options = {}) {
  process.stdout.write(`\n─── ${label}\n    ${command} ${args.join(" ")}\n\n`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    stdio: "inherit",
    env: { ...process.env, ...(options.env ?? {}) },
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    if (options.optional) {
      process.stderr.write(`\n⚠ ${label} failed (exit ${String(result.status)}) — ${options.optional}\n`);
      softFailures.push(label);
      return;
    }
    process.stderr.write(`\n✗ ${label} failed (exit ${String(result.status)}).\n`);
    process.exit(result.status ?? 1);
  }
}

function reportSoftFailures() {
  if (softFailures.length === 0) return;
  process.stdout.write(
    `\n⚠ finished, but these optional steps did not succeed: ${softFailures.join(", ")}\n` +
      "  Re-run each on its own once fixed.\n\n",
  );
}

function backfill(envFile, args) {
  return ["--filter", "@kytelink/seed", "exec", "tsx", "src/legacy-backfill/cli.ts", ...args, "--env-file", envFile];
}

function stepSchema(envFile, env) {
  run("prisma migrate deploy → target", "pnpm", [
    "--filter",
    "@kytelink/db",
    "exec",
    "prisma",
    "migrate",
    "deploy",
    "--schema",
    "prisma/schema.prisma",
  ], { env: { DATABASE_URL: env.TARGET_DATABASE_URL, DIRECT_URL: env.TARGET_DATABASE_URL } });

  if (env.CLICKHOUSE_URL) {
    run("clickhouse migrate", "pnpm", ["--filter", "@kytelink/clickhouse", "migrate"], {
      optional:
        "analytics tables were NOT created. No migrated data is affected; new analytics will not " +
        "record until this is fixed. Re-run with `pnpm migrate:prod schema` once the credentials are right.",
    });
  } else {
    process.stdout.write("\n─── clickhouse migrate skipped (CLICKHOUSE_URL unset)\n");
  }

  // The owned static assets (fonts, og furniture, theme art) live under
  // `static/*` in the same bucket the migrated user images go into. Without this
  // the profiles render with missing chrome even though every user asset copied
  // across fine.
  run("cdn assets → R2", "pnpm", [
    "--filter",
    "@kytelink/cdn",
    "exec",
    "s3-syncer",
    "sync",
    "--env-file",
    envFile,
  ]);
}

function main() {
  const argv = process.argv.slice(2);
  const step = argv[0];
  if (!step || step === "help" || step === "--help") {
    usage();
    process.exit(step ? 0 : 1);
  }

  const envFile = resolveEnvFile(argv);
  if (!existsSync(envFile)) {
    process.stderr.write(`\n✗ env file not found: ${envFile}\n  Pass --env-file <path> or create v2/.env.PROD.\n\n`);
    process.exit(1);
  }
  loadDotenv({ path: envFile, override: false, quiet: true });

  // Assigning undefined to a process.env key stores the string "undefined",
  // which would sail past every later presence check.
  const alias = (key, value) => {
    if (!process.env[key] && value) process.env[key] = value;
  };

  // The prod profile makes tools/seed's config refuse to derive scratch database
  // names off DATABASE_URL, and makes the fixture subcommands unavailable.
  process.env.BACKFILL_PROFILE = "prod";
  alias("TARGET_DATABASE_URL", process.env.DATABASE_URL);
  alias("LEGACY_READONLY_URL", process.env.LEGACY_DATABASE_URL);
  process.env.AGENT_MODE = "false";

  if (!process.env.TARGET_DATABASE_URL) {
    process.stderr.write(`\n✗ ${envFile} has no DATABASE_URL (the v2 production Postgres).\n\n`);
    process.exit(1);
  }
  if (!process.env.LEGACY_READONLY_URL && step !== "schema") {
    process.stderr.write(
      [
        "",
        `✗ No v1 connection string. Add one to ${envFile}:`,
        "",
        "      LEGACY_DATABASE_URL=postgresql://…   # the OLD kytelink production database",
        "",
        "  The source pool is pinned read-only at the session level and every run",
        "  proves it with a rolled-back probe INSERT, so the owner connection string",
        "  is safe to use here.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  const env = process.env;
  process.stdout.write(
    [
      "",
      `  env file  ${envFile}`,
      `  source    ${describe(env.LEGACY_READONLY_URL)} (v1, read-only)`,
      `  target    ${describe(env.TARGET_DATABASE_URL)} (v2)`,
      `  bucket    ${env.AWS_S3_BUCKET ?? "<unset>"} @ ${env.AWS_ENDPOINT_URL ?? "<unset>"}`,
      `  cdn       ${env.NEXT_PUBLIC_CDN_URL ?? "<unset>"}`,
      `  state     ${env.BACKFILL_STATE_DIR || "./.backfill-state (relative — set BACKFILL_STATE_DIR)"}`,
      "",
    ].join("\n"),
  );

  runStep(step, envFile, env, argv);
  reportSoftFailures();
}

function describe(url) {
  if (!url) return "<unset>";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

function runStep(step, envFile, env, argv) {
  switch (step) {
    case "preflight":
      run("preflight", "pnpm", backfill(envFile, ["preflight"]));
      break;
    case "schema":
      stepSchema(envFile, env);
      break;
    case "purge-test-data":
      run("purge test data", "pnpm", backfill(envFile, ["purge-test-data", ...(argv.includes("--yes") ? ["--yes"] : [])]));
      break;
    case "seed":
      run("full backfill", "pnpm", backfill(envFile, ["backfill", "--execute"]));
      break;
    case "delta":
      run("delta backfill", "pnpm", backfill(envFile, ["backfill", "--execute", "--delta"]));
      break;
    case "sweep":
      run("moderation seed sweep", "pnpm", ["--filter", "@kytelink/api", "seed-sweep"]);
      break;
    case "verify":
      run("verify (launch gate)", "pnpm", backfill(envFile, ["verify", "--live"]));
      break;
    // Deliberately not in ALL_SEQUENCE: it reaches outside the migration into
    // the Vercel account, and --reap deletes. Run it yourself, after verify.
    case "domains":
      run("custom domains → vercel", "pnpm", [
        "--filter",
        "@kytelink/seed",
        "exec",
        "tsx",
        "src/legacy-backfill/domains-cli.ts",
        ...(argv.includes("--yes") ? ["--yes"] : []),
        ...(argv.includes("--reap") ? ["--reap"] : []),
        "--env-file",
        envFile,
      ]);
      break;
    case "gallery":
      run("visual diff gallery", "pnpm", [
        "--filter",
        "@kytelink/seed",
        "exec",
        "tsx",
        "src/legacy-backfill/build-visual-diff-gallery.manual.ts",
        "--env-file",
        envFile,
      ]);
      break;
    case "all":
      for (const name of ALL_SEQUENCE) runStep(name, envFile, env, argv);
      break;
    case "cutover":
      for (const name of CUTOVER_SEQUENCE) runStep(name, envFile, env, argv);
      break;
    default:
      process.stderr.write(`\n✗ unknown step "${step}"\n`);
      usage();
      process.exit(1);
  }
}

main();

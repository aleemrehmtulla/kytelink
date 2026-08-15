import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join } from "node:path";
import { parse as parseDotenv } from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  process.stdout.write(
    [
      "",
      "  Prisma schema migrations for the Kytelink Postgres.",
      "",
      "  pnpm db:migrate <name>    create + apply a migration on the LOCAL database",
      "  pnpm db:deploy            apply committed migrations to the LOCAL database",
      "  pnpm db:status            show local migration status",
      "  pnpm db:status:prod       show PRODUCTION migration status (reads .env.PROD)",
      "  pnpm db:deploy:prod       apply committed migrations to PRODUCTION",
      "                            (prints the target + status, then asks you to type \"deploy\";",
      "                             --yes skips the prompt, --env <path> overrides .env.PROD)",
      "",
      "  Not this script: `pnpm migrate:prod` is the founder-only one-time v1→v2 DATA migration.",
      "",
    ].join("\n"),
  );
}

function loadEnvFile(path, label) {
  if (!existsSync(path)) {
    process.stderr.write(`\n✗ ${label} not found at ${path}\n`);
    process.exit(1);
  }
  return parseDotenv(readFileSync(path, "utf8"));
}

function maskedDbUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username || "?"}:•••@${u.host}${u.pathname}`;
  } catch {
    return "(DATABASE_URL did not parse as a URL)";
  }
}

function prisma(args, databaseUrl) {
  return spawnSync("pnpm", ["--filter", "@kytelink/db", "exec", "prisma", ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    shell: process.platform === "win32",
  });
}

function mustPrisma(args, databaseUrl) {
  const result = prisma(args, databaseUrl);
  if (result.status !== 0) {
    process.stderr.write(`\n✗ prisma ${args.join(" ")} failed (exit ${String(result.status)}).\n`);
    process.exit(result.status ?? 1);
  }
}

const argv = process.argv.slice(2);
const command = argv[0];
const prod = argv.includes("--prod");
const yes = argv.includes("--yes");
const envFileIndex = argv.indexOf("--env");
const envFileArg = envFileIndex >= 0 ? argv[envFileIndex + 1] : ".env.PROD";
const envFile = isAbsolute(envFileArg) ? envFileArg : join(root, envFileArg);

if (!["migrate", "deploy", "status"].includes(command ?? "")) {
  usage();
  process.exit(command ? 1 : 0);
}

let databaseUrl;
if (prod) {
  databaseUrl = loadEnvFile(envFile, "prod env file").DATABASE_URL;
  if (!databaseUrl) {
    process.stderr.write(`\n✗ ${envFile} has no DATABASE_URL.\n`);
    process.exit(1);
  }
} else {
  databaseUrl = loadEnvFile(join(root, ".env"), ".env (run `pnpm run setup` first)").DATABASE_URL;
  if (!databaseUrl) {
    process.stderr.write("\n✗ .env has no DATABASE_URL — run `pnpm run setup`.\n");
    process.exit(1);
  }
}

if (command === "status") {
  process.stdout.write(`\nMigration status for ${prod ? "PRODUCTION" : "local"}: ${maskedDbUrl(databaseUrl)}\n\n`);
  // status exits non-zero when migrations are pending; that is information, not failure.
  const result = prisma(["migrate", "status", "--schema", "prisma/schema.prisma"], databaseUrl);
  process.exit(result.status ?? 0);
}

if (command === "migrate") {
  if (prod) {
    process.stderr.write(
      "\n✗ `migrate dev` can reset a database and is never run against production.\n" +
        "  Create the migration locally (`pnpm db:migrate <name>`), commit it, then apply it\n" +
        "  with `pnpm db:deploy:prod`.\n",
    );
    process.exit(1);
  }
  const name = argv.slice(1).find((arg) => !arg.startsWith("--"));
  if (!name) {
    process.stderr.write('\n✗ Name the migration: pnpm db:migrate "add-thing-to-kyte"\n');
    process.exit(1);
  }
  mustPrisma(["migrate", "dev", "--name", name, "--schema", "prisma/schema.prisma"], databaseUrl);
  process.exit(0);
}

if (!prod) {
  mustPrisma(["migrate", "deploy", "--schema", "prisma/schema.prisma"], databaseUrl);
  process.exit(0);
}

process.stdout.write(`\nTarget: PRODUCTION ${maskedDbUrl(databaseUrl)}\n\n`);
prisma(["migrate", "status", "--schema", "prisma/schema.prisma"], databaseUrl);

if (!yes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('\nType "deploy" to apply the pending migrations to PRODUCTION: ');
  rl.close();
  if (answer.trim() !== "deploy") {
    process.stdout.write("\nAborted — nothing was applied.\n");
    process.exit(1);
  }
}

mustPrisma(["migrate", "deploy", "--schema", "prisma/schema.prisma"], databaseUrl);
process.stdout.write("\n✓ Production schema is up to date.\n");

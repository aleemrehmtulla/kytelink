import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { ClickHouseClient } from "@clickhouse/client";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const MIGRATION_TABLE = "_migrations";

export interface MigrationResult {
  name: string;
  applied: boolean;
}

function splitStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await readdir(MIGRATIONS_DIR);
  return entries.filter((name) => name.endsWith(".sql")).sort();
}

async function ensureMigrationTable(client: ClickHouseClient): Promise<void> {
  await client.command({
    query: `CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (name String, applied_at DateTime DEFAULT now()) ENGINE = MergeTree ORDER BY name`,
  });
}

async function readAppliedMigrations(client: ClickHouseClient): Promise<Set<string>> {
  const result = await client.query({
    query: `SELECT name FROM ${MIGRATION_TABLE}`,
    format: "JSONEachRow",
  });
  const rows = await result.json<{ name: string }>();
  return new Set(rows.map((row) => row.name));
}

export async function runMigrations(client: ClickHouseClient): Promise<MigrationResult[]> {
  await ensureMigrationTable(client);
  const applied = await readAppliedMigrations(client);
  const files = await listMigrationFiles();
  const results: MigrationResult[] = [];

  for (const name of files) {
    if (applied.has(name)) {
      results.push({ name, applied: false });
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, name), "utf8");
    for (const statement of splitStatements(sql)) {
      await client.command({ query: statement });
    }
    await client.insert({
      table: MIGRATION_TABLE,
      values: [{ name }],
      format: "JSONEachRow",
    });
    results.push({ name, applied: true });
  }

  return results;
}

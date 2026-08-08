import { createRawClient } from "./client";
import { readClickhouseConfig } from "./config";
import { runMigrations } from "./migrate";

async function main(): Promise<void> {
  const config = readClickhouseConfig();
  if (!config) {
    process.stdout.write("CLICKHOUSE_URL unset — analytics capability off, nothing to migrate.\n");
    return;
  }

  const client = createRawClient(config);
  try {
    const results = await runMigrations(client);
    for (const result of results) {
      process.stdout.write(`${result.applied ? "applied" : "skipped"}  ${result.name}\n`);
    }
    const tables = await client.query({
      query: "SHOW TABLES",
      format: "JSONEachRow",
    });
    const rows = await tables.json<{ name: string }>();
    process.stdout.write(`\ntables:\n${rows.map((row) => `  ${row.name}`).join("\n")}\n`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

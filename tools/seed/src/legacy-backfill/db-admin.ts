import { Client } from "pg";
import {
  LEGACY_READONLY_PASSWORD,
  LEGACY_READONLY_ROLE,
} from "./config";

function quoteIdent(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`unsafe identifier: ${name}`);
  return `"${name}"`;
}

async function withClient<T>(url: string, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

export async function databaseExists(adminUrl: string, name: string): Promise<boolean> {
  return withClient(adminUrl, async (client) => {
    const result = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists",
      [name],
    );
    return result.rows[0]?.exists ?? false;
  });
}

export async function createDatabase(adminUrl: string, name: string): Promise<void> {
  if (await databaseExists(adminUrl, name)) return;
  await withClient(adminUrl, async (client) => {
    await client.query(`CREATE DATABASE ${quoteIdent(name)}`);
  });
}

export async function dropDatabase(adminUrl: string, name: string): Promise<void> {
  if (!(await databaseExists(adminUrl, name))) return;
  await withClient(adminUrl, async (client) => {
    await client.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [name],
    );
    await client.query(`DROP DATABASE IF EXISTS ${quoteIdent(name)}`);
  });
}

export async function ensureReadonlyRole(fixtureUrl: string, databaseName: string): Promise<void> {
  await withClient(fixtureUrl, async (client) => {
    const exists = await client.query<{ exists: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = $1) AS exists",
      [LEGACY_READONLY_ROLE],
    );
    if (!exists.rows[0]?.exists) {
      await client.query(
        `CREATE ROLE ${quoteIdent(LEGACY_READONLY_ROLE)} LOGIN PASSWORD '${LEGACY_READONLY_PASSWORD}'`,
      );
    }
    await client.query(
      `GRANT CONNECT ON DATABASE ${quoteIdent(databaseName)} TO ${quoteIdent(LEGACY_READONLY_ROLE)}`,
    );
    await client.query(`GRANT USAGE ON SCHEMA public TO ${quoteIdent(LEGACY_READONLY_ROLE)}`);
    await client.query(
      `GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${quoteIdent(LEGACY_READONLY_ROLE)}`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${quoteIdent(LEGACY_READONLY_ROLE)}`,
    );
    await client.query(
      `REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM ${quoteIdent(LEGACY_READONLY_ROLE)}`,
    );
  });
}

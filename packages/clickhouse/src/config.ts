export interface ClickhouseConfig {
  url: string;
  username: string;
  password: string;
  database: string;
}

export function readClickhouseConfig(
  env: Record<string, string | undefined> = process.env,
): ClickhouseConfig | null {
  const url = env.CLICKHOUSE_URL;
  if (!url || url.trim().length === 0) return null;
  return {
    url,
    username: env.CLICKHOUSE_USER ?? "default",
    password: env.CLICKHOUSE_PASSWORD ?? "",
    database: env.CLICKHOUSE_DATABASE ?? "default",
  };
}

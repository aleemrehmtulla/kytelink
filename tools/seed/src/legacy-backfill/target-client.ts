import { PrismaClient } from "@kytelink/db";
import { dbConcurrency } from "./backfill";

function withPoolSize(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", String(dbConcurrency() + 4));
    }
    if (!parsed.searchParams.has("pool_timeout")) parsed.searchParams.set("pool_timeout", "30");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function createTargetClient(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: withPoolSize(url) } } });
}

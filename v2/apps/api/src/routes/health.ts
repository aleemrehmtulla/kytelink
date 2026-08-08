import { getClickhouse } from "@kytelink/clickhouse";
import { getDb } from "@kytelink/db";
import type { FastifyInstance } from "fastify";
import { getConfig } from "../config";
import { getRedis } from "../redis";

type CheckState = "ok" | "error" | "off";

async function check(fn: () => Promise<unknown>): Promise<CheckState> {
  try {
    await fn();
    return "ok";
  } catch {
    return "error";
  }
}

export function registerHealthRoute(app: FastifyInstance): void {
  app.get("/health", async () => ({ ok: true, app: "api" }));
  app.get("/healthz", async () => ({ ok: true, app: "api" }));

  app.get("/readyz", async (_req, reply) => {
    const config = getConfig();
    const ch = getClickhouse();
    const [postgres, redis, clickhouse] = await Promise.all([
      check(() => getDb().$queryRaw`SELECT 1`),
      check(() => getRedis().ping()),
      ch.enabled ? check(() => ch.ping()) : Promise.resolve<CheckState>("off"),
    ]);
    const checks = { postgres, redis, clickhouse };
    const ok = postgres === "ok" && redis === "ok" && clickhouse !== "error";
    await reply.status(ok ? 200 : 503).send({ ok, processRole: config.processRole, checks });
  });
}

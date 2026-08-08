import { setEmailSink } from "@kytelink/emails";
import { migrateClickhouse } from "@kytelink/clickhouse";
import { assertBootableEnv, EnvValidationError } from "./env";
import { getConfig } from "./config";
import { listenTextResolver, prettyLogging, taggedLogger } from "./logger";
import { printBanner } from "./log/banner";
import { buildServer } from "./server";
import { registerSeams, startWorkers, type WorkerHandle } from "./workers/index";

const log = taggedLogger("boot");
const emailLog = taggedLogger("email");

async function main() {
  setEmailSink((undelivered) => {
    emailLog.warn(undelivered, "not delivered — no email provider is configured");
  });

  try {
    assertBootableEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      log.fatal(error.message);
      process.exit(1);
    }
    throw error;
  }

  const config = getConfig();
  const runServer = config.processRole === "server" || config.processRole === "all";
  const runWorker = config.processRole === "worker" || config.processRole === "all";

  if (config.capabilities.analytics) {
    // Every migration is IF NOT EXISTS, so this is safe to run on every boot
    // and across concurrently booting instances. A failure must not stop the
    // API — analytics degrades, everything else keeps working.
    try {
      const applied = (await migrateClickhouse())?.filter((result) => result.applied) ?? [];
      if (applied.length > 0) {
        log.info({ migrations: applied.map((result) => result.name) }, "clickhouse migrated");
      }
    } catch (error) {
      log.error({ err: error }, "clickhouse migration failed — analytics may be unavailable");
    }
  }

  registerSeams();

  let workers: WorkerHandle | undefined;
  if (runWorker) {
    workers = startWorkers();
  }

  if (runServer) {
    const app = await buildServer();
    const port = Number(process.env.PORT ?? 3003);
    const host = process.env.HOST ?? "0.0.0.0";
    await app.listen({ port, host, listenTextResolver });
    if (prettyLogging) {
      printBanner({
        config,
        addresses: app.addresses().map(addressOf),
        port,
        bootSeconds: process.uptime(),
      });
    } else {
      log.info({ port, host, role: config.processRole }, "api ready");
    }
  } else {
    log.info({ role: config.processRole }, "api ready — background workers only, no http server");
  }

  if (workers) {
    const shutdown = (): void => {
      log.info("shutting down — draining workers");
      void workers?.stop().finally(() => process.exit(0));
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }
}

function addressOf(info: { address: string; port: number }): string {
  const host = info.address.includes(":") ? `[${info.address}]` : info.address;
  return `${host}:${String(info.port)}`;
}

main().catch((error: unknown) => {
  log.fatal({ err: error }, "api failed to start");
  process.exit(1);
});

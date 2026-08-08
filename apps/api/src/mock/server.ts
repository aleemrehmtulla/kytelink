import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "../routers/index";
import { logger, quietLogController } from "../logger";
import { registerRequestLog } from "../log/request-log";
import { createSeededStore, type MemoryStore } from "../store/memory-store";
import { createMockContextFactory } from "./context";

export interface MockServer {
  app: FastifyInstance;
  store: MemoryStore;
}

export async function buildMockServer(): Promise<MockServer> {
  const app = Fastify({ loggerInstance: logger as FastifyBaseLogger, logController: quietLogController });
  const store = createSeededStore();

  registerRequestLog(app);

  app.get("/healthz", async () => ({ ok: true, mode: "mock" }));

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: createMockContextFactory(store),
    },
  });

  return { app, store };
}

import { getClickhouse } from "@kytelink/clickhouse";
import type { SessionInfo, TrpcContext } from "@kytelink/trpc";
import type { FastifyRequest } from "fastify";
import { getConfig } from "../config";
import { logger } from "../logger";
import type { MemoryStore } from "../store/memory-store";

const DEFAULT_MOCK_EMAIL = "agent@kytelink.dev";

export function createMockContextFactory(store: MemoryStore) {
  return async function createMockContext({ req }: { req: FastifyRequest }): Promise<TrpcContext> {
    const header = req.headers["x-mock-user"];
    const email =
      (Array.isArray(header) ? header[0] : header)?.trim().toLowerCase() ?? DEFAULT_MOCK_EMAIL;
    const user = await store.userByEmail(email);
    const config = getConfig();

    const session: SessionInfo | null = user
      ? {
          userId: user.id,
          email: user.email,
          isAdmin: user.role === "ADMIN" && config.adminEmails.has(user.email),
          status: user.status,
        }
      : null;

    return {
      session,
      user: user ? { id: user.id, email: user.email } : null,
      ip: req.ip,
      redis: null,
      db: store,
      ch: getClickhouse(),
      log: logger,
    };
  };
}

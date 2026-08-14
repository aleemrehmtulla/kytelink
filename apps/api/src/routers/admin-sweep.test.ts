import { beforeEach, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { createCallerFactory, type TrpcContext } from "@kytelink/trpc";
import { loadConfig, setConfigForTest } from "../config";
import { logger } from "../logger";
import { createSeededStore, type MemoryStore } from "../store/memory-store";
import { appRouter } from "./index";

const createCaller = createCallerFactory(appRouter);

async function contextFor(store: MemoryStore, email: string): Promise<TrpcContext> {
  const user = await store.userByEmail(email);
  if (!user) throw new Error(`no fixture user ${email}`);
  return {
    session: {
      userId: user.id,
      email: user.email,
      isAdmin: user.role === "ADMIN",
      status: user.status,
    },
    user: { id: user.id, email: user.email },
    ip: "127.0.0.1",
    redis: null,
    db: store,
    ch: getClickhouse(),
    log: logger,
  };
}

let store: MemoryStore;

beforeEach(() => {
  store = createSeededStore();
  setConfigForTest(
    loadConfig({
      ...process.env,
      ADMIN_EMAILS: "agent-admin@kytelink.dev",
      WEB_BASE_URL: "http://localhost:3000",
    }),
  );
});

describe("the platform-wide sweep is admin-only", () => {
  it("refuses to start for a signed-in non-admin", async () => {
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    await expect(caller.admin.sweepAllKytes()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.admin.sweepStatus()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses to start for an anonymous caller", async () => {
    const context = await contextFor(store, "agent@kytelink.dev");
    const caller = createCaller({ ...context, session: null, user: null });
    await expect(caller.admin.sweepAllKytes()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses an ADMIN whose address is not in ADMIN_EMAILS", async () => {
    setConfigForTest(
      loadConfig({ ...process.env, ADMIN_EMAILS: "", WEB_BASE_URL: "http://localhost:3000" }),
    );
    const caller = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await expect(caller.admin.sweepAllKytes()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

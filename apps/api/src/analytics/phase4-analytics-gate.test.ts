import { beforeEach, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { appCodeOf, createCallerFactory, type TrpcContext } from "@kytelink/trpc";
import { loadConfig, setConfigForTest } from "../config";
import { logger } from "../logger";
import { createSeededStore, type MemoryStore } from "../store/memory-store";
import { appRouter } from "../routers/index";

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
});

describe("kyte analytics router respects the analytics capability (SH4)", () => {
  it("throws FEATURE_DISABLED when analytics is off", async () => {
    setConfigForTest(loadConfig({ ...process.env, CLICKHOUSE_URL: "" }));
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    try {
      await caller.analytics.overview({ kyteId: "kyte_ag_1", days: 30 });
      throw new Error("expected FEATURE_DISABLED");
    } catch (error) {
      expect(appCodeOf(error)).toBe("FEATURE_DISABLED");
    }
  });

  it("does not throw FEATURE_DISABLED when analytics is on", async () => {
    setConfigForTest(loadConfig({ ...process.env, CLICKHOUSE_URL: "http://localhost:8123" }));
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const result = await caller.analytics.overview({ kyteId: "kyte_ag_1", days: 30 });
    expect(result).toHaveProperty("totalViews");
  });
});

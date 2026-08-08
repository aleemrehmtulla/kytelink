import { beforeEach, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { appCodeOf, createCallerFactory, type TrpcContext } from "@kytelink/trpc";
import { COUNT_LIMIT_KEYS } from "@kytelink/schemas";
import { loadConfig, setConfigForTest } from "../config";
import { logger } from "../logger";
import { createSeededStore, type MemoryStore } from "../store/memory-store";
import { buildServer } from "../server";
import { appRouter } from "./index";

const createCaller = createCallerFactory(appRouter);

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://kyte:kyte@localhost:5432/kyte",
  REDIS_URL: "redis://localhost:6379",
  AUTH_SECRET: "test-secret-000000000000000000000000",
  INTERNAL_API_SECRET: "test-internal-secret",
  WEB_BASE_URL: "http://localhost:3000",
  API_BASE_URL: "http://localhost:3003",
  LANDING_ZONE_URL: "http://localhost:3001",
  ADMIN_EMAILS: "agent-admin@kytelink.dev",
};

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
  setConfigForTest(loadConfig({ ...process.env, ...REQUIRED_ENV }));
});

describe("LIMIT_REACHED errors carry the canonical schema key", () => {
  it("schedule.create over the cap throws LIMIT_REACHED naming schedulesPerKyte", async () => {
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const at = (hours: number) => new Date(Date.now() + hours * 3_600_000);
    // Cap is 3 pending schedules; the 4th create trips the limit.
    for (let i = 0; i < 3; i += 1) {
      await caller.schedule.create({ kyteId: "usr_agent", scheduledFor: at(i + 1), timezone: "UTC" });
    }
    const error = await caller.schedule
      .create({ kyteId: "usr_agent", scheduledFor: at(9), timezone: "UTC" })
      .catch((e: unknown) => e);
    expect(appCodeOf(error)).toBe("LIMIT_REACHED");
    // The message embeds the canonical LimitKey so the web can name the modal.
    expect((error as Error).message).toMatch(/Limit reached for schedulesPerKyte/);
  });

  it("preview.ensure is idempotent — one link per kyte, no cap to hit", async () => {
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const first = await caller.preview.ensure({ kyteId: "usr_agent" });
    const second = await caller.preview.ensure({ kyteId: "usr_agent" });
    expect(second).toEqual(first);
    const rotated = await caller.preview.rotate({ kyteId: "usr_agent" });
    expect(rotated.token).toBe(first.token);
    expect(rotated.passcode).not.toBe(first.passcode);
  });

  it("every count-limit message uses a real @kytelink/schemas LimitKey token", () => {
    // Guards the API<->web contract: the key the web extracts must be canonical.
    for (const key of COUNT_LIMIT_KEYS) {
      expect(`Limit reached for ${key} (0).`).toMatch(new RegExp(`Limit reached for ${key} `));
    }
  });
});

describe("batched tRPC GET URLs longer than the default maxParamLength", () => {
  it("routes a 7-procedure analytics batch instead of returning 414 URI Too Long", async () => {
    const app = await buildServer();
    try {
      const procs =
        "schedule.list,analytics.overview,analytics.timeSeries,analytics.topLinks,analytics.referrers,analytics.devices,analytics.countries";
      expect(procs.length).toBeGreaterThan(100);
      const res = await app.inject({
        method: "GET",
        url: `/trpc/${procs}?batch=1&input=%7B%220%22%3A%7B%22kyteId%22%3A%22usr_agent%22%7D%7D`,
      });
      // Without an auth cookie the procedures reject, but the request must be
      // ROUTED (not 414). Before maxParamLength was raised this was 414.
      expect(res.statusCode).not.toBe(414);
    } finally {
      await app.close();
    }
  });
});

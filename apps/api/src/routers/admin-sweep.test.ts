import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { createCallerFactory, type TrpcContext } from "@kytelink/trpc";
import { loadConfig, setConfigForTest } from "../config";
import { logger } from "../logger";
import {
  SWEEP_CANCEL_KEY,
  SWEEP_PROGRESS_KEY,
  writeSweepProgress,
} from "../moderation/sweep-progress";
import { getRedis } from "../redis";
import { createSeededStore, type MemoryStore } from "../store/memory-store";
import {
  initialSweepProgress,
  isModerationSweepQueued,
  MODERATION_SWEEP_JOB_ID,
  MODERATION_SWEEP_QUEUE_NAME,
} from "../workers/moderation-sweep";
import { getQueue } from "../workers/queues";
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

afterAll(async () => {
  await getQueue(MODERATION_SWEEP_QUEUE_NAME).close().catch(() => undefined);
});

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

  it("refuses to cancel for a signed-in non-admin", async () => {
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    await expect(caller.admin.cancelSweep()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("sweepStatus derives the state a stranded run cannot report itself", () => {
  const redis = getRedis();

  afterEach(async () => {
    await redis.del(SWEEP_PROGRESS_KEY, SWEEP_CANCEL_KEY);
  });

  async function adminCaller() {
    return createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
  }

  it("reports an unfinished blob with no job behind it as interrupted", async () => {
    await writeSweepProgress(redis, {
      ...initialSweepProgress(7000, "agent-admin@kytelink.dev", "run_deployed_over"),
      processed: 2400,
    });

    const status = await (await adminCaller()).admin.sweepStatus();

    expect(status.progress?.state).toBe("interrupted");
    expect(status.progress?.processed).toBe(2400);
    expect(status.progress?.finishedAt).toBeNull();
  });

  it("reports a finished blob as finished even without a stored state", async () => {
    const base = initialSweepProgress(10, "agent-admin@kytelink.dev", "run_old_build");
    // A blob shaped like the previous build's: no state field at all.
    const { state: _state, ...legacy } = base;
    await redis.set(
      SWEEP_PROGRESS_KEY,
      JSON.stringify({ ...legacy, processed: 10, finishedAt: new Date().toISOString() }),
    );

    const status = await (await adminCaller()).admin.sweepStatus();

    expect(status.progress?.state).toBe("finished");
  });

  it("keeps a cancelled blob cancelled", async () => {
    await writeSweepProgress(redis, {
      ...initialSweepProgress(10, "agent-admin@kytelink.dev", "run_stopped"),
      processed: 3,
      state: "cancelled",
      cancelledBy: "boss@kytelink.dev",
      finishedAt: new Date().toISOString(),
    });

    const status = await (await adminCaller()).admin.sweepStatus();

    expect(status.progress?.state).toBe("cancelled");
    expect(status.progress?.cancelledBy).toBe("boss@kytelink.dev");
  });

  it("cancelling a queued-but-unstarted sweep closes it out immediately", async () => {
    const queue = getQueue(MODERATION_SWEEP_QUEUE_NAME);
    await queue.pause();
    try {
      const caller = await adminCaller();
      const started = await caller.admin.sweepAllKytes();
      expect(started.started).toBe(true);
      expect(started.progress.state).toBe("running");

      const cancelled = await caller.admin.cancelSweep();

      expect(cancelled.progress?.state).toBe("cancelled");
      expect(cancelled.progress?.cancelledBy).toBe("agent-admin@kytelink.dev");
      expect(cancelled.progress?.finishedAt).not.toBeNull();
      expect(await isModerationSweepQueued()).toBe(false);
      // The flag was consumed with the job, so it cannot reach the next run.
      expect(await redis.get(SWEEP_CANCEL_KEY)).toBeNull();
    } finally {
      await queue.resume();
    }
  });

  it("restarts cleanly over a cancelled run and over an interrupted one", async () => {
    const queue = getQueue(MODERATION_SWEEP_QUEUE_NAME);
    await queue.pause();
    try {
      const caller = await adminCaller();

      for (const stranded of ["cancelled", "interrupted"] as const) {
        await writeSweepProgress(redis, {
          ...initialSweepProgress(7000, "someone@kytelink.dev", `run_${stranded}`),
          processed: 1200,
          state: stranded === "cancelled" ? "cancelled" : "running",
          finishedAt: stranded === "cancelled" ? new Date().toISOString() : null,
        });

        const restarted = await caller.admin.sweepAllKytes();

        expect(restarted.started).toBe(true);
        expect(restarted.progress.state).toBe("running");
        expect(restarted.progress.processed).toBe(0);
        expect(restarted.progress.runId).not.toBe(`run_${stranded}`);

        await (await queue.getJob(MODERATION_SWEEP_JOB_ID))?.remove();
      }
    } finally {
      await queue.resume();
    }
  });

  it("cancelling when nothing is running is a harmless no-op", async () => {
    const status = await (await adminCaller()).admin.cancelSweep();
    expect(status.progress).toBeNull();
  });
});

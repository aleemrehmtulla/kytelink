import { randomUUID } from "node:crypto";
import { Queue } from "bullmq";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@kytelink/db";
import type { ProfileContent } from "@kytelink/schemas";
import { loadConfig, setConfigForTest } from "../config";
import { getRedis } from "../redis";
import { createNoneProvider } from "../moderation";
import type { ModerationStore } from "../moderation/types";
import { PrismaStore } from "../store/prisma-store";
import { runCleanupJob } from "./cleanup";
import { createModerationWorker } from "./moderation-worker";
import { enqueueRevalidate, enqueueSitemapRefresh, getQueue, revalidateJobId } from "./queues";
import { sweepScheduledPublishes } from "./scheduled-publish";
import { STATIC_SITEMAP_PATHS } from "@kytelink/schemas";
import { generateSitemap, runSitemapJob } from "./sitemap";

const createdOrgIds: string[] = [];
const createdUserIds: string[] = [];

// Schedules are future-dated so a live dev/agent worker's real-clock 30s sweep
// never claims them; this test drives its own sweep with an advanced `now`.
function scheduledForFuture(): Date {
  return new Date(Date.now() + 10 * 60_000);
}
function sweepNow(): Date {
  return new Date(Date.now() + 60 * 60_000);
}

function store(): PrismaStore {
  return new PrismaStore(getDb(), getRedis());
}

async function freshKyte(username?: string): Promise<{ orgId: string; kyteId: string; username: string }> {
  const db = getDb();
  const org = await db.organization.create({ data: { name: `p4w-${randomUUID()}` } });
  createdOrgIds.push(org.id);
  const s = store();
  const { kyteId } = await s.createKyte({ orgId: org.id, actorUserId: "p4w-tester" });
  const name = username ?? `p4w${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  await s.changeUsername({ kyteId, actorUserId: "p4w-tester", username: name });
  return { orgId: org.id, kyteId, username: name };
}

async function snapshotFor(kyteId: string, displayName: string): Promise<ProfileContent> {
  const k = await store().kyteById(kyteId);
  if (!k) throw new Error("no kyte");
  return { ...k.draft, displayName };
}

beforeEach(() => {
  setConfigForTest(loadConfig({ ...process.env }));
});

afterEach(async () => {
  const db = getDb();
  while (createdOrgIds.length > 0) {
    const id = createdOrgIds.pop();
    if (id) await db.organization.delete({ where: { id } }).catch(() => undefined);
  }
  while (createdUserIds.length > 0) {
    const id = createdUserIds.pop();
    if (id) await db.user.delete({ where: { id } }).catch(() => undefined);
  }
});

afterAll(async () => {
  await getQueue("revalidate").close().catch(() => undefined);
  await getQueue("sitemap").close().catch(() => undefined);
});

describe("scheduled-publish routes through the real publish pipeline (D1, D3)", () => {
  it("publishes the snapshot and fires og-image + membership side-effects", async () => {
    const { kyteId, username } = await freshKyte();
    const snapshot = await snapshotFor(kyteId, "Scheduled Name");
    const db = getDb();
    const schedule = await db.scheduledPublish.create({
      data: {
        kyteId,
        scheduledFor: scheduledForFuture(),
        timezone: "UTC",
        snapshot: snapshot as unknown as object,
        createdById: "p4w-tester",
      },
    });

    await getRedis().del(`analytics:kyte-map:${username}`);

    const result = await sweepScheduledPublishes(sweepNow());

    expect(result.published).toContain(schedule.id);
    const fresh = await db.scheduledPublish.findUnique({ where: { id: schedule.id } });
    expect(fresh?.status).toBe("PUBLISHED");

    const published = await db.publishedKyte.findUnique({ where: { kyteId } });
    expect(published?.displayName).toBe("Scheduled Name");
    expect(published?.publishSeq).toBeGreaterThanOrEqual(1);

    // afterPublish ran the shared pipeline: membership refreshed (D1 — the old
    // hand-rolled scheduled path skipped this). The og-image enqueue gating is
    // proven in phase4-og-gate.test.ts.
    expect(await getRedis().get(`analytics:kyte-map:${username}`)).toBe(kyteId);
  });

  it("drains a burst larger than one batch within a single tick (M5)", async () => {
    setConfigForTest(loadConfig({ ...process.env, AWS_S3_BUCKET: "" })); // uploads off → skip og work
    const { kyteId } = await freshKyte();
    const snapshot = await snapshotFor(kyteId, "Burst");
    const db = getDb();
    const count = 55;
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const s = await db.scheduledPublish.create({
        data: {
          kyteId,
          scheduledFor: scheduledForFuture(),
          timezone: "UTC",
          snapshot: snapshot as unknown as object,
          createdById: "p4w-tester",
        },
      });
      ids.push(s.id);
    }

    const result = await sweepScheduledPublishes(sweepNow());
    const publishedCount = await db.scheduledPublish.count({
      where: { id: { in: ids }, status: "PUBLISHED" },
    });
    expect(publishedCount).toBe(count);
    expect(result.published.length).toBe(count);
  }, 30_000);

  it("skips a suspended kyte and leaves the schedule PENDING", async () => {
    const { kyteId } = await freshKyte();
    const snapshot = await snapshotFor(kyteId, "Suspended");
    const db = getDb();
    await store().publishKyte({ kyteId, actorUserId: "p4w-tester" });
    await store().setKyteModeration(kyteId, "SUSPENDED");
    const schedule = await db.scheduledPublish.create({
      data: {
        kyteId,
        scheduledFor: scheduledForFuture(),
        timezone: "UTC",
        snapshot: snapshot as unknown as object,
        createdById: "p4w-tester",
      },
    });

    const result = await sweepScheduledPublishes(sweepNow());
    expect(result.skipped).toContain(schedule.id);
    const fresh = await db.scheduledPublish.findUnique({ where: { id: schedule.id } });
    expect(fresh?.status).toBe("PENDING");
  });
});

describe("revalidate jobId dedups identical paths (H9)", () => {
  it("coalesces two enqueues of the same path into one job", async () => {
    const path = [`/dedup-${randomUUID()}`];
    const queue = getQueue("revalidate");
    await queue.remove(revalidateJobId(path)).catch(() => undefined);

    const id1 = await enqueueRevalidate({ paths: path, reason: "publish" });
    const id2 = await enqueueRevalidate({ paths: path, reason: "og-image" });

    expect(id1).toBe(revalidateJobId(path));
    expect(id2).toBe(id1);
    const job = await queue.getJob(revalidateJobId(path));
    expect(job).not.toBeNull();
    await queue.remove(revalidateJobId(path)).catch(() => undefined);
  });
});

describe("cleanup worker prunes expired records (H11)", () => {
  it("deletes an expired session and expires an overdue invite", async () => {
    const db = getDb();
    const user = await db.user.create({
      data: { id: randomUUID(), email: `p4w-${randomUUID()}@kytelink.dev`, role: "USER" },
    });
    createdUserIds.push(user.id);
    const org = await db.organization.create({ data: { name: `p4w-${randomUUID()}` } });
    createdOrgIds.push(org.id);

    const session = await db.session.create({
      data: {
        token: randomUUID(),
        userId: user.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const invite = await db.orgInvite.create({
      data: {
        orgId: org.id,
        email: `invitee-${randomUUID()}@kytelink.dev`,
        role: "EDITOR",
        kyteAccess: "ALL",
        invitedById: user.id,
        tokenHash: randomUUID(),
        status: "PENDING",
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const result = await runCleanupJob(db, new Date());
    expect(result.expiredSessions).toBeGreaterThanOrEqual(1);
    expect(result.expiredInvites).toBeGreaterThanOrEqual(1);

    expect(await db.session.findUnique({ where: { id: session.id } })).toBeNull();
    const freshInvite = await db.orgInvite.findUnique({ where: { id: invite.id } });
    expect(freshInvite?.status).toBe("EXPIRED");
  });
});

describe("sitemap worker (H11)", () => {
  it("chunks URLs into 50k-per-file with static pages first", () => {
    const many = Array.from({ length: 50_001 }, (_, i) => `user${i}`);
    const map = generateSitemap(many, STATIC_SITEMAP_PATHS, "https://kytelink.com/");
    expect(map.files.length).toBe(2);
    expect(map.files[0]!.xml).toContain("https://kytelink.com/discover");
    expect(map.index).toContain("https://kytelink.com/sitemap-0.xml");
    expect(map.index).toContain("https://kytelink.com/sitemap-1.xml");
  });

  // These two only exist as /features/[slug] and /use-cases/[slug] in the
  // landing app, so listing the index paths put 4XX URLs in the sitemap.
  it("lists no static path that the landing app does not serve", () => {
    expect(STATIC_SITEMAP_PATHS).not.toContain("/features");
    expect(STATIC_SITEMAP_PATHS).not.toContain("/use-cases");
  });

  it("produces a sitemap from published APPROVED kytes", async () => {
    const { kyteId, username } = await freshKyte();
    await store().publishKyte({ kyteId, actorUserId: "p4w-tester" });

    const out = await runSitemapJob(getDb(), "https://kytelink.com");
    expect(out.urlCount).toBeGreaterThanOrEqual(STATIC_SITEMAP_PATHS.length + 1);

    const file = await getRedis().get("sitemap:file:sitemap-0.xml");
    expect(file).toContain(`https://kytelink.com/${username}`);
    expect(await getRedis().get("sitemap:index")).toContain("sitemap-0.xml");
  });

  // A shouldRedirect profile answers with a 307, which a crawler reports as a
  // "3XX redirect in sitemap" — it must never be listed.
  it("omits published kytes that redirect", async () => {
    const db = getDb();
    const { kyteId, username } = await freshKyte();
    await store().publishKyte({ kyteId, actorUserId: "p4w-tester" });

    await runSitemapJob(db, "https://kytelink.com");
    expect(await getRedis().get("sitemap:file:sitemap-0.xml")).toContain(
      `https://kytelink.com/${username}`,
    );

    await db.publishedKyte.update({
      where: { kyteId },
      data: { shouldRedirect: true, redirectUrl: "https://example.com" },
    });
    await runSitemapJob(db, "https://kytelink.com");
    expect(await getRedis().get("sitemap:file:sitemap-0.xml")).not.toContain(
      `https://kytelink.com/${username}`,
    );
  });
});

describe("sitemap refresh on publish/moderation transitions (SEO)", () => {
  it("collapses a burst of transitions into a single delayed job", async () => {
    const queue = getQueue("sitemap");
    await queue.remove("sitemap-refresh").catch(() => undefined);

    await enqueueSitemapRefresh("publish");
    await enqueueSitemapRefresh("moderation");

    const delayed = await queue.getDelayed();
    expect(delayed.filter((job) => job.id === "sitemap-refresh").length).toBe(1);
    await queue.remove("sitemap-refresh").catch(() => undefined);
  });
});

describe("moderation runs on a durable BullMQ worker (M4)", () => {
  it("processes a scan and writes a moderation review", async () => {
    const { kyteId } = await freshKyte();
    await store().publishKyte({ kyteId, actorUserId: "p4w-tester" });

    // Isolated queue name so a live dev/agent worker on the shared "moderation"
    // queue cannot steal the job under test.
    const queueName = `moderation-test-${randomUUID()}`;
    const queue = new Queue(queueName, { connection: getRedis() });
    const worker = createModerationWorker({ queueName });
    try {
      const done = new Promise<void>((resolve, reject) => {
        worker.on("completed", () => resolve());
        worker.on("failed", (_job, err) => reject(err));
      });
      await queue.add("scan", { kyteId, publishSeq: 1 });
      await done;
    } finally {
      await worker.close();
      await queue.obliterate({ force: true }).catch(() => undefined);
      await queue.close();
    }

    const review = await getDb().moderationReview.findFirst({ where: { kyteId } });
    expect(review).not.toBeNull();
  }, 20_000);

  it("dead-letters to an admin alert when a scan exhausts retries", async () => {
    const throwingStore = {
      loadKyteForReview: async () => {
        throw new Error("boom");
      },
    } as unknown as ModerationStore;
    const queueName = `moderation-test-${randomUUID()}`;
    const queue = new Queue(queueName, { connection: getRedis() });
    const worker = createModerationWorker({
      store: throwingStore,
      provider: createNoneProvider(),
      queueName,
    });
    const kyteId = `deadletter-${randomUUID()}`;

    try {
      const failed = new Promise<void>((resolve) => {
        worker.on("failed", (job) => {
          if (job?.data.kyteId === kyteId) resolve();
        });
      });
      await queue.add("scan", { kyteId, publishSeq: 1 }, { attempts: 1 });
      await failed;
      // Give the failed handler a beat to write the alert row.
      await new Promise((r) => setTimeout(r, 500));
    } finally {
      await worker.close();
      await queue.obliterate({ force: true }).catch(() => undefined);
      await queue.close();
    }

    const alert = await getDb().adminAlert.findFirst({
      where: { kind: "moderation_dead_letter", message: { contains: kyteId } },
    });
    expect(alert).not.toBeNull();
    await getDb().adminAlert.deleteMany({ where: { message: { contains: kyteId } } });
  }, 20_000);
});

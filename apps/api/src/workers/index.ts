import type { Worker } from "bullmq";
import { analyticsSeam, startAnalyticsBackgroundJobs } from "../analytics";
import { createAssetQuarantineWorker, createOgImageWorker } from "../assets";
import { createBullmqModerationSeam } from "../moderation";
import { getConfig } from "../config";
import { taggedLogger } from "../logger";
import { registerAnalyticsSeam } from "../seams/analytics-seam";
import { registerModerationSeam } from "../seams/moderation-seam";
import { getRealStore } from "../store/instance";
import { createCleanupWorker, scheduleCleanup } from "./cleanup";
import { createDomainReaperWorker, scheduleDomainReaper } from "./domain-reaper";
import { createModerationSweepWorker } from "./moderation-sweep";
import { createModerationWorker } from "./moderation-worker";
import { startRevalidateWorker } from "./revalidate";
import { sweepScheduledPublishes } from "./scheduled-publish";
import { createSitemapWorker, scheduleSitemap } from "./sitemap";

const SWEEP_INTERVAL_MS = 30_000;

const log = taggedLogger("workers");

export interface WorkerHandle {
  stop(): Promise<void>;
}

/**
 * Registered in every process (server + worker): publish (server) enqueues the
 * durable moderation scan and beacons (server) call the analytics seam.
 */
export function registerSeams(): void {
  registerModerationSeam(createBullmqModerationSeam());
  registerAnalyticsSeam(analyticsSeam);
  log.debug("seams registered — publish enqueues moderation, beacons reach analytics");
}

export function startWorkers(): WorkerHandle {
  const config = getConfig();
  const store = getRealStore();
  const workers: Worker[] = [
    startRevalidateWorker(),
    createOgImageWorker(store),
    createAssetQuarantineWorker(),
    createModerationWorker(),
    createModerationSweepWorker(),
    createSitemapWorker(),
    createCleanupWorker(),
    createDomainReaperWorker(),
  ];

  void scheduleSitemap().catch((error: unknown) => {
    log.error({ err: error }, "nightly sitemap is not scheduled — sitemap.xml will go stale");
  });
  void scheduleCleanup().catch((error: unknown) => {
    log.error({ err: error }, "nightly cleanup is not scheduled — expired sessions and invites will pile up");
  });
  void scheduleDomainReaper().catch((error: unknown) => {
    log.error({ err: error }, "domain reaper is not scheduled — disconnected custom domains will not be reaped");
  });

  const stopAnalytics = config.capabilities.analytics
    ? startAnalyticsBackgroundJobs()
    : (): void => undefined;

  const sweep = setInterval(() => {
    void sweepScheduledPublishes().catch((error: unknown) => {
      log.error({ err: error }, "scheduled-publish sweep failed — kytes due to go live may be late");
    });
  }, SWEEP_INTERVAL_MS);
  sweep.unref();

  log.info(
    { queues: workers.length, sweepSeconds: SWEEP_INTERVAL_MS / 1000 },
    "background workers started",
  );

  return {
    async stop() {
      clearInterval(sweep);
      stopAnalytics();
      await Promise.all(workers.map((w) => w.close()));
    },
  };
}

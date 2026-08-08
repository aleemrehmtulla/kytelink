import { Worker, type Job } from "bullmq";
import { getDb, type PrismaClient } from "@kytelink/db";
import { getConfig } from "../config";
import { getDomainProvider, type DomainConnectionState, type DomainProvider } from "../domains";
import { taggedLogger } from "../logger";
import { getRedis } from "../redis";
import { getQueue } from "./queues";

const log = taggedLogger("domains");

const DOMAIN_REAPER_QUEUE_NAME = "domain-reaper";

/**
 * How long a domain may stay disconnected before we give it up. Measured from
 * the last time the provider confirmed it connected, falling back to when it was
 * added — so it covers both "added and never pointed at us" and "worked, then
 * the DNS was changed or the domain lapsed".
 */
export const DOMAIN_GRACE_MS = 48 * 60 * 60 * 1000;

export interface DomainReaperResult {
  checked: number;
  confirmed: number;
  pending: number;
  reaped: number;
  inconclusive: number;
  skipped?: "domains-capability-off";
}

function graceDeadline(domain: { createdAt: Date; lastVerifiedAt: Date | null }): number {
  return (domain.lastVerifiedAt ?? domain.createdAt).getTime() + DOMAIN_GRACE_MS;
}

/**
 * Re-checks every custom domain against the provider and reconciles our record
 * with reality. This is what keeps `verified` honest between user-triggered
 * verifies: a domain that quietly breaks stops serving, and one that stays
 * broken past the grace window is released from the provider AND deleted here,
 * so we are not paying to hold a domain slot for a domain nobody points at us.
 *
 * Idempotent: a second run over the same data reaches the same state.
 */
export async function runDomainReaper(
  deps: {
    db?: PrismaClient;
    provider?: DomainProvider;
    now?: Date;
    force?: boolean;
    /**
     * Only look at domains that are not currently serving. v1 had no verification
     * gate at all — a domain went live the moment DNS propagated. Here it goes
     * live when a check confirms it, so unverified domains are swept far more
     * often than the reaping cadence: otherwise someone who sets their DNS and
     * closes the tab waits hours for a domain v1 would have served immediately.
     * Pending-only sweeps never reap; deletion belongs to the full sweep.
     */
    pendingOnly?: boolean;
  } = {},
): Promise<DomainReaperResult> {
  const db = deps.db ?? getDb();
  const provider = deps.provider ?? getDomainProvider();
  const now = deps.now ?? new Date();

  // An instance that cannot activate custom domains cannot meaningfully check
  // them either — without a provider to ask, every domain would look
  // disconnected. Local dev and unconfigured self-hosts land here.
  if (!(deps.force ?? false) && !getConfig().capabilities.domains) {
    return { checked: 0, confirmed: 0, pending: 0, reaped: 0, inconclusive: 0, skipped: "domains-capability-off" };
  }

  const pendingOnly = deps.pendingOnly ?? false;
  const domains = await db.domain.findMany(pendingOnly ? { where: { verified: false } } : undefined);
  const result: DomainReaperResult = {
    checked: domains.length,
    confirmed: 0,
    pending: 0,
    reaped: 0,
    inconclusive: 0,
  };

  for (const domain of domains) {
    let state: DomainConnectionState;
    try {
      state = await provider.status(domain.domain);
    } catch (error) {
      // A provider outage must never reap a working domain. Treat the check as
      // inconclusive and leave this one exactly as it is until the next run.
      log.warn(
        { host: domain.domain, err: error },
        "could not check this domain — leaving it untouched until the next sweep",
      );
      result.inconclusive += 1;
      continue;
    }

    // ERROR is "we could not determine", not "disconnected" — a bad API token or
    // unset record targets would otherwise delete every domain on the instance.
    // Only a definitive PENDING counts against the grace window.
    if (state === "ERROR") {
      log.warn(
        { host: domain.domain },
        "provider returned an error for this domain — leaving it untouched until the next sweep",
      );
      result.inconclusive += 1;
      continue;
    }

    if (state === "CONNECTED") {
      result.confirmed += 1;
      if (!domain.verified || !domain.lastVerifiedAt) {
        await db.domain.update({
          where: { domain: domain.domain },
          data: { verified: true, lastVerifiedAt: now },
        });
        await getRedis().del(`domain:${domain.domain}`);
      } else {
        await db.domain.update({
          where: { domain: domain.domain },
          data: { lastVerifiedAt: now },
        });
      }
      continue;
    }

    if (pendingOnly || now.getTime() < graceDeadline(domain)) {
      result.pending += 1;
      if (domain.verified) {
        // Stop serving a broken domain immediately; the grace window governs
        // deletion, not whether we keep routing traffic into a dead end.
        await db.domain.update({
          where: { domain: domain.domain },
          data: { verified: false },
        });
        await getRedis().del(`domain:${domain.domain}`);
      }
      continue;
    }

    try {
      await provider.detach(domain.domain);
    } catch (error) {
      // Log and still delete: leaving the row would retry forever, and detach is
      // idempotent, so a later manual cleanup on the provider stays possible.
      log.warn(
        { host: domain.domain, err: error },
        "provider detach failed — deleting the row anyway, so clean up this host at the provider by hand",
      );
    }

    const kyte = await db.kyte.findUnique({ where: { id: domain.kyteId } });
    await db.$transaction(async (tx) => {
      await tx.domain.delete({ where: { domain: domain.domain } });
      await tx.auditLog.create({
        data: {
          orgId: kyte?.orgId ?? "",
          kyteId: domain.kyteId,
          actorId: "system",
          action: "domain.reaped",
          summary: "domain reaped",
          meta: {
            host: domain.domain,
            reason: "disconnected past the grace window",
            graceHours: DOMAIN_GRACE_MS / 3_600_000,
            lastVerifiedAt: domain.lastVerifiedAt?.toISOString() ?? null,
          },
        },
      });
    });
    await getRedis().del(`domain:${domain.domain}`);
    result.reaped += 1;
    log.info(
      { host: domain.domain, kyteId: domain.kyteId },
      "reaped a custom domain — disconnected past the grace window",
    );
  }

  log.info(result, "domain reaper sweep done");
  return result;
}

interface DomainReaperJobData {
  pendingOnly?: boolean;
}

export function createDomainReaperWorker(): Worker {
  const worker = new Worker(
    DOMAIN_REAPER_QUEUE_NAME,
    (job: Job<DomainReaperJobData>) => runDomainReaper({ pendingOnly: job.data?.pendingOnly }),
    { connection: getRedis(), concurrency: 1 },
  );
  return worker;
}

export async function scheduleDomainReaper(): Promise<void> {
  const queue = getQueue(DOMAIN_REAPER_QUEUE_NAME);

  // Full sweep every six hours rather than nightly: the grace window is 48h, and
  // a daily sweep would let that drift to nearly 72h before anything is released.
  await queue.add(
    "sweep",
    {},
    { repeat: { pattern: "15 */6 * * *" }, jobId: "domain-reaper-sweep" },
  );

  // Unverified domains every ten minutes. This is the path that takes a freshly
  // pointed domain live without the user sitting on the editor tab, so it has to
  // be far tighter than the reaping cadence. Cheap: one lookup per pending
  // domain, and there are rarely many.
  await queue.add(
    "pending",
    { pendingOnly: true },
    { repeat: { pattern: "*/10 * * * *" }, jobId: "domain-reaper-pending" },
  );
}

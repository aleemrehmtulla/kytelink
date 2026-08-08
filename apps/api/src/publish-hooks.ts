import { enqueueOgImageJob, enqueueQuarantineJob } from "./assets";
import { clearKyteMembership, refreshKyteMembership } from "./analytics";
import { getConfig } from "./config";
import { taggedLogger } from "./logger";

const log = taggedLogger("publish");
import { onKytePublished } from "./seams/moderation-seam";
import { getRedis } from "./redis";
import { enqueueRevalidate } from "./workers/queues";
import type { KyteRow } from "./store/store";

export async function afterPublish(kyte: KyteRow, publishSeq: number): Promise<void> {
  onKytePublished({ kyteId: kyte.id, username: kyte.username, publishSeq });
  if (!kyte.username) return;
  await refreshKyteMembership(getRedis(), kyte.username, kyte.id);
  if (getConfig().capabilities.uploads) {
    await enqueueOgImageJob({
      kyteId: kyte.id,
      displayName: kyte.draft.displayName ?? kyte.username,
      username: kyte.username,
      theme: kyte.draft.theme,
    });
  } else {
    log.debug(
      { kyteId: kyte.id },
      "skipped the OG image — uploads capability is off, so OG meta falls back to text/avatar",
    );
  }
  await enqueueRevalidate({ paths: [`/${kyte.username}`], reason: "publish" });
}

export async function afterUsernameChange(
  kyteId: string,
  previousUsername: string | null,
  nextUsername: string,
): Promise<void> {
  const redis = getRedis();
  if (previousUsername) await clearKyteMembership(redis, previousUsername);
  await refreshKyteMembership(redis, nextUsername, kyteId);
  await enqueueRevalidate({
    paths: [`/${nextUsername}`, ...(previousUsername ? [`/${previousUsername}`] : [])],
    reason: "username-change",
  });
}

export async function afterModerationChange(
  kyteId: string,
  username: string | null,
  suspended: boolean,
): Promise<void> {
  const redis = getRedis();
  await enqueueQuarantineJob({ kyteId, direction: suspended ? "quarantine" : "restore" });
  if (username) {
    if (suspended) await clearKyteMembership(redis, username);
    else await refreshKyteMembership(redis, username, kyteId);
    // The API-side profile payload is cached for minutes; without this drop, a
    // suspended page keeps serving from Redis long after the admin acted.
    await redis.del(`profile:${username}`);
    await enqueueRevalidate({ paths: [`/${username}`], reason: "moderation" });
  }
}

/**
 * An org-level suspension changes the effective status of every kyte in it
 * without touching a single moderationStatus column, so nothing else would
 * invalidate their caches.
 */
export async function afterOrgModerationChange(
  kytes: { kyteId: string; username: string }[],
  suspended: boolean,
): Promise<void> {
  const redis = getRedis();
  for (const { kyteId, username } of kytes) {
    if (suspended) await clearKyteMembership(redis, username);
    else await refreshKyteMembership(redis, username, kyteId);
    await redis.del(`profile:${username}`);
  }
  if (kytes.length > 0) {
    await enqueueRevalidate({
      paths: kytes.map(({ username }) => `/${username}`),
      reason: "moderation",
    });
  }
}

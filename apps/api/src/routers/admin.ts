import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@kytelink/db";
import {
  type AuditAction,
  isUserSuspensionCause,
  type ModerationStatus,
  type UserStatus,
  userSuspensionCause,
} from "@kytelink/schemas";
import {
  abuseReportRowSchema,
  abuseReportsInput,
  actionAbuseReportInput,
  adminMeSchema,
  adminOrgMemberSchema,
  adminOrgSummarySchema,
  alertsInput,
  alertsOutput,
  appealRowSchema,
  appealsInput,
  auditLogInput,
  auditLogRowSchema,
  banUserInput,
  deleteAssetInput,
  exportRowsInput,
  exportRowsOutput,
  featureDisabled,
  globalSearchInput,
  globalSearchResultSchema,
  growthInput,
  growthStatsSchema,
  kyteDetailSchema,
  kyteIdInput,
  kytePublishedSnapshotSchema,
  kyteModerationActionInput,
  upholdKyteSuspensionInput,
  liveStatsSchema,
  moderationCountsSchema,
  moderationInsightsInput,
  moderationInsightsSchema,
  moderationQueueInput,
  moderationQueueOutput,
  moderationSweepStatusOutput,
  okSchema,
  openModerationCaseInput,
  openModerationCaseOutput,
  orgDetailInput,
  orgDetailSchema,
  orgKyteRowSchema,
  orgKytesInput,
  recentKytesInput,
  recentKytesOutput,
  orgMembersInput,
  orgSuspensionActionInput,
  overviewStatsSchema,
  pagedOutput,
  platformSeriesInput,
  platformSeriesOutput,
  resolveAlertInput,
  resolveAlertsByKindInput,
  resolveAppealInput,
  resolveModerationTargetInput,
  resolveModerationTargetOutput,
  router,
  searchOrgsInput,
  searchUsersInput,
  setKyteModerationInput,
  setOrgLimitsInput,
  setUserLimitsInput,
  setUserStatusInput,
  storageOrgFilesInput,
  storageOrgFilesOutput,
  storageOrgRowSchema,
  storageOrgsInput,
  storageOrphanRowSchema,
  storageOrphansInput,
  storageOverviewSchema,
  suspendedListInput,
  suspendedRowSchema,
  sweepAllKytesOutput,
  topKytesInput,
  topKytesOutput,
  trafficBreakdownSchema,
  trafficRangeInput,
  trafficSeriesOutput,
  userDetailInput,
  userDetailSchema,
  userIdInput,
  userSummarySchema,
} from "@kytelink/trpc";
import { TRPCError } from "@trpc/server";
import {
  appealDecisionSubject,
  getEmailProvider,
  renderAppealDecisionEmail,
} from "@kytelink/emails";
import { admin } from "../trpc/procedures";
import { afterModerationChange, afterOrgModerationChange } from "../publish-hooks";
import { logger, taggedLogger } from "../logger";
import type { EnvTrpcContext } from "../trpc/context-ext";
import { createPrismaModerationStore, createProviderFromEnv, forceReReviewKyte } from "../moderation";
import {
  clearSweepCancel,
  readSweepProgress,
  requestSweepCancel,
  writeSweepProgress,
  type ModerationSweepProgress,
} from "../moderation/sweep-progress";
import { getRedis } from "../redis";
import {
  enqueueModerationSweep,
  initialSweepProgress,
  isModerationSweepQueued,
  removeQueuedModerationSweep,
} from "../workers/moderation-sweep";
import * as queries from "../admin/admin-queries";
import * as storage from "../admin/storage-queries";
import {
  buildLqipKey,
  liveKyteObjectPrefix,
  quarantineKyteObjectPrefix,
  rawKyteObjectPrefix,
} from "../assets/keys";
import { deleteObject, listObjectsByPrefix } from "../assets/s3-client";
import { clearKyteMembership } from "../analytics";
import { enqueueRevalidate, enqueueSitemapRefresh } from "../workers/queues";
import { recordAdminAction } from "../admin/admin-audit";
import { exportRows as runExport } from "../admin/admin-exports";
import { resolveRange, topKytes, trafficBreakdown, trafficSeries } from "../admin/traffic-queries";
import { growth } from "../admin/growth-queries";

type AdminCtx = EnvTrpcContext & { user: { id: string; email: string } };

/**
 * "interrupted" exists only here. A blob with no `finishedAt` is only really
 * running if a job is queued to be running it; when the API is redeployed or
 * crashes mid-sweep the job dies with it and the blob is stranded, which used
 * to read as a permanently-running sweep with a permanently-disabled button.
 */
async function readSweepStatus(): Promise<{
  publishedKytes: number;
  progress: ModerationSweepProgress | null;
}> {
  const [progress, publishedKytes] = await Promise.all([
    readSweepProgress(getRedis()),
    getDb().publishedKyte.count(),
  ]);
  if (!progress) return { publishedKytes, progress: null };

  if (progress.finishedAt !== null) {
    // Blobs written before `state` existed default to "running" — a finished
    // run must not report itself as still going.
    const settled = progress.state === "running" ? "finished" : progress.state;
    return { publishedKytes, progress: { ...progress, state: settled } };
  }

  const state = (await isModerationSweepQueued()) ? "running" : "interrupted";
  return { publishedKytes, progress: { ...progress, state } };
}

async function applyModerationStatus(
  ctx: AdminCtx,
  kyteId: string,
  status: ModerationStatus,
): Promise<void> {
  const kyte = await ctx.store.kyteById(kyteId);
  if (!kyte) throw new TRPCError({ code: "NOT_FOUND", message: "Kyte not found." });
  await ctx.store.setKyteModeration(kyteId, status);
  const suspended = status === "SUSPENDED";
  if (!suspended) await ctx.store.cancelPendingSchedules(kyteId, { overdueOnly: true });
  await afterModerationChange(kyteId, kyte.username, suspended);
}

async function moderateKyte(
  ctx: AdminCtx,
  input: { kyteId: string; status: ModerationStatus; reason: string },
  action: AuditAction,
  summary: string,
): Promise<void> {
  const kyte = await ctx.store.kyteById(input.kyteId);
  if (!kyte) throw new TRPCError({ code: "NOT_FOUND", message: "Kyte not found." });
  const wasSuspended = kyte.moderationStatus === "SUSPENDED";
  await applyModerationStatus(ctx, input.kyteId, input.status);
  // Owners hear about admin decisions the same way they hear about automated
  // ones — a silent takedown or restore reads as a glitch. Never let a failed
  // send undo the status change that already happened.
  try {
    const modStore = createPrismaModerationStore(logger);
    if (input.status === "SUSPENDED" && !wasSuspended) {
      await modStore.notifySuspendedOwners(kyte.id, kyte.username, input.reason);
    } else if (input.status === "APPROVED" && wasSuspended) {
      await modStore.notifyRestoredOwners(kyte.id, kyte.username);
    }
  } catch (error) {
    logger.warn({ err: error, kyteId: kyte.id }, "moderation decision email failed to send");
  }
  await recordAdminAction(ctx.store, ctx.user, {
    action,
    summary: kyte.username ? `${summary} @${kyte.username}` : summary,
    reason: input.reason,
    orgId: kyte.orgId,
    kyteId: kyte.id,
    meta: { moderationStatus: input.status },
  });
}

async function applyOrgSuspension(
  ctx: AdminCtx,
  input: { orgId: string; suspended: boolean; reason: string; cause: string | null },
): Promise<void> {
  await ctx.store.setOrgSuspension({
    orgId: input.orgId,
    suspended: input.suspended,
    reason: input.reason,
    actorEmail: ctx.user.email,
    cause: input.cause,
  });
  await afterOrgModerationChange(
    await ctx.store.listOrgKyteHandles(input.orgId),
    input.suspended,
  );
}

async function setOrgSuspension(
  ctx: AdminCtx,
  input: { orgId: string; reason: string },
  suspended: boolean,
): Promise<void> {
  const org = await ctx.store.orgById(input.orgId);
  if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  await applyOrgSuspension(ctx, { orgId: org.id, suspended, reason: input.reason, cause: null });
  await recordAdminAction(ctx.store, ctx.user, {
    action: suspended ? "admin.org.suspend" : "admin.org.unsuspend",
    summary: `${suspended ? "Suspended" : "Restored"} ${org.name}`,
    reason: input.reason,
    orgId: org.id,
    meta: { orgName: org.name },
  });
}

/**
 * Best-effort by design: a failed S3 call must never block the row delete —
 * whatever survives shows up on the storage orphans screen and is reclaimable
 * from there.
 */
async function deleteKyteObjects(kyteId: string, uploads: boolean): Promise<void> {
  if (!uploads) return;
  const prefixes = [
    liveKyteObjectPrefix(kyteId),
    quarantineKyteObjectPrefix(kyteId),
    rawKyteObjectPrefix(kyteId),
  ];
  for (const prefix of prefixes) {
    const keys = await listObjectsByPrefix(prefix).catch(() => [] as string[]);
    for (const key of keys) await deleteObject(key).catch(() => undefined);
  }
}

async function purgeDeletedKyteCaches(usernames: string[]): Promise<void> {
  if (usernames.length === 0) return;
  const redis = getRedis();
  for (const username of usernames) {
    await clearKyteMembership(redis, username);
    await redis.del(`profile:${username}`);
  }
  await enqueueRevalidate({ paths: usernames.map((username) => `/${username}`), reason: "kyte-deleted" });
  await enqueueSitemapRefresh("kyte-deleted");
}

/**
 * Suspending a person suspends every org they belong to, at any role — that is
 * what takes their pages down, since serving reads the org. An org an admin had
 * already suspended directly is left alone, so restoring this user cannot
 * quietly undo someone else's decision.
 */
async function setUserStatus(
  ctx: AdminCtx,
  input: { userId: string; status: UserStatus; reason: string },
): Promise<void> {
  const target = await ctx.store.userById(input.userId);
  if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });

  const suspending = input.status === "SUSPENDED";
  if (suspending && target.id === ctx.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot suspend your own account.",
    });
  }
  // ADMIN_EMAILS is the source of truth: User.role is only promoted to ADMIN on
  // a successful sign-in, so an allow-listed admin who hasn't logged in since
  // being added still reads as USER — and suspending them would take the whole
  // admin surface read-only for them.
  const adminByAllowList = ctx.config.adminEmails.has(target.email.trim().toLowerCase());
  if (suspending && (target.role === "ADMIN" || adminByAllowList)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Platform admins cannot be suspended — remove the account from ADMIN_EMAILS first.",
    });
  }

  await ctx.store.setUserStatus({
    userId: target.id,
    status: input.status,
    reason: input.reason,
    actorEmail: ctx.user.email,
  });

  const cascadedOrgIds: string[] = [];
  for (const orgId of await ctx.store.orgIdsForUser(target.id)) {
    const org = await ctx.store.orgById(orgId);
    if (!org) continue;
    if (suspending) {
      if (org.suspendedAt !== null) continue;
      await applyOrgSuspension(ctx, {
        orgId,
        suspended: true,
        reason: input.reason,
        cause: userSuspensionCause(target.id),
      });
    } else {
      if (!isUserSuspensionCause(org.suspensionCause, target.id)) continue;
      await applyOrgSuspension(ctx, {
        orgId,
        suspended: false,
        reason: input.reason,
        cause: null,
      });
    }
    cascadedOrgIds.push(orgId);
  }

  await recordAdminAction(ctx.store, ctx.user, {
    action: suspending ? "admin.user.suspend" : "admin.user.unsuspend",
    summary: `${suspending ? "Suspended" : "Restored"} ${target.email}`,
    reason: input.reason,
    meta: {
      targetUserId: target.id,
      targetEmail: target.email,
      status: input.status,
      cascadedOrgIds,
    },
  });
}

/**
 * The scorched-earth path. Unlike suspension there is nothing to restore:
 * every org they own is deleted with its kytes and files, the account row
 * goes with them, and the email lands on the denylist so it cannot sign up
 * again. Orgs they merely belong to are left alone — only their membership
 * disappears with the User row.
 */
async function banUser(
  ctx: AdminCtx,
  input: { userId: string; reason: string },
): Promise<void> {
  const target = await ctx.store.userById(input.userId);
  if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
  if (target.id === ctx.user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You cannot ban your own account." });
  }
  const adminByAllowList = ctx.config.adminEmails.has(target.email.trim().toLowerCase());
  if (target.role === "ADMIN" || adminByAllowList) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Platform admins cannot be banned — remove the account from ADMIN_EMAILS first.",
    });
  }

  const deletedOrgIds: string[] = [];
  const deletedUsernames: string[] = [];
  for (const membership of await ctx.store.membershipsForUser(target.id)) {
    if (membership.role !== "OWNER") continue;
    for (const kyte of await ctx.store.listKytesByOrg(membership.orgId)) {
      await deleteKyteObjects(kyte.id, ctx.config.capabilities.uploads);
      if (kyte.username) deletedUsernames.push(kyte.username);
    }
    await ctx.store.deleteOrg(membership.orgId);
    deletedOrgIds.push(membership.orgId);
  }

  await ctx.store.banEmail({
    email: target.email,
    reason: input.reason,
    actorEmail: ctx.user.email,
  });
  await ctx.store.invalidateUserSessions(target.id);
  await ctx.store.deleteUser(target.id);
  await purgeDeletedKyteCaches(deletedUsernames);

  await recordAdminAction(ctx.store, ctx.user, {
    action: "admin.user.ban",
    summary: `Banned ${target.email} and erased their account`,
    reason: input.reason,
    meta: {
      targetUserId: target.id,
      targetEmail: target.email,
      deletedOrgIds,
      deletedUsernames,
    },
  });
}

export const adminRouter = router({
  me: admin.output(adminMeSchema).query(async ({ ctx }) => {
    const user = await ctx.store.userById(ctx.user.id);
    return {
      userId: ctx.user.id,
      email: user?.email ?? ctx.user.email,
      name: user?.name ?? null,
      role: user?.role ?? "ADMIN",
    };
  }),

  overview: admin
    .output(overviewStatsSchema)
    .query(({ ctx }) => queries.overview(getDb(), ctx.config.capabilities)),

  live: admin.output(liveStatsSchema).query(({ ctx }) => {
    if (!ctx.config.capabilities.analytics) throw featureDisabled("Analytics is disabled.");
    return queries.live(getDb());
  }),

  platformSeries: admin
    .input(platformSeriesInput)
    .output(platformSeriesOutput)
    .query(async ({ ctx, input }) => {
      if (!ctx.config.capabilities.analytics) throw featureDisabled("Analytics is disabled.");
      const points = await ctx.ch.platformSeries({ days: input.days });
      return { points };
    }),

  trafficSeries: admin
    .input(trafficRangeInput)
    .output(trafficSeriesOutput)
    .query(({ ctx, input }) => {
      if (!ctx.config.capabilities.analytics) throw featureDisabled("Analytics is disabled.");
      return trafficSeries(resolveRange(input));
    }),

  topKytes: admin
    .input(topKytesInput)
    .output(topKytesOutput)
    .query(async ({ ctx, input }) => {
      if (!ctx.config.capabilities.analytics) throw featureDisabled("Analytics is disabled.");
      const kytes = await topKytes(getDb(), resolveRange(input), input.limit);
      return { kytes };
    }),

  trafficBreakdown: admin
    .input(trafficRangeInput)
    .output(trafficBreakdownSchema)
    .query(({ ctx, input }) => {
      if (!ctx.config.capabilities.analytics) throw featureDisabled("Analytics is disabled.");
      return trafficBreakdown(resolveRange(input));
    }),

  // Never FEATURE_DISABLED: the Postgres half of this screen (signups, kytes
  // created, launches) is the half the founder reads, and it is always there.
  growth: admin
    .input(growthInput)
    .output(growthStatsSchema)
    .query(({ ctx, input }) => growth(getDb(), ctx.config.capabilities, input.days)),

  searchUsers: admin
    .input(searchUsersInput)
    .output(pagedOutput(userSummarySchema))
    .query(({ input }) => queries.searchUsers(getDb(), input)),

  userDetail: admin
    .input(userDetailInput)
    .output(userDetailSchema.nullable())
    .query(({ input }) => queries.userDetail(getDb(), input.userId)),

  setUserLimits: admin
    .input(setUserLimitsInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      await queries.setUserLimits(getDb(), input);
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.user.limits",
        summary: "Changed per-user org limits",
        meta: {
          targetUserId: input.userId,
          maxOwnedOrgs: input.maxOwnedOrgs,
          maxJoinedOrgs: input.maxJoinedOrgs,
        },
      });
      return { ok: true } as const;
    }),

  setUserStatus: admin
    .input(setUserStatusInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      await setUserStatus(ctx, input);
      return { ok: true } as const;
    }),

  banUser: admin
    .input(banUserInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      await banUser(ctx, input);
      return { ok: true } as const;
    }),

  forceLogoutUser: admin
    .input(userIdInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await ctx.store.userById(input.userId);
      await ctx.store.invalidateUserSessions(input.userId);
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.user.force-logout",
        summary: `Signed out every session for ${target?.email ?? input.userId}`,
        meta: { targetUserId: input.userId },
      });
      return { ok: true } as const;
    }),

  searchOrgs: admin
    .input(searchOrgsInput)
    .output(pagedOutput(adminOrgSummarySchema))
    .query(({ input }) => queries.searchOrgs(getDb(), input)),

  orgDetail: admin
    .input(orgDetailInput)
    .output(orgDetailSchema.nullable())
    .query(({ input }) => queries.orgDetail(getDb(), input.orgId)),

  orgMembers: admin
    .input(orgMembersInput)
    .output(pagedOutput(adminOrgMemberSchema))
    .query(({ input }) => queries.orgMembers(getDb(), input)),

  orgKytes: admin
    .input(orgKytesInput)
    .output(pagedOutput(orgKyteRowSchema))
    .query(({ input }) => queries.orgKytes(getDb(), input)),

  recentKytes: admin
    .input(recentKytesInput)
    .output(recentKytesOutput)
    .query(({ input }) => queries.recentKytes(getDb(), input.days)),

  setOrgLimits: admin
    .input(setOrgLimitsInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      // These two are per-user limits with no Organization column, so the store
      // would drop them and we'd still audit the change as if it landed.
      const perUserKeys = input.overrides.filter(
        (override) => override.key === "orgsOwnedPerUser" || override.key === "orgsJoinedPerUser",
      );
      if (perUserKeys.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Orgs-per-user limits belong to a user, not an org — use setUserLimits.",
        });
      }
      await ctx.store.setOrgLimits(input.orgId, input.overrides);
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.org.limits",
        summary: "Changed organization limits",
        orgId: input.orgId,
        meta: { overrides: input.overrides },
      });
      return { ok: true } as const;
    }),

  suspendOrg: admin
    .input(orgSuspensionActionInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      await setOrgSuspension(ctx, input, true);
      return { ok: true } as const;
    }),

  unsuspendOrg: admin
    .input(orgSuspensionActionInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      await setOrgSuspension(ctx, input, false);
      return { ok: true } as const;
    }),

  kyteDetail: admin
    .input(kyteIdInput)
    .output(kyteDetailSchema.nullable())
    .query(({ ctx, input }) =>
      queries.kyteDetail(getDb(), input.kyteId, {
        apiBaseUrl: ctx.config.apiBaseUrl,
        analytics: ctx.config.capabilities.analytics,
        webBaseUrl: ctx.config.webBaseUrl,
      }),
    ),

  kytePublishedSnapshot: admin
    .input(kyteIdInput)
    .output(kytePublishedSnapshotSchema.nullable())
    .query(({ ctx, input }) =>
      queries.kytePublishedSnapshot(getDb(), input.kyteId, ctx.config.webBaseUrl, ctx.config.apiBaseUrl),
    ),

  suspendKyte: admin
    .input(kyteModerationActionInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      await moderateKyte(
        ctx,
        { ...input, status: "SUSPENDED" },
        "admin.kyte.suspend",
        "Suspended kyte",
      );
      return { ok: true } as const;
    }),

  unsuspendKyte: admin
    .input(kyteModerationActionInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      await moderateKyte(
        ctx,
        { ...input, status: "APPROVED" },
        "admin.kyte.unsuspend",
        "Restored kyte",
      );
      return { ok: true } as const;
    }),

  upholdKyteSuspension: admin
    .input(upholdKyteSuspensionInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const published = await db.publishedKyte.findUnique({
        where: { kyteId: input.kyteId },
        select: { contentHash: true, moderationStatus: true, username: true },
      });
      if (!published) {
        throw new TRPCError({ code: "NOT_FOUND", message: "This kyte has never been published." });
      }
      if (published.moderationStatus !== "SUSPENDED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only a currently suspended kyte can have its suspension upheld.",
        });
      }
      const reason =
        input.note && input.note.length > 0
          ? input.note
          : "Suspension upheld — reviewed by an admin in review mode.";
      // The review row is what makes the decision durable: provider "admin" +
      // reviewedBy marks this suspension as human-settled, and the review deck
      // excludes settled ones.
      await db.moderationReview.create({
        data: {
          kyteId: input.kyteId,
          contentHash: published.contentHash ?? "",
          verdict: "SUSPEND",
          categories: [],
          reason,
          provider: "admin",
          confidence: null,
          signals: {},
          reviewedBy: ctx.user.email,
        },
      });
      const kyte = await ctx.store.kyteById(input.kyteId);
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.kyte.uphold",
        summary: published.username
          ? `Upheld the suspension of @${published.username}`
          : "Upheld a kyte suspension",
        reason,
        ...(kyte ? { orgId: kyte.orgId } : {}),
        kyteId: input.kyteId,
        meta: {},
      });
      return { ok: true } as const;
    }),

  deleteKyte: admin
    .input(kyteModerationActionInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const kyte = await ctx.store.kyteById(input.kyteId);
      if (!kyte) throw new TRPCError({ code: "NOT_FOUND", message: "Kyte not found." });
      const org = await ctx.store.orgById(kyte.orgId);
      // Deletion is gated on an existing suspension so it stays a two-step act:
      // one decision takes the page down, a separate one erases it for good.
      if (kyte.moderationStatus !== "SUSPENDED" && org?.suspendedAt == null) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Only suspended kytes can be permanently deleted — suspend it first.",
        });
      }
      await deleteKyteObjects(kyte.id, ctx.config.capabilities.uploads);
      await ctx.store.deleteKyte({ kyteId: kyte.id, actorUserId: ctx.user.id });
      await purgeDeletedKyteCaches(kyte.username ? [kyte.username] : []);
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.kyte.delete",
        summary: kyte.username
          ? `Permanently deleted @${kyte.username}`
          : "Permanently deleted a kyte",
        reason: input.reason,
        orgId: kyte.orgId,
        kyteId: kyte.id,
        meta: { username: kyte.username },
      });
      return { ok: true } as const;
    }),

  forceReReviewKyte: admin
    .input(kyteIdInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const kyte = await ctx.store.kyteById(input.kyteId);
      const modStore = createPrismaModerationStore(logger);
      await forceReReviewKyte(modStore, createProviderFromEnv(), logger, input.kyteId, ctx.user.email);
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.kyte.re-review",
        summary: kyte?.username ? `Queued a re-review of @${kyte.username}` : "Queued a re-review",
        orgId: kyte?.orgId ?? null,
        kyteId: input.kyteId,
      });
      return { ok: true } as const;
    }),

  sweepAllKytes: admin
    .output(sweepAllKytesOutput)
    .mutation(async ({ ctx }) => {
      const redis = getRedis();
      const running = await readSweepProgress(redis);
      // The queue is the authority on "already running" — a progress blob left
      // unfinished by a killed process must not disable the button forever, and
      // a cancelled blob is finished, so neither one blocks a fresh start.
      if (running && running.finishedAt === null && (await isModerationSweepQueued())) {
        return { started: false, progress: running };
      }

      const publishedKytes = await getDb().publishedKyte.count();
      const runId = randomUUID();
      const progress = initialSweepProgress(publishedKytes, ctx.user.email, runId);
      // A cancel aimed at the run this one replaces must not reach this one.
      await clearSweepCancel(redis);
      await writeSweepProgress(redis, progress);
      await enqueueModerationSweep(ctx.user.email, runId);
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.moderation.sweep",
        summary: `Queued an AI re-review of ${publishedKytes} published kytes`,
        meta: { publishedKytes, runId },
      });
      return { started: true, progress };
    }),

  sweepStatus: admin.output(moderationSweepStatusOutput).query(() => readSweepStatus()),

  cancelSweep: admin.output(moderationSweepStatusOutput).mutation(async ({ ctx }) => {
    const redis = getRedis();
    const progress = await readSweepProgress(redis);
    if (!progress || progress.finishedAt !== null) return readSweepStatus();

    await requestSweepCancel(redis, { runId: progress.runId, by: ctx.user.email });
    // A job still sitting in the queue will never reach the flag on its own, so
    // drop it and close the blob out here instead of leaving a run nobody runs.
    if (await removeQueuedModerationSweep()) {
      await writeSweepProgress(redis, {
        ...progress,
        state: "cancelled",
        cancelledBy: ctx.user.email,
        finishedAt: new Date().toISOString(),
      });
      await clearSweepCancel(redis);
    }
    taggedLogger("moderation").warn(
      { runId: progress.runId, processed: progress.processed, by: ctx.user.email },
      "admin moderation sweep cancel requested",
    );
    await recordAdminAction(ctx.store, ctx.user, {
      action: "admin.moderation.sweep.cancel",
      summary: `Cancelled the running re-review after ${progress.processed} of ${progress.total} kytes`,
      meta: { runId: progress.runId, processed: progress.processed, total: progress.total },
    });
    return readSweepStatus();
  }),

  deleteAsset: admin
    .input(deleteAssetInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.store.getAsset(input.assetId);
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "File not found." });
      const kyte = await ctx.store.kyteById(asset.kyteId);
      // Drop the bytes, not just the row: an admin deleting abusive content
      // expects it off the CDN, and a row-only delete also loses the object
      // from storage accounting so nothing ever reclaims it.
      if (ctx.config.capabilities.uploads) {
        await deleteObject(asset.key).catch(() => undefined);
        await deleteObject(buildLqipKey(asset.key)).catch(() => undefined);
      }
      await ctx.store.removeAsset(input.assetId);
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.asset.delete",
        summary: `Deleted a ${asset.kind === "AVATAR" ? "avatar" : "file"} (${asset.sizeBytes} bytes)`,
        reason: input.reason,
        orgId: kyte?.orgId ?? null,
        kyteId: asset.kyteId,
        meta: { assetId: asset.id, key: asset.key, sizeBytes: asset.sizeBytes },
      });
      return { ok: true } as const;
    }),

  moderationQueue: admin
    .input(moderationQueueInput)
    .output(moderationQueueOutput)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.store.moderationQueue({ status: input.status, limit: input.limit });
      return {
        items: rows.map((row) => ({
          kyteId: row.kyteId,
          username: row.username,
          status: row.status,
          flaggedAt: row.flaggedAt.toISOString(),
        })),
      };
    }),

  setKyteModeration: admin
    .input(setKyteModerationInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const action: AuditAction =
        input.status === "SUSPENDED" ? "admin.kyte.suspend" : "admin.kyte.unsuspend";
      await moderateKyte(ctx, input, action, `Set kyte moderation to ${input.status}`);
      return { ok: true } as const;
    }),

  suspendedList: admin
    .input(suspendedListInput)
    .output(pagedOutput(suspendedRowSchema))
    .query(({ input }) => queries.suspendedList(getDb(), input)),

  moderationCounts: admin
    .output(moderationCountsSchema)
    .query(() => queries.moderationCounts(getDb())),

  moderationInsights: admin
    .input(moderationInsightsInput)
    .output(moderationInsightsSchema)
    .query(({ input }) => queries.moderationInsights(getDb(), input)),

  abuseReports: admin
    .input(abuseReportsInput)
    .output(pagedOutput(abuseReportRowSchema))
    .query(({ ctx, input }) => queries.abuseReports(getDb(), input, ctx.config.webBaseUrl)),

  actionAbuseReport: admin
    .input(actionAbuseReportInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const target = await queries.abuseReportTarget(getDb(), input.reportId);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Report not found." });
      await queries.markAbuseReportReviewed(getDb(), input.reportId, input.action, ctx.user.email);

      if (target.kyteId && input.action === "suspend") {
        await moderateKyte(
          ctx,
          { kyteId: target.kyteId, status: "SUSPENDED", reason: input.reason },
          "admin.kyte.suspend",
          "Suspended kyte from a report",
        );
      }

      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.report.action",
        summary: `${input.action === "dismiss" ? "Dismissed" : "Actioned"} a report for @${target.username}`,
        reason: input.reason,
        kyteId: target.kyteId,
        meta: { reportId: input.reportId, reportAction: input.action },
      });
      return { ok: true } as const;
    }),

  resolveModerationTarget: admin
    .input(resolveModerationTargetInput)
    .output(resolveModerationTargetOutput)
    .query(({ ctx, input }) =>
      queries.resolveModerationTarget(getDb(), input.username, ctx.config.webBaseUrl),
    ),

  openModerationCase: admin
    .input(openModerationCaseInput)
    .output(openModerationCaseOutput)
    .mutation(async ({ ctx, input }) => {
      const handle = input.username.trim().replace(/^@/, "");
      const target = await queries.resolveModerationTarget(
        getDb(),
        handle,
        ctx.config.webBaseUrl,
      );

      const reportId = await queries.createAdminAbuseReport(getDb(), {
        username: target?.username ?? handle,
        reason: input.reason,
        details: input.details,
        openedBy: ctx.user.email,
      });

      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.report.open",
        summary: `Opened a moderation case for @${handle}`,
        reason: input.details,
        orgId: target?.orgId ?? null,
        kyteId: target?.kyteId ?? null,
        meta: { reportId, reportReason: input.reason, immediateAction: input.immediateAction },
      });

      if (input.immediateAction !== "none") {
        // A case can be filed against a handle that no longer resolves; the
        // immediate action is simply skipped rather than aimed at a guess.
        if (!target) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `The case was filed, but @${handle} no longer resolves to a kyte, so no action was applied.`,
          });
        }
        if (input.immediateAction === "suspend_kyte") {
          await moderateKyte(
            ctx,
            { kyteId: target.kyteId, status: "SUSPENDED", reason: input.details },
            "admin.kyte.suspend",
            "Suspended kyte",
          );
        } else if (input.immediateAction === "suspend_org") {
          await setOrgSuspension(ctx, { orgId: target.orgId, reason: input.details }, true);
        } else {
          if (!target.userId) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "The case was filed, but this kyte has no owner account to action.",
            });
          }
          await setUserStatus(ctx, {
            userId: target.userId,
            status: "SUSPENDED",
            reason: input.details,
          });
        }
      }

      return { ok: true, reportId } as const;
    }),

  appeals: admin
    .input(appealsInput)
    .output(pagedOutput(appealRowSchema))
    .query(({ input }) => queries.appeals(getDb(), input)),

  resolveAppeal: admin
    .input(resolveAppealInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const appeal = await queries.setAppealResolved(
        getDb(),
        input.appealId,
        input.status,
        ctx.user.email,
      );
      if (!appeal) throw new TRPCError({ code: "NOT_FOUND", message: "Appeal not found." });
      // The person who appealed always hears back — a decision that lands
      // silently is indistinguishable from being ignored. Send failures are
      // logged, never allowed to undo the resolution itself.
      try {
        const approved = input.status === "RESOLVED";
        const rendered = await renderAppealDecisionEmail({
          handle: appeal.handle,
          approved,
          ...(input.note ? { note: input.note } : {}),
        });
        await getEmailProvider().sendEmail({
          to: appeal.email,
          subject: appealDecisionSubject(appeal.handle),
          html: rendered.html,
          text: rendered.text,
        });
      } catch (error) {
        logger.warn({ err: error, appealId: input.appealId }, "appeal decision email failed to send");
      }
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.appeal.resolve",
        summary: `${input.status === "RESOLVED" ? "Resolved" : "Dismissed"} a ${appeal.kind} appeal for ${appeal.handle}`,
        meta: { appealId: input.appealId, appealKind: appeal.kind, status: input.status, note: input.note ?? null },
      });
      return { ok: true } as const;
    }),

  auditLog: admin
    .input(auditLogInput)
    .output(pagedOutput(auditLogRowSchema))
    .query(({ input }) => queries.auditLog(getDb(), input)),

  storageOverview: admin
    .output(storageOverviewSchema)
    .query(() => storage.storageOverview(getDb())),

  storageOrgs: admin
    .input(storageOrgsInput)
    .output(pagedOutput(storageOrgRowSchema))
    .query(({ input }) => storage.storageOrgs(getDb(), input)),

  storageOrgFiles: admin
    .input(storageOrgFilesInput)
    .output(storageOrgFilesOutput)
    .query(({ ctx, input }) => storage.storageOrgFiles(getDb(), input, ctx.config.apiBaseUrl)),

  storageOrphans: admin
    .input(storageOrphansInput)
    .output(pagedOutput(storageOrphanRowSchema))
    .query(({ input }) => storage.storageOrphans(getDb(), input)),

  alerts: admin
    .input(alertsInput)
    .output(alertsOutput)
    .query(({ input }) => queries.alerts(getDb(), input)),

  resolveAlert: admin
    .input(resolveAlertInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const alert = await queries.setAlertResolved(getDb(), input.alertId, ctx.user.email);
      if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found." });
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.alert.resolve",
        summary: `Resolved a ${alert.kind} alert`,
        meta: { alertId: input.alertId, kind: alert.kind },
      });
      return { ok: true } as const;
    }),

  unresolveAlert: admin
    .input(resolveAlertInput)
    .output(okSchema)
    .mutation(async ({ ctx, input }) => {
      const alert = await queries.setAlertResolved(getDb(), input.alertId, null);
      if (!alert) throw new TRPCError({ code: "NOT_FOUND", message: "Alert not found." });
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.alert.unresolve",
        summary: `Reopened a ${alert.kind} alert`,
        meta: { alertId: input.alertId, kind: alert.kind },
      });
      return { ok: true } as const;
    }),

  resolveAlertsByKind: admin
    .input(resolveAlertsByKindInput)
    .output(z.object({ ok: z.literal(true), resolved: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const resolved = await queries.resolveAlertsByKind(getDb(), input.kind, ctx.user.email);
      await recordAdminAction(ctx.store, ctx.user, {
        action: "admin.alert.resolve",
        summary: `Resolved ${resolved} ${input.kind} alerts`,
        meta: { kind: input.kind, resolved },
      });
      return { ok: true, resolved } as const;
    }),

  exportRows: admin
    .input(exportRowsInput)
    .output(exportRowsOutput)
    .query(async ({ ctx, input }) => {
      const result = await runExport(input.dataset, input.filters, {
        db: getDb(),
        webBaseUrl: ctx.config.webBaseUrl,
        apiBaseUrl: ctx.config.apiBaseUrl,
        limit: input.limit,
      });
      return {
        dataset: input.dataset,
        generatedAt: new Date().toISOString(),
        columns: result.columns,
        rows: result.rows,
        total: result.total,
        truncated: result.total > result.rows.length,
      };
    }),

  globalSearch: admin
    .input(globalSearchInput)
    .output(z.array(globalSearchResultSchema))
    .query(({ input }) => queries.globalSearch(getDb(), input.query, input.limit)),
});

import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  abuseReportReasonSchema,
  appealKindSchema,
  appealStatusSchema,
  auditActionSchema,
  capabilitiesSchema,
  deviceTypeSchema,
  isValidLimitOverride,
  LIMIT_OVERRIDE_CEILING,
  limitOverrideCeiling,
  type LimitKey,
  moderationStatusSchema,
  platformRoleSchema,
  reportStatusSchema,
  roleSchema,
  themeKeySchema,
  userStatusSchema,
} from "@kytelink/schemas";

const LIMIT_KEYS = [
  "kytesPerOrg",
  "peoplePerOrg",
  "orgsOwnedPerUser",
  "orgsJoinedPerUser",
  "schedulesPerKyte",
  "storageBytesPerOrg",
  "uploadMaxBytes",
] as const satisfies readonly LimitKey[];

const limitKeyEnum = z.enum(LIMIT_KEYS);

export const okSchema = z.object({ ok: z.literal(true) });

// Every admin list is page-numbered, never infinitely scrolled: support agents
// need a stable "page 3 of 12" they can return to and cite.
const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(100).default(DEFAULT_PAGE_SIZE),
});

const sortDirEnum = z.enum(["asc", "desc"]);

export function pagedOutput<T extends z.ZodTypeAny>(row: T) {
  return z.object({
    rows: z.array(row),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  });
}

const reasonInput = z.string().trim().min(3).max(500);

export const adminMeSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.string(),
});

export const overviewStatsSchema = z.object({
  totalUsers: z.number(),
  totalOrgs: z.number(),
  totalKytes: z.number(),
  publishedKytes: z.number(),
  suspendedKytes: z.number(),
  suspendedUsers: z.number(),
  suspendedOrgs: z.number(),
  openReports: z.number(),
  openAppeals: z.number(),
  unresolvedAlerts: z.number(),
  signupsSeries: z.array(z.object({ date: z.string(), count: z.number() })),
  usersWeekTrendPct: z.number(),
  beaconIngestLagMs: z.number(),
  queueDepths: z.array(
    z.object({ queue: z.string(), depth: z.number(), deadLettered: z.number() }),
  ),
  capabilities: capabilitiesSchema,
});

export const liveStatsSchema = z.object({
  activeNow: z.number(),
  viewsPerMin: z.array(z.object({ minute: z.string(), count: z.number() })),
  clicksPerMin: z.array(z.object({ minute: z.string(), count: z.number() })),
  signupsToday: z.number(),
  publishesToday: z.number(),
  activeEditors: z.number(),
});

export const growthInput = z.object({
  days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
});

export const GROWTH_FUNNEL_STEPS = [
  "landing_views",
  "get_started_clicks",
  "signups",
  "onboarded",
  "launched",
] as const;

/**
 * Every rate on this screen names its own numerator and denominator: `count`
 * over the `count` of the step at `ofKey`, in units of `unit`, sourced from
 * `source`. Two of the five steps come from ClickHouse and are therefore
 * `null` on a deployment with analytics off — the Postgres ones never are, so
 * the founder-facing numbers (signups, launches) always render.
 */
const growthFunnelStepSchema = z.object({
  key: z.enum(GROWTH_FUNNEL_STEPS),
  count: z.number().nullable(),
  unit: z.enum(["views", "clicks", "users", "kytes"]),
  source: z.enum(["clickhouse", "postgres"]),
  ratePct: z.number().nullable(),
  ofKey: z.enum(GROWTH_FUNNEL_STEPS).nullable(),
});

const growthPathRowSchema = z.object({
  path: z.string(),
  views: z.number(),
  sharePct: z.number(),
});

const growthSurfaceRowSchema = z.object({
  surface: z.string(),
  clicks: z.number(),
  sharePct: z.number(),
});

/**
 * Activation is measured on the cohort of kytes CREATED in the window, not on
 * traffic in the window — "did the thing this person made go anywhere" only
 * means something per-kyte. `measuredKytes` is below `cohortKytes` when the
 * cohort exceeds the per-query cap, and `capped` says so out loud.
 */
const growthActivationSchema = z.object({
  cohortKytes: z.number(),
  measuredKytes: z.number(),
  capped: z.boolean(),
  launched: z.number(),
  launchedPct: z.number(),
  withTenClicks: z.number().nullable(),
  withTenClicksPct: z.number().nullable(),
  withTenViews: z.number().nullable(),
  withTenViewsPct: z.number().nullable(),
  medianClicks: z.number().nullable(),
});

export const growthStatsSchema = z.object({
  days: z.number().int(),
  since: z.string(),
  analytics: z.boolean(),
  funnel: z.array(growthFunnelStepSchema),
  landingPages: z.array(growthPathRowSchema),
  /** When `hit_landing` first carried a path — before it, paths are unknowable. */
  landingPathsSince: z.string().nullable(),
  getStartedSurfaces: z.array(growthSurfaceRowSchema),
  activation: growthActivationSchema,
  series: z.array(
    z.object({
      date: z.string(),
      signups: z.number(),
      kytesCreated: z.number(),
      launched: z.number(),
    }),
  ),
});

export const platformSeriesInput = z.object({
  days: z.number().int().min(1).max(365).default(30),
});
export const platformSeriesOutput = z.object({
  points: z.array(
    z.object({
      date: z.string(),
      views: z.number(),
      clicks: z.number(),
      uniqKytes: z.number(),
    }),
  ),
});

// A range is always explicit (ISO instants) so the UI can offer real
// date+time pickers instead of only 24h/7d/30d presets. `granularity` is what
// the caller wants; the resolver may coarsen it for very wide ranges and says
// so in the output.
const trafficGranularityEnum = z.enum(["hour", "day", "week"]);

export const trafficRangeInput = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  granularity: trafficGranularityEnum.default("day"),
});

export const trafficSeriesOutput = z.object({
  granularity: trafficGranularityEnum,
  points: z.array(
    z.object({
      bucket: z.string(),
      views: z.number(),
      clicks: z.number(),
      visitors: z.number(),
    }),
  ),
  totals: z.object({
    views: z.number(),
    clicks: z.number(),
    visitors: z.number(),
    ctrPct: z.number(),
    botPct: z.number(),
  }),
  previousTotals: z.object({
    views: z.number(),
    clicks: z.number(),
    visitors: z.number(),
  }),
});

export const topKytesInput = trafficRangeInput.extend({
  limit: z.number().int().min(1).max(100).default(20),
});
export const topKytesOutput = z.object({
  kytes: z.array(
    z.object({
      kyteId: z.string(),
      orgId: z.string(),
      username: z.string().nullable(),
      displayName: z.string().nullable(),
      views: z.number(),
      clicks: z.number(),
    }),
  ),
});

export const trafficBreakdownSchema = z.object({
  referrers: z.array(z.object({ refDomain: z.string(), views: z.number() })),
  countries: z.array(z.object({ country: z.string(), views: z.number() })),
  devices: z.array(z.object({ device: deviceTypeSchema, views: z.number() })),
  hourOfDay: z.array(z.object({ hour: z.number(), views: z.number() })),
});

export const userSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  createdAt: z.string(),
  orgCount: z.number(),
  kyteCount: z.number(),
  storageBytes: z.number(),
  status: userStatusSchema,
  statusReason: z.string().nullable(),
});

export const userDetailSchema = userSummarySchema.extend({
  memberships: z.array(
    z.object({
      orgId: z.string(),
      orgName: z.string(),
      role: roleSchema,
      effectiveRole: roleSchema,
      kyteCount: z.number(),
      storageBytes: z.number(),
    }),
  ),
  passkeyCount: z.number(),
  sessionCount: z.number(),
  invitesSent: z.number(),
  invitesReceived: z.number(),
  maxOwnedOrgsOverride: z.number().nullable(),
  maxJoinedOrgsOverride: z.number().nullable(),
  statusChangedAt: z.string().nullable(),
  statusChangedBy: z.string().nullable(),
  lastSessionAt: z.string().nullable(),
  // The UI disables suspend on platform admins rather than letting the admin
  // discover the server's refusal as an error, and quotes an exact count in the
  // confirmation ("all 3 of their published kytes go offline").
  platformRole: platformRoleSchema,
  publishedKyteCount: z.number(),
});

const userSortEnum = z.enum(["createdAt", "email", "name", "storageBytes", "orgCount"]);

export const searchUsersInput = paginationInput.extend({
  query: z.string().default(""),
  status: userStatusSchema.optional(),
  sort: userSortEnum.default("createdAt"),
  dir: sortDirEnum.default("desc"),
});

export const userDetailInput = z.object({ userId: z.string().min(1) });
export const setUserLimitsInput = z.object({
  userId: z.string().min(1),
  maxOwnedOrgs: z.number().int().min(0).max(LIMIT_OVERRIDE_CEILING).nullable(),
  maxJoinedOrgs: z.number().int().min(0).max(LIMIT_OVERRIDE_CEILING).nullable(),
});
export const userIdInput = z.object({ userId: z.string().min(1) });

// Suspend and restore both flow through one mutation so the audit trail, the
// reason requirement, and the org cascade can never diverge between them. The
// cascade is not optional: suspending a person always suspends the orgs they
// belong to, and restoring only un-suspends the ones that cascade created.
export const setUserStatusInput = z.object({
  userId: z.string().min(1),
  status: userStatusSchema,
  reason: reasonInput,
});

export const adminOrgSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  personal: z.boolean(),
  createdAt: z.string(),
  ownerUserId: z.string().nullable(),
  ownerEmail: z.string(),
  kyteCount: z.number(),
  publishedKyteCount: z.number(),
  memberCount: z.number(),
  storageBytes: z.number(),
  storageLimitBytes: z.number().nullable(),
  suspendedAt: z.string().nullable(),
});

export const adminOrgMemberSchema = z.object({
  membershipId: z.string(),
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: roleSchema,
  userStatus: userStatusSchema,
  joinedAt: z.string(),
});

export const orgKyteRowSchema = z.object({
  id: z.string(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  published: z.boolean(),
  moderationStatus: moderationStatusSchema,
  createdAt: z.string(),
  storageBytes: z.number(),
  assetCount: z.number(),
});

const orgLimitOverridesSchema = z.object({
  kytesPerOrg: z.number().nullable(),
  peoplePerOrg: z.number().nullable(),
  schedulesPerKyte: z.number().nullable(),
  storageBytesPerOrg: z.number().nullable(),
  uploadMaxBytes: z.number().nullable(),
});

// Members and kytes moved to their own paginated procedures — an org with 400
// kytes must not make this payload unbounded.
export const orgDetailSchema = adminOrgSummarySchema.extend({
  suspendedKyteCount: z.number(),
  assetCount: z.number(),
  limitOverrides: orgLimitOverridesSchema,
  suspensionReason: z.string().nullable(),
  suspendedBy: z.string().nullable(),
  // null while suspended = a direct admin action; `user_<id>` = cascaded from
  // that user, so the org can only be restored by restoring them.
  suspensionCause: z.string().nullable(),
});

export const orgSuspensionActionInput = z.object({
  orgId: z.string().min(1),
  reason: reasonInput,
});

// The ceiling is per-key: byte limits are orders of magnitude above count
// limits, so a single shared max made storageBytesPerOrg/uploadMaxBytes
// impossible to set at all.
export const setOrgLimitsInput = z.object({
  orgId: z.string().min(1),
  overrides: z.array(
    z
      .object({
        key: limitKeyEnum,
        value: z.number().int().min(0).nullable(),
      })
      .superRefine((override, ctx) => {
        if (override.value === null) return;
        if (isValidLimitOverride(override.key, override.value)) return;
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: `${override.key} must be between 0 and ${limitOverrideCeiling(override.key)}.`,
        });
      }),
  ),
});

const orgSortEnum = z.enum([
  "createdAt",
  "name",
  "storageBytes",
  "kyteCount",
  "memberCount",
]);

export const searchOrgsInput = paginationInput.extend({
  query: z.string().default(""),
  sort: orgSortEnum.default("createdAt"),
  dir: sortDirEnum.default("desc"),
});

export const orgDetailInput = z.object({ orgId: z.string().min(1) });

export const orgMembersInput = paginationInput.extend({
  orgId: z.string().min(1),
  query: z.string().default(""),
});

export const orgKytesInput = paginationInput.extend({
  orgId: z.string().min(1),
  query: z.string().default(""),
  moderationStatus: moderationStatusSchema.optional(),
  sort: z.enum(["createdAt", "username", "storageBytes"]).default("createdAt"),
  dir: sortDirEnum.default("desc"),
});

const kyteAssetRowSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "avatar", "og"]),
  contentType: z.string(),
  sizeBytes: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  createdAt: z.string(),
  uploaderEmail: z.string().nullable(),
});

const kytePublishHistorySchema = z.object({
  seq: z.number(),
  publishedAt: z.string(),
  scheduled: z.boolean(),
});

const kyteModerationHistorySchema = z.object({
  id: z.string(),
  verdict: z.enum(["APPROVE", "SUSPEND"]),
  reason: z.string(),
  provider: z.string(),
  reviewedBy: z.string().nullable(),
  createdAt: z.string(),
});

export const kyteDetailSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  orgName: z.string(),
  ownerEmail: z.string(),
  ownerUserId: z.string().nullable(),
  ownerStatus: userStatusSchema,
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  theme: themeKeySchema,
  published: z.boolean(),
  publicUrl: z.string().nullable(),
  moderationStatus: moderationStatusSchema,
  createdAt: z.string(),
  storageBytes: z.number(),
  memberCount: z.number(),
  members: z.array(adminOrgMemberSchema),
  publishHistory: z.array(kytePublishHistorySchema),
  moderationHistory: z.array(kyteModerationHistorySchema),
  assets: z.array(kyteAssetRowSchema),
  trafficSparkline: z.array(z.object({ date: z.string(), views: z.number() })),
});

export const kyteIdInput = z.object({ kyteId: z.string().min(1) });
export const kyteModerationActionInput = z.object({
  kyteId: z.string().min(1),
  reason: reasonInput,
});
export const deleteAssetInput = z.object({
  assetId: z.string().min(1),
  reason: reasonInput,
});

export const moderationQueueInput = z.object({
  status: moderationStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
export const moderationQueueOutput = z.object({
  items: z.array(
    z.object({
      kyteId: z.string(),
      username: z.string().nullable(),
      status: moderationStatusSchema,
      flaggedAt: z.string(),
    }),
  ),
});

export const setKyteModerationInput = z.object({
  kyteId: z.string().min(1),
  status: moderationStatusSchema,
  reason: reasonInput,
});

const moderationSignalKeyEnum = z.enum([
  "sus_links",
  "sus_names",
  "sus_redirect",
  "sus_email_domain",
  "nsfw",
]);

const moderationSignalSchema = z.object({
  key: moderationSignalKeyEnum,
  label: z.string(),
  evidence: z.string(),
});

export const suspendedRowSchema = z.object({
  kyteId: z.string(),
  orgId: z.string(),
  userId: z.string().nullable(),
  username: z.string().nullable(),
  displayName: z.string().nullable(),
  email: z.string(),
  userStatus: userStatusSchema,
  suspendedAt: z.string(),
  // Which scope actually took this kyte down. The old APPROVED/SUSPENDED/BANNED
  // "category" carried no information once ban was dropped, and org-suspended
  // kytes keep moderationStatus APPROVED, so the list has to say so.
  scope: z.enum(["kyte", "org"]),
  source: z.enum(["auto", "seed-sweep", "manual"]),
  signals: z.array(moderationSignalSchema),
  reasonOrNote: z.string(),
  reviewedBy: z.string().nullable(),
  confidence: z.number().nullable(),
  reportCount: z.number(),
});

/**
 * Aggregates behind the moderation Patterns page. The reports table only ever
 * holds a page at a time, so trends and repeat-offender grouping have to be
 * computed server-side or they'd only describe the current page.
 */
export const moderationInsightsInput = z.object({
  days: z.number().int().min(7).max(90).default(30),
});

export const moderationInsightsSchema = z.object({
  days: z.number().int(),
  totalInWindow: z.number().int(),
  openInWindow: z.number().int(),
  actionedInWindow: z.number().int(),
  medianPerDay: z.number(),
  busiestDate: z.string().nullable(),
  busiestCount: z.number().int(),
  perDay: z.array(
    z.object({
      date: z.string(),
      reports: z.number().int(),
      openReports: z.number().int(),
    }),
  ),
  byReason: z.array(
    z.object({
      reason: abuseReportReasonSchema,
      reports: z.number().int(),
      openReports: z.number().int(),
    }),
  ),
  repeatTargets: z.array(
    z.object({
      username: z.string(),
      kyteId: z.string().nullable(),
      orgId: z.string().nullable(),
      ownerEmail: z.string().nullable(),
      reports: z.number().int(),
      openReports: z.number().int(),
      reporters: z.number().int(),
      moderationStatus: moderationStatusSchema.nullable(),
      lastReportedAt: z.string(),
    }),
  ),
  ownerDomains: z.array(
    z.object({
      domain: z.string(),
      reports: z.number().int(),
      accounts: z.number().int(),
      suspendedAccounts: z.number().int(),
    }),
  ),
  reporters: z.array(
    z.object({
      fingerprint: z.string(),
      reports: z.number().int(),
      targets: z.number().int(),
      dismissed: z.number().int(),
    }),
  ),
});

export const suspendedListInput = paginationInput.extend({
  search: z.string().default(""),
  signals: z.array(moderationSignalKeyEnum).optional(),
  scope: z.enum(["kyte", "org"]).optional(),
  source: z.enum(["auto", "seed-sweep", "manual"]).optional(),
  sort: z.enum(["suspendedAt", "username", "confidence"]).default("suspendedAt"),
  dir: sortDirEnum.default("desc"),
});

export const abuseReportRowSchema = z.object({
  id: z.string(),
  kyteId: z.string(),
  orgId: z.string(),
  userId: z.string().nullable(),
  username: z.string().nullable(),
  ownerEmail: z.string().nullable(),
  reportedUrl: z.string(),
  reason: abuseReportReasonSchema,
  details: z.string(),
  reportCountForKyte: z.number(),
  kyteModerationStatus: moderationStatusSchema.nullable(),
  userStatus: userStatusSchema.nullable(),
  status: reportStatusSchema,
  createdAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  openedByAdmin: z.boolean(),
});

export const abuseReportsInput = paginationInput.extend({
  status: reportStatusSchema.optional(),
  reason: abuseReportReasonSchema.optional(),
  search: z.string().default(""),
  sort: z.enum(["createdAt", "reportCountForKyte"]).default("createdAt"),
  dir: sortDirEnum.default("desc"),
});

export const actionAbuseReportInput = z.object({
  reportId: z.string().min(1),
  action: z.enum(["suspend", "dismiss"]),
  reason: reasonInput,
});

// Powers the "Suspend user" modal: resolve a typed username to a real target,
// with everything the admin needs to be sure it's the right account before the
// destructive step.
export const resolveModerationTargetInput = z.object({ username: z.string().trim().min(1) });
export const resolveModerationTargetOutput = z
  .object({
    kyteId: z.string(),
    orgId: z.string(),
    orgName: z.string(),
    // So the admin can escalate from "suspend this kyte" to "suspend the whole
    // org" without leaving the modal, and can see the org is already down.
    orgSuspended: z.boolean(),
    orgPersonal: z.boolean(),
    username: z.string().nullable(),
    displayName: z.string().nullable(),
    publicUrl: z.string().nullable(),
    published: z.boolean(),
    moderationStatus: moderationStatusSchema,
    userId: z.string().nullable(),
    ownerEmail: z.string(),
    userStatus: userStatusSchema,
    // Lets the suspend-user confirmation name an exact blast radius instead of
    // a vague "all of their published kytes".
    ownerPublishedKyteCount: z.number(),
    openReportCount: z.number(),
    storageBytes: z.number(),
    createdAt: z.string(),
  })
  .nullable();

export const openModerationCaseInput = z.object({
  username: z.string().trim().min(1),
  reason: abuseReportReasonSchema,
  details: reasonInput,
  // "none" files the case only — the flag, with no enforcement attached.
  immediateAction: z
    .enum(["none", "suspend_kyte", "suspend_org", "suspend_user"])
    .default("none"),
});
export const openModerationCaseOutput = z.object({ ok: z.literal(true), reportId: z.string() });

export const appealRowSchema = z.object({
  id: z.string(),
  kind: appealKindSchema,
  handle: z.string(),
  email: z.string(),
  message: z.string(),
  status: appealStatusSchema,
  createdAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  // Resolved from `handle` at read time so the reviewer can jump straight to
  // the target; an appeal row itself never stores a foreign key, because the
  // person appealing may type anything.
  kyteId: z.string().nullable(),
  orgId: z.string().nullable(),
  userId: z.string().nullable(),
  suspended: z.boolean(),
});

export const appealsInput = paginationInput.extend({
  status: appealStatusSchema.optional(),
  kind: appealKindSchema.optional(),
  search: z.string().default(""),
  dir: sortDirEnum.default("desc"),
});

export const resolveAppealInput = z.object({
  appealId: z.string().min(1),
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

export const auditLogRowSchema = z.object({
  id: z.string(),
  action: auditActionSchema,
  actorEmail: z.string(),
  actorName: z.string().nullable(),
  isAdminAction: z.boolean(),
  orgId: z.string().nullable(),
  orgName: z.string().nullable(),
  kyteId: z.string().nullable(),
  summary: z.string(),
  createdAt: z.string(),
});

export const auditLogInput = paginationInput.extend({
  orgId: z.string().optional(),
  kyteId: z.string().optional(),
  actorEmail: z.string().default(""),
  search: z.string().default(""),
  action: auditActionSchema.optional(),
  scope: z.enum(["all", "admin", "product"]).default("all"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const storageOverviewSchema = z.object({
  bucketTotalBytes: z.number(),
  assetCount: z.number(),
  orgsWithStorage: z.number(),
  medianOrgBytes: z.number(),
  p95OrgBytes: z.number(),
  topTenSharePct: z.number(),
  orphanedBytes: z.number(),
  orphanedCount: z.number(),
  growthSeries: z.array(z.object({ date: z.string(), bytes: z.number() })),
});

export const storageOrgRowSchema = z.object({
  orgId: z.string(),
  orgName: z.string(),
  ownerUserId: z.string().nullable(),
  ownerEmail: z.string(),
  kyteCount: z.number(),
  assetCount: z.number(),
  bytes: z.number(),
  limitBytes: z.number().nullable(),
  pctOfLimit: z.number().nullable(),
  pctOfTotal: z.number(),
  largestAssetBytes: z.number(),
  lastUploadAt: z.string().nullable(),
});

export const storageOrgsInput = paginationInput.extend({
  query: z.string().default(""),
  sort: z.enum(["bytes", "assetCount", "pctOfLimit", "orgName"]).default("bytes"),
  dir: sortDirEnum.default("desc"),
  overLimitOnly: z.boolean().default(false),
});

const storageFileRowSchema = z.object({
  assetId: z.string(),
  kyteId: z.string(),
  kyteUsername: z.string().nullable(),
  kind: z.enum(["image", "avatar", "og"]),
  contentType: z.string(),
  sizeBytes: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  createdAt: z.string(),
  uploaderEmail: z.string().nullable(),
  orphaned: z.boolean(),
});

export const storageOrgFilesInput = paginationInput.extend({
  orgId: z.string().min(1),
  kyteId: z.string().optional(),
  kind: z.enum(["image", "avatar", "og"]).optional(),
  sort: z.enum(["sizeBytes", "createdAt"]).default("sizeBytes"),
  dir: sortDirEnum.default("desc"),
});

export const storageOrgFilesOutput = pagedOutput(storageFileRowSchema).extend({
  org: z.object({
    orgId: z.string(),
    orgName: z.string(),
    ownerUserId: z.string().nullable(),
    ownerEmail: z.string(),
    totalBytes: z.number(),
    limitBytes: z.number().nullable(),
    assetCount: z.number(),
    kyteCount: z.number(),
  }),
});

export const storageOrphansInput = paginationInput;
export const storageOrphanRowSchema = z.object({
  assetId: z.string(),
  kyteId: z.string(),
  kyteUsername: z.string().nullable(),
  orgId: z.string(),
  orgName: z.string(),
  sizeBytes: z.number(),
  createdAt: z.string(),
});

const alertRowSchema = z.object({
  id: z.string(),
  kind: z.string(),
  message: z.string(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  occurrences: z.number(),
  lastSeenAt: z.string(),
});

export const alertsInput = paginationInput.extend({
  status: z.enum(["unresolved", "resolved", "all"]).default("unresolved"),
  kind: z.string().optional(),
});

export const alertsOutput = pagedOutput(alertRowSchema).extend({
  counts: z.object({ unresolved: z.number(), resolved: z.number() }),
  kinds: z.array(z.object({ kind: z.string(), unresolved: z.number(), total: z.number() })),
});

export const resolveAlertInput = z.object({ alertId: z.string().min(1) });
export const resolveAlertsByKindInput = z.object({ kind: z.string().min(1) });

// One procedure backs every "Export" button. It returns plain columns+rows so
// the client can offer CSV / JSON / Markdown without the server guessing which
// format an admin wants to paste into an LLM.
export const EXPORT_DATASETS = [
  "users",
  "orgs",
  "orgKytes",
  "orgMembers",
  "suspended",
  "reports",
  "audit",
  "storageOrgs",
  "storageFiles",
  "storageOrphans",
  "alerts",
  "topKytes",
  "trafficSeries",
] as const;

export const exportDatasetEnum = z.enum(EXPORT_DATASETS);

export const exportRowsInput = z.object({
  dataset: exportDatasetEnum,
  // Serialized filter bag mirroring the list procedure's own input for the
  // dataset; unknown keys are ignored so a stale client can't 400 an export.
  filters: z.record(z.string(), z.unknown()).default({}),
  limit: z.number().int().min(1).max(5000).default(1000),
});

const exportCellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const exportRowsOutput = z.object({
  dataset: exportDatasetEnum,
  generatedAt: z.string(),
  columns: z.array(z.object({ key: z.string(), label: z.string() })),
  rows: z.array(z.record(z.string(), exportCellSchema)),
  total: z.number(),
  truncated: z.boolean(),
});

export const globalSearchResultSchema = z.object({
  kind: z.enum(["user", "org", "kyte"]),
  id: z.string(),
  label: z.string(),
  sublabel: z.string(),
  badge: z.string().nullable(),
  href: z.string(),
});
export const globalSearchInput = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(30).default(15),
});

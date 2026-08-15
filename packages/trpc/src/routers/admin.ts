import { z } from "zod";
import { adminProcedure, router } from "../trpc";
import { notImplemented } from "../errors";
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
  globalSearchInput,
  globalSearchResultSchema,
  growthInput,
  growthStatsSchema,
  kyteDetailSchema,
  kyteIdInput,
  kytePublishedSnapshotSchema,
  kyteModerationActionInput,
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
} from "./admin-shapes";

// The concrete resolvers live in apps/api/src/routers/admin.ts (they run
// against PrismaStore + ClickHouse). This frozen contract mirrors the full
// admin surface (13-admin.md); apps/api imports these exact I/O schemas so the
// bidirectional AppRouter conformance assertion proves the two never drift.
export const adminRouter = router({
  me: adminProcedure.output(adminMeSchema).query(() => {
    throw notImplemented("admin.me");
  }),

  overview: adminProcedure.output(overviewStatsSchema).query(() => {
    throw notImplemented("admin.overview");
  }),
  live: adminProcedure.output(liveStatsSchema).query(() => {
    throw notImplemented("admin.live");
  }),
  platformSeries: adminProcedure
    .input(platformSeriesInput)
    .output(platformSeriesOutput)
    .query(() => {
      throw notImplemented("admin.platformSeries");
    }),
  trafficSeries: adminProcedure
    .input(trafficRangeInput)
    .output(trafficSeriesOutput)
    .query(() => {
      throw notImplemented("admin.trafficSeries");
    }),
  topKytes: adminProcedure.input(topKytesInput).output(topKytesOutput).query(() => {
    throw notImplemented("admin.topKytes");
  }),
  trafficBreakdown: adminProcedure
    .input(trafficRangeInput)
    .output(trafficBreakdownSchema)
    .query(() => {
      throw notImplemented("admin.trafficBreakdown");
    }),
  growth: adminProcedure.input(growthInput).output(growthStatsSchema).query(() => {
    throw notImplemented("admin.growth");
  }),

  searchUsers: adminProcedure
    .input(searchUsersInput)
    .output(pagedOutput(userSummarySchema))
    .query(() => {
      throw notImplemented("admin.searchUsers");
    }),
  userDetail: adminProcedure
    .input(userDetailInput)
    .output(userDetailSchema.nullable())
    .query(() => {
      throw notImplemented("admin.userDetail");
    }),
  setUserLimits: adminProcedure.input(setUserLimitsInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.setUserLimits");
  }),
  setUserStatus: adminProcedure.input(setUserStatusInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.setUserStatus");
  }),
  forceLogoutUser: adminProcedure.input(userIdInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.forceLogoutUser");
  }),
  banUser: adminProcedure.input(banUserInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.banUser");
  }),

  searchOrgs: adminProcedure
    .input(searchOrgsInput)
    .output(pagedOutput(adminOrgSummarySchema))
    .query(() => {
      throw notImplemented("admin.searchOrgs");
    }),
  orgDetail: adminProcedure
    .input(orgDetailInput)
    .output(orgDetailSchema.nullable())
    .query(() => {
      throw notImplemented("admin.orgDetail");
    }),
  orgMembers: adminProcedure
    .input(orgMembersInput)
    .output(pagedOutput(adminOrgMemberSchema))
    .query(() => {
      throw notImplemented("admin.orgMembers");
    }),
  orgKytes: adminProcedure
    .input(orgKytesInput)
    .output(pagedOutput(orgKyteRowSchema))
    .query(() => {
      throw notImplemented("admin.orgKytes");
    }),
  setOrgLimits: adminProcedure.input(setOrgLimitsInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.setOrgLimits");
  }),
  suspendOrg: adminProcedure.input(orgSuspensionActionInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.suspendOrg");
  }),
  unsuspendOrg: adminProcedure.input(orgSuspensionActionInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.unsuspendOrg");
  }),

  kyteDetail: adminProcedure
    .input(kyteIdInput)
    .output(kyteDetailSchema.nullable())
    .query(() => {
      throw notImplemented("admin.kyteDetail");
    }),
  kytePublishedSnapshot: adminProcedure
    .input(kyteIdInput)
    .output(kytePublishedSnapshotSchema.nullable())
    .query(() => {
      throw notImplemented("admin.kytePublishedSnapshot");
    }),
  suspendKyte: adminProcedure.input(kyteModerationActionInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.suspendKyte");
  }),
  unsuspendKyte: adminProcedure.input(kyteModerationActionInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.unsuspendKyte");
  }),
  deleteKyte: adminProcedure.input(kyteModerationActionInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.deleteKyte");
  }),
  forceReReviewKyte: adminProcedure.input(kyteIdInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.forceReReviewKyte");
  }),
  sweepAllKytes: adminProcedure.output(sweepAllKytesOutput).mutation(() => {
    throw notImplemented("admin.sweepAllKytes");
  }),
  sweepStatus: adminProcedure.output(moderationSweepStatusOutput).query(() => {
    throw notImplemented("admin.sweepStatus");
  }),
  cancelSweep: adminProcedure.output(moderationSweepStatusOutput).mutation(() => {
    throw notImplemented("admin.cancelSweep");
  }),
  deleteAsset: adminProcedure.input(deleteAssetInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.deleteAsset");
  }),

  moderationQueue: adminProcedure
    .input(moderationQueueInput)
    .output(moderationQueueOutput)
    .query(() => {
      throw notImplemented("admin.moderationQueue");
    }),
  setKyteModeration: adminProcedure
    .input(setKyteModerationInput)
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("admin.setKyteModeration");
    }),

  suspendedList: adminProcedure
    .input(suspendedListInput)
    .output(pagedOutput(suspendedRowSchema))
    .query(() => {
      throw notImplemented("admin.suspendedList");
    }),

  moderationInsights: adminProcedure
    .input(moderationInsightsInput)
    .output(moderationInsightsSchema)
    .query(() => {
      throw notImplemented("admin.moderationInsights");
    }),

  moderationCounts: adminProcedure.output(moderationCountsSchema).query(() => {
    throw notImplemented("admin.moderationCounts");
  }),

  abuseReports: adminProcedure
    .input(abuseReportsInput)
    .output(pagedOutput(abuseReportRowSchema))
    .query(() => {
      throw notImplemented("admin.abuseReports");
    }),
  actionAbuseReport: adminProcedure
    .input(actionAbuseReportInput)
    .output(okSchema)
    .mutation(() => {
      throw notImplemented("admin.actionAbuseReport");
    }),
  resolveModerationTarget: adminProcedure
    .input(resolveModerationTargetInput)
    .output(resolveModerationTargetOutput)
    .query(() => {
      throw notImplemented("admin.resolveModerationTarget");
    }),
  openModerationCase: adminProcedure
    .input(openModerationCaseInput)
    .output(openModerationCaseOutput)
    .mutation(() => {
      throw notImplemented("admin.openModerationCase");
    }),

  appeals: adminProcedure
    .input(appealsInput)
    .output(pagedOutput(appealRowSchema))
    .query(() => {
      throw notImplemented("admin.appeals");
    }),
  resolveAppeal: adminProcedure.input(resolveAppealInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.resolveAppeal");
  }),

  auditLog: adminProcedure
    .input(auditLogInput)
    .output(pagedOutput(auditLogRowSchema))
    .query(() => {
      throw notImplemented("admin.auditLog");
    }),

  storageOverview: adminProcedure.output(storageOverviewSchema).query(() => {
    throw notImplemented("admin.storageOverview");
  }),
  storageOrgs: adminProcedure
    .input(storageOrgsInput)
    .output(pagedOutput(storageOrgRowSchema))
    .query(() => {
      throw notImplemented("admin.storageOrgs");
    }),
  storageOrgFiles: adminProcedure
    .input(storageOrgFilesInput)
    .output(storageOrgFilesOutput)
    .query(() => {
      throw notImplemented("admin.storageOrgFiles");
    }),
  storageOrphans: adminProcedure
    .input(storageOrphansInput)
    .output(pagedOutput(storageOrphanRowSchema))
    .query(() => {
      throw notImplemented("admin.storageOrphans");
    }),

  alerts: adminProcedure.input(alertsInput).output(alertsOutput).query(() => {
    throw notImplemented("admin.alerts");
  }),
  resolveAlert: adminProcedure.input(resolveAlertInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.resolveAlert");
  }),
  unresolveAlert: adminProcedure.input(resolveAlertInput).output(okSchema).mutation(() => {
    throw notImplemented("admin.unresolveAlert");
  }),
  resolveAlertsByKind: adminProcedure
    .input(resolveAlertsByKindInput)
    .output(z.object({ ok: z.literal(true), resolved: z.number() }))
    .mutation(() => {
      throw notImplemented("admin.resolveAlertsByKind");
    }),

  exportRows: adminProcedure.input(exportRowsInput).output(exportRowsOutput).query(() => {
    throw notImplemented("admin.exportRows");
  }),

  globalSearch: adminProcedure
    .input(globalSearchInput)
    .output(z.array(globalSearchResultSchema))
    .query(() => {
      throw notImplemented("admin.globalSearch");
    }),
});

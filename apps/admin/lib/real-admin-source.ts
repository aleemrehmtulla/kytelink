import type { KytelinkTRPCClient } from "@kytelink/trpc";
import type { AdminSource } from "./admin-source";

/**
 * The real AdminSource: a thin passthrough over `trpc.admin`. Every method
 * maps 1:1 to a procedure whose Zod I/O is shared with the frozen contract
 * (packages/trpc/src/routers/admin-shapes.ts). Security lives on the API
 * (`adminProcedure`); this file is transport only.
 */
export function createRealAdminSource(client: KytelinkTRPCClient): AdminSource {
  const admin = client.admin;
  return {
    me: () => admin.me.query(),

    overview: () => admin.overview.query(),
    live: () => admin.live.query(),

    platformSeries: (input) => admin.platformSeries.query(input),
    trafficSeries: (input) => admin.trafficSeries.query(input),
    topKytes: (input) => admin.topKytes.query(input),
    trafficBreakdown: (input) => admin.trafficBreakdown.query(input),
    growth: (input) => admin.growth.query(input),

    searchUsers: (input) => admin.searchUsers.query(input),
    userDetail: (userId) => admin.userDetail.query({ userId }),
    setUserLimits: (input) => admin.setUserLimits.mutate(input),
    setUserStatus: (input) => admin.setUserStatus.mutate(input),
    forceLogoutUser: (userId) => admin.forceLogoutUser.mutate({ userId }),

    searchOrgs: (input) => admin.searchOrgs.query(input),
    orgDetail: (orgId) => admin.orgDetail.query({ orgId }),
    orgMembers: (input) => admin.orgMembers.query(input),
    orgKytes: (input) => admin.orgKytes.query(input),
    setOrgLimits: (input) => admin.setOrgLimits.mutate(input),
    suspendOrg: (input) => admin.suspendOrg.mutate(input),
    unsuspendOrg: (input) => admin.unsuspendOrg.mutate(input),

    kyteDetail: (kyteId) => admin.kyteDetail.query({ kyteId }),
    kytePublishedSnapshot: (kyteId) => admin.kytePublishedSnapshot.query({ kyteId }),
    suspendKyte: (input) => admin.suspendKyte.mutate(input),
    unsuspendKyte: (input) => admin.unsuspendKyte.mutate(input),
    forceReReviewKyte: (kyteId) => admin.forceReReviewKyte.mutate({ kyteId }),
    deleteAsset: (input) => admin.deleteAsset.mutate(input),

    moderationInsights: (input) => admin.moderationInsights.query(input),
    moderationQueue: (input) => admin.moderationQueue.query(input),
    setKyteModeration: (input) => admin.setKyteModeration.mutate(input),
    sweepAllKytes: () => admin.sweepAllKytes.mutate(),
    sweepStatus: () => admin.sweepStatus.query(),

    suspendedList: (input) => admin.suspendedList.query(input),

    abuseReports: (input) => admin.abuseReports.query(input),
    actionAbuseReport: (input) => admin.actionAbuseReport.mutate(input),
    resolveModerationTarget: (username) => admin.resolveModerationTarget.query({ username }),
    openModerationCase: (input) => admin.openModerationCase.mutate(input),

    appeals: (input) => admin.appeals.query(input),
    resolveAppeal: (input) => admin.resolveAppeal.mutate(input),

    auditLog: (input) => admin.auditLog.query(input),

    storageOverview: () => admin.storageOverview.query(),
    storageOrgs: (input) => admin.storageOrgs.query(input),
    storageOrgFiles: (input) => admin.storageOrgFiles.query(input),
    storageOrphans: (input) => admin.storageOrphans.query(input),

    alerts: (input) => admin.alerts.query(input),
    resolveAlert: (alertId) => admin.resolveAlert.mutate({ alertId }),
    unresolveAlert: (alertId) => admin.unresolveAlert.mutate({ alertId }),
    resolveAlertsByKind: (kind) => admin.resolveAlertsByKind.mutate({ kind }),

    exportRows: (input) => admin.exportRows.query(input),

    globalSearch: (input) => admin.globalSearch.query(input),
  };
}

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@kytelink/trpc";

type In = inferRouterInputs<AppRouter>["admin"];
type Out = inferRouterOutputs<AppRouter>["admin"];

export type AdminMe = Out["me"];

export type OverviewStats = Out["overview"];
type LiveStats = Out["live"];

type PlatformSeriesInput = In["platformSeries"];
export type PlatformSeriesOutput = Out["platformSeries"];
type TrafficRangeInput = In["trafficSeries"];
type TrafficSeriesOutput = Out["trafficSeries"];
type TopKytesInput = In["topKytes"];
type TopKytesOutput = Out["topKytes"];
export type TopKyteRow = TopKytesOutput["kytes"][number];
type TrafficBreakdownInput = In["trafficBreakdown"];
type TrafficBreakdown = Out["trafficBreakdown"];
export type TrafficGranularity = TrafficRangeInput["granularity"];

export type GrowthInput = In["growth"];
export type GrowthStats = Out["growth"];
export type GrowthFunnelStep = GrowthStats["funnel"][number];
export type GrowthFunnelKey = GrowthFunnelStep["key"];

type SearchUsersInput = In["searchUsers"];
type SearchUsersOutput = Out["searchUsers"];
export type UserSummary = SearchUsersOutput["rows"][number];
export type UserDetail = NonNullable<Out["userDetail"]>;
export type UserOrgMembership = UserDetail["memberships"][number];
type SetUserLimitsInput = In["setUserLimits"];
type SetUserStatusInput = In["setUserStatus"];
export type UserSortKey = SearchUsersInput["sort"];

export type SearchOrgsInput = In["searchOrgs"];
type SearchOrgsOutput = Out["searchOrgs"];
export type OrgSummary = SearchOrgsOutput["rows"][number];
export type OrgDetail = NonNullable<Out["orgDetail"]>;
export type OrgLimitOverrides = OrgDetail["limitOverrides"];
export type OrgMembersInput = In["orgMembers"];
export type OrgMemberRow = Out["orgMembers"]["rows"][number];
export type OrgKytesInput = In["orgKytes"];
export type OrgKyteRow = Out["orgKytes"]["rows"][number];
type SetOrgLimitsInput = In["setOrgLimits"];
type OrgSuspensionActionInput = In["suspendOrg"];

export type KyteDetail = NonNullable<Out["kyteDetail"]>;
export type KyteAssetRow = KyteDetail["assets"][number];
export type KytePublishHistoryRow = KyteDetail["publishHistory"][number];
export type KyteModerationHistoryRow = KyteDetail["moderationHistory"][number];
export type KytePublishedSnapshot = NonNullable<Out["kytePublishedSnapshot"]>;
export type KyteReviewDetail = KytePublishedSnapshot["reviewHistory"][number];
type KyteModerationActionInput = In["suspendKyte"];

type ModerationInsightsInput = In["moderationInsights"];
type ModerationInsights = Out["moderationInsights"];
type ModerationQueueInput = In["moderationQueue"];
type ModerationQueueOutput = Out["moderationQueue"];
type SetKyteModerationInput = In["setKyteModeration"];
export type SweepStatus = Out["sweepStatus"];
type SweepStart = Out["sweepAllKytes"];
export type SweepProgress = NonNullable<SweepStatus["progress"]>;

export type SuspendedListInput = In["suspendedList"];
export type SuspendedListOutput = Out["suspendedList"];
export type SuspendedRow = SuspendedListOutput["rows"][number];
export type ModerationSignal = SuspendedRow["signals"][number];

export type AbuseReportsInput = In["abuseReports"];
export type AbuseReportsOutput = Out["abuseReports"];
export type AbuseReportRow = AbuseReportsOutput["rows"][number];
type ActionAbuseReportInput = In["actionAbuseReport"];
export type ModerationTarget = NonNullable<Out["resolveModerationTarget"]>;
export type OpenModerationCaseInput = In["openModerationCase"];

export type AppealsInput = In["appeals"];
export type AppealsOutput = Out["appeals"];
export type AppealRow = AppealsOutput["rows"][number];
type ResolveAppealInput = In["resolveAppeal"];

export type AuditLogInput = In["auditLog"];
export type AuditLogOutput = Out["auditLog"];
export type AuditLogRow = AuditLogOutput["rows"][number];

type StorageOverview = Out["storageOverview"];
export type StorageOrgsInput = In["storageOrgs"];
export type StorageOrgRow = Out["storageOrgs"]["rows"][number];
export type StorageOrgFilesInput = In["storageOrgFiles"];
type StorageOrgFilesOutput = Out["storageOrgFiles"];
export type StorageFileRow = StorageOrgFilesOutput["rows"][number];
type StorageOrphansInput = In["storageOrphans"];
export type StorageOrphanRow = Out["storageOrphans"]["rows"][number];

export type AlertsInput = In["alerts"];
export type AlertsOutput = Out["alerts"];
export type AdminAlertRow = AlertsOutput["rows"][number];

type ExportRowsInput = In["exportRows"];
export type ExportRowsOutput = Out["exportRows"];
export type ExportDataset = ExportRowsInput["dataset"];
export type ExportCell = ExportRowsOutput["rows"][number][string];

type GlobalSearchInput = In["globalSearch"];
export type GlobalSearchResult = Out["globalSearch"][number];

interface Ok {
  ok: true;
}

/**
 * The data contract every admin screen renders against: one method per
 * `trpc.admin` procedure, taking and returning that procedure's exact inferred
 * input/output. Screens never hand-roll a shape, so a contract change in
 * packages/trpc/src/routers/admin-shapes.ts surfaces as a type error here
 * rather than as a runtime surprise.
 */
export interface AdminSource {
  me(): Promise<AdminMe>;

  overview(): Promise<OverviewStats>;
  live(): Promise<LiveStats>;

  platformSeries(input: PlatformSeriesInput): Promise<PlatformSeriesOutput>;
  trafficSeries(input: TrafficRangeInput): Promise<TrafficSeriesOutput>;
  topKytes(input: TopKytesInput): Promise<TopKytesOutput>;
  trafficBreakdown(input: TrafficBreakdownInput): Promise<TrafficBreakdown>;
  growth(input: GrowthInput): Promise<GrowthStats>;

  searchUsers(input: SearchUsersInput): Promise<SearchUsersOutput>;
  userDetail(userId: string): Promise<UserDetail | null>;
  setUserLimits(input: SetUserLimitsInput): Promise<Ok>;
  setUserStatus(input: SetUserStatusInput): Promise<Ok>;
  forceLogoutUser(userId: string): Promise<Ok>;

  searchOrgs(input: SearchOrgsInput): Promise<SearchOrgsOutput>;
  orgDetail(orgId: string): Promise<OrgDetail | null>;
  orgMembers(input: OrgMembersInput): Promise<Out["orgMembers"]>;
  orgKytes(input: OrgKytesInput): Promise<Out["orgKytes"]>;
  setOrgLimits(input: SetOrgLimitsInput): Promise<Ok>;
  suspendOrg(input: OrgSuspensionActionInput): Promise<Ok>;
  unsuspendOrg(input: OrgSuspensionActionInput): Promise<Ok>;

  kyteDetail(kyteId: string): Promise<KyteDetail | null>;
  kytePublishedSnapshot(kyteId: string): Promise<KytePublishedSnapshot | null>;
  suspendKyte(input: KyteModerationActionInput): Promise<Ok>;
  unsuspendKyte(input: KyteModerationActionInput): Promise<Ok>;
  forceReReviewKyte(kyteId: string): Promise<Ok>;
  deleteAsset(input: In["deleteAsset"]): Promise<Ok>;

  moderationInsights(input: ModerationInsightsInput): Promise<ModerationInsights>;
  moderationQueue(input: ModerationQueueInput): Promise<ModerationQueueOutput>;
  setKyteModeration(input: SetKyteModerationInput): Promise<Ok>;
  sweepAllKytes(): Promise<SweepStart>;
  sweepStatus(): Promise<SweepStatus>;
  cancelSweep(): Promise<SweepStatus>;

  suspendedList(input: SuspendedListInput): Promise<SuspendedListOutput>;

  abuseReports(input: AbuseReportsInput): Promise<AbuseReportsOutput>;
  actionAbuseReport(input: ActionAbuseReportInput): Promise<Ok>;
  resolveModerationTarget(username: string): Promise<ModerationTarget | null>;
  openModerationCase(input: OpenModerationCaseInput): Promise<{ ok: true; reportId: string }>;

  appeals(input: AppealsInput): Promise<AppealsOutput>;
  resolveAppeal(input: ResolveAppealInput): Promise<Ok>;

  auditLog(input: AuditLogInput): Promise<AuditLogOutput>;

  storageOverview(): Promise<StorageOverview>;
  storageOrgs(input: StorageOrgsInput): Promise<Out["storageOrgs"]>;
  storageOrgFiles(input: StorageOrgFilesInput): Promise<StorageOrgFilesOutput>;
  storageOrphans(input: StorageOrphansInput): Promise<Out["storageOrphans"]>;

  alerts(input: AlertsInput): Promise<AlertsOutput>;
  resolveAlert(alertId: string): Promise<Ok>;
  unresolveAlert(alertId: string): Promise<Ok>;
  resolveAlertsByKind(kind: string): Promise<{ ok: true; resolved: number }>;

  exportRows(input: ExportRowsInput): Promise<ExportRowsOutput>;

  globalSearch(input: GlobalSearchInput): Promise<GlobalSearchResult[]>;
}

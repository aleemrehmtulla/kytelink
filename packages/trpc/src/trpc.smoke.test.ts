import { describe, expect, it, expectTypeOf } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { appRouter, createCallerFactory, type AppRouter } from "./index";
import { appCodeOf } from "./errors";
import type { TrpcContext } from "./context";

const EXPECTED_PROCEDURES = [
  "org.listMine",
  "org.create",
  "org.rename",
  "org.delete",
  "org.storage",
  "org.auditLog",
  "kyte.get",
  "kyte.create",
  "kyte.updateDraft",
  "kyte.publish",
  "kyte.checkUsername",
  "kyte.changeUsername",
  "kyte.delete",
  "schedule.list",
  "schedule.create",
  "schedule.updateSnapshot",
  "schedule.reschedule",
  "schedule.cancel",
  "preview.ensure",
  "preview.rotate",
  "import.fromUrl",
  "team.members",
  "team.invite",
  "team.revokeInvite",
  "team.updateAccess",
  "team.removeMember",
  "team.leave",
  "invites.listMine",
  "invites.accept",
  "invites.decline",
  "account.get",
  "account.setAvatar",
  "account.changeEmail",
  "account.passkeys.list",
  "account.passkeys.rename",
  "account.passkeys.remove",
  "assets.createUploadUrl",
  "assets.finalize",
  "assets.delete",
  "analytics.overview",
  "analytics.timeSeries",
  "analytics.topLinks",
  "analytics.referrers",
  "analytics.devices",
  "analytics.countries",
  "domains.list",
  "domains.add",
  "domains.status",
  "domains.verify",
  "domains.remove",
  "admin.me",
  "admin.overview",
  "admin.live",
  "admin.platformSeries",
  "admin.trafficSeries",
  "admin.topKytes",
  "admin.trafficBreakdown",
  "admin.growth",
  "admin.searchUsers",
  "admin.userDetail",
  "admin.setUserLimits",
  "admin.setUserStatus",
  "admin.forceLogoutUser",
  "admin.banUser",
  "admin.searchOrgs",
  "admin.orgDetail",
  "admin.orgMembers",
  "admin.orgKytes",
  "admin.setOrgLimits",
  "admin.suspendOrg",
  "admin.unsuspendOrg",
  "admin.kyteDetail",
  "admin.kytePublishedSnapshot",
  "admin.suspendKyte",
  "admin.unsuspendKyte",
  "admin.upholdKyteSuspension",
  "admin.deleteKyte",
  "admin.forceReReviewKyte",
  "admin.sweepAllKytes",
  "admin.sweepStatus",
  "admin.cancelSweep",
  "admin.deleteAsset",
  "admin.moderationCounts",
  "admin.moderationInsights",
  "admin.moderationQueue",
  "admin.setKyteModeration",
  "admin.suspendedList",
  "admin.abuseReports",
  "admin.actionAbuseReport",
  "admin.resolveModerationTarget",
  "admin.openModerationCase",
  "admin.appeals",
  "admin.resolveAppeal",
  "admin.auditLog",
  "admin.storageOverview",
  "admin.storageOrgs",
  "admin.storageOrgFiles",
  "admin.storageOrphans",
  "admin.alerts",
  "admin.resolveAlert",
  "admin.unresolveAlert",
  "admin.resolveAlertsByKind",
  "admin.exportRows",
  "admin.globalSearch",
] as const;

function makeContext(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    session: { userId: "u_1", email: "agent@kytelink.dev", isAdmin: false, status: "ACTIVE" },
    user: { id: "u_1", email: "agent@kytelink.dev" },
    ip: "127.0.0.1",
    redis: null,
    db: null,
    ch: getClickhouse({} as NodeJS.ProcessEnv),
    log: null,
    ...overrides,
  };
}

describe("packages/trpc router surface", () => {
  it("exposes exactly the documented procedures (06-api.md)", () => {
    const procedures = Object.keys(appRouter._def.procedures).sort();
    for (const name of EXPECTED_PROCEDURES) {
      expect(procedures).toContain(name);
    }
    expect(procedures.length).toBe(EXPECTED_PROCEDURES.length);
  });

  it("freezes the AppRouter type", () => {
    expectTypeOf<AppRouter>().toEqualTypeOf<typeof appRouter>();
  });

  it("every stubbed procedure throws NOT_IMPLEMENTED with a typed appCode", async () => {
    const caller = createCallerFactory(appRouter)(makeContext());
    await expect(caller.account.get()).rejects.toMatchObject({ code: "NOT_IMPLEMENTED" });
    try {
      await caller.account.get();
      throw new Error("expected throw");
    } catch (error) {
      expect(appCodeOf(error)).toBe("NOT_IMPLEMENTED");
    }
  });

  it("authed procedures reject an anonymous context", async () => {
    const caller = createCallerFactory(appRouter)(
      makeContext({ session: null, user: null }),
    );
    await expect(caller.account.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("admin procedures reject a non-admin session", async () => {
    const caller = createCallerFactory(appRouter)(makeContext());
    await expect(
      caller.admin.platformSeries({ days: 30 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

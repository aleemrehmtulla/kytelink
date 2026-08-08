import { beforeEach, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { appCodeOf, createCallerFactory, type TrpcContext } from "@kytelink/trpc";
import { loadConfig, setConfigForTest } from "../config";
import { logger } from "../logger";
import { createSeededStore, type MemoryStore } from "../store/memory-store";
import { appRouter } from "./index";

const createCaller = createCallerFactory(appRouter);
const REASON = "phishing links in bio — reported 4x";

async function contextFor(store: MemoryStore, email: string): Promise<TrpcContext> {
  const user = await store.userByEmail(email);
  if (!user) throw new Error(`no fixture user ${email}`);
  return {
    session: {
      userId: user.id,
      email: user.email,
      isAdmin: user.role === "ADMIN",
      status: user.status,
    },
    user: { id: user.id, email: user.email },
    ip: "127.0.0.1",
    redis: null,
    db: store,
    ch: getClickhouse(),
    log: logger,
  };
}

let store: MemoryStore;

beforeEach(() => {
  store = createSeededStore();
  store.users.push({
    id: "usr_admin_two",
    email: "second-admin@kytelink.dev",
    name: "Second Admin",
    role: "ADMIN",
    createdAt: new Date("2026-07-18T12:00:00.000Z"),
    status: "ACTIVE",
    statusReason: null,
    statusChangedAt: null,
    statusChangedBy: null,
  });
  setConfigForTest(
    loadConfig({
      ...process.env,
      ADMIN_EMAILS: "agent-admin@kytelink.dev,second-admin@kytelink.dev",
      WEB_BASE_URL: "http://localhost:3000",
    }),
  );
});

describe("setUserStatus — self and admin protection", () => {
  it("refuses to suspend the acting admin's own account", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await expect(
      admin.admin.setUserStatus({
        userId: "usr_agent_admin",
        status: "SUSPENDED",
        reason: REASON,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await store.userById("usr_agent_admin"))?.status).toBe("ACTIVE");
  });

  it("refuses to suspend another platform ADMIN, so admins cannot lock each other out", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await expect(
      admin.admin.setUserStatus({
        userId: "usr_admin_two",
        status: "SUSPENDED",
        reason: REASON,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await store.userById("usr_admin_two"))?.status).toBe("ACTIVE");
  });

  it("still allows restoring an admin account to ACTIVE", async () => {
    await store.setUserStatus({
      userId: "usr_admin_two",
      status: "SUSPENDED",
      reason: "set up by a previous admin",
      actorEmail: "someone@kytelink.dev",
    });
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setUserStatus({
      userId: "usr_admin_two",
      status: "ACTIVE",
      reason: "appeal upheld",
    });
    expect((await store.userById("usr_admin_two"))?.status).toBe("ACTIVE");
  });
});

describe("setUserStatus — status fields, sessions and audit", () => {
  it("stamps reason/changedAt/changedBy and leaves sessions alone", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "SUSPENDED",
      reason: REASON,
    });

    const user = await store.userById("usr_agent");
    expect(user?.status).toBe("SUSPENDED");
    expect(user?.statusReason).toBe(REASON);
    expect(user?.statusChangedBy).toBe("agent-admin@kytelink.dev");
    expect(user?.statusChangedAt).toBeInstanceOf(Date);
    // Suspension is read-only, not a lockout — the session survives so the
    // person can sign in, read their data, and appeal.
    expect(store.invalidatedSessionUserIds).toEqual([]);
  });

  it("clears the status fields on restore", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "SUSPENDED",
      reason: REASON,
    });
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "ACTIVE",
      reason: "appeal upheld",
    });

    const user = await store.userById("usr_agent");
    expect(user?.status).toBe("ACTIVE");
    expect(user?.statusReason).toBeNull();
    expect(user?.statusChangedAt).toBeNull();
    expect(user?.statusChangedBy).toBeNull();
  });

  it("writes an admin.user.* audit row carrying the reason", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "SUSPENDED",
      reason: REASON,
    });

    const entry = store.audit.find((row) => row.action === "admin.user.suspend");
    expect(entry).toBeDefined();
    expect(entry?.actorUserId).toBe("usr_agent_admin");
    expect(entry?.meta.reason).toBe(REASON);
    expect(String(entry?.meta.summary)).toContain(REASON);
  });
});

describe("setUserStatus — the org cascade", () => {
  // usr_agent OWNS org_agent_personal and is a MANAGER of org_agency_demo. The
  // cascade takes both down: membership at any role is enough, because a
  // suspended person must not keep publishing through someone else's org.
  it("suspends every org the user belongs to, stamping the user cause", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "SUSPENDED",
      reason: REASON,
    });

    for (const orgId of ["org_agent_personal", "org_agency_demo"]) {
      const org = await store.orgById(orgId);
      expect(org?.suspendedAt).toBeInstanceOf(Date);
      expect(org?.suspensionReason).toBe(REASON);
      expect(org?.suspensionCause).toBe("user_usr_agent");
    }
  });

  it("leaves individual kytes' moderationStatus untouched — the org rule covers them", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "SUSPENDED",
      reason: REASON,
    });

    expect((await store.kyteById("usr_agent"))?.moderationStatus).toBe("APPROVED");
    expect((await store.kyteById("kyte_ag_1"))?.moderationStatus).toBe("APPROVED");
  });

  it("never overwrites an org an admin had already suspended directly", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.suspendOrg({ orgId: "org_agency_demo", reason: "agency-wide spam" });
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "SUSPENDED",
      reason: REASON,
    });

    const agency = await store.orgById("org_agency_demo");
    expect(agency?.suspensionCause).toBeNull();
    expect(agency?.suspensionReason).toBe("agency-wide spam");
  });

  it("restores only the orgs its own suspension caused", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.suspendOrg({ orgId: "org_agency_demo", reason: "agency-wide spam" });
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "SUSPENDED",
      reason: REASON,
    });
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "ACTIVE",
      reason: "appeal upheld",
    });

    expect((await store.orgById("org_agent_personal"))?.suspendedAt).toBeNull();
    expect((await store.orgById("org_agency_demo"))?.suspendedAt).toBeInstanceOf(Date);
  });

  it("records the cascaded org ids in the audit meta", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setUserStatus({
      userId: "usr_agent",
      status: "SUSPENDED",
      reason: REASON,
    });

    const entry = store.audit.find((row) => row.action === "admin.user.suspend");
    expect(entry?.meta.cascadedOrgIds).toEqual(["org_agent_personal", "org_agency_demo"]);
  });
});

describe("suspendOrg / unsuspendOrg", () => {
  it("suspends directly with no cause and audits the reason", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.suspendOrg({ orgId: "org_agency_demo", reason: REASON });

    const org = await store.orgById("org_agency_demo");
    expect(org?.suspendedAt).toBeInstanceOf(Date);
    expect(org?.suspensionCause).toBeNull();
    const entry = store.audit.find((row) => row.action === "admin.org.suspend");
    expect(entry?.orgId).toBe("org_agency_demo");
    expect(entry?.meta.reason).toBe(REASON);
  });

  it("clears every suspension field on restore", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.suspendOrg({ orgId: "org_agency_demo", reason: REASON });
    await admin.admin.unsuspendOrg({ orgId: "org_agency_demo", reason: "appeal upheld" });

    const org = await store.orgById("org_agency_demo");
    expect(org?.suspendedAt).toBeNull();
    expect(org?.suspensionReason).toBeNull();
    expect(org?.suspendedBy).toBeNull();
    expect(store.audit.some((row) => row.action === "admin.org.unsuspend")).toBe(true);
  });
});

describe("a suspended account is read-only, never locked out", () => {
  it("keeps reading but fails mutations with ACCOUNT_SUSPENDED", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setUserStatus({
      userId: "usr_agency_owner",
      status: "SUSPENDED",
      reason: REASON,
    });

    const suspended = createCaller(await contextFor(store, "owner@kytelink.dev"));
    await expect(suspended.org.listMine()).resolves.toBeDefined();
    await expect(suspended.org.create({ name: "New Org" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    try {
      await suspended.org.create({ name: "New Org" });
    } catch (error) {
      expect(appCodeOf(error)).toBe("ACCOUNT_SUSPENDED");
    }
  });
});

describe("moderation mutations record an audited reason", () => {
  it("suspendKyte writes admin.kyte.suspend scoped to the org and kyte", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.suspendKyte({ kyteId: "kyte_ag_1", reason: REASON });

    const entry = store.audit.find((row) => row.action === "admin.kyte.suspend");
    expect(entry?.orgId).toBe("org_agency_demo");
    expect(entry?.kyteId).toBe("kyte_ag_1");
    expect(entry?.meta.reason).toBe(REASON);
    expect((await store.kyteById("kyte_ag_1"))?.moderationStatus).toBe("SUSPENDED");
  });

  it("forceLogoutUser writes admin.user.force-logout", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.forceLogoutUser({ userId: "usr_agent" });

    expect(store.audit.some((row) => row.action === "admin.user.force-logout")).toBe(true);
    expect(store.invalidatedSessionUserIds).toContain("usr_agent");
  });
});

describe("setOrgLimits", () => {
  it("persists a byte override well above the old count ceiling of 100", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    const oneGib = 1024 * 1024 * 1024;
    await admin.admin.setOrgLimits({
      orgId: "org_agent_personal",
      overrides: [{ key: "storageBytesPerOrg", value: oneGib }],
    });

    const org = await store.orgById("org_agent_personal");
    expect(org?.limitOverrides.storageBytesPerOrg).toBe(oneGib);
    expect(store.audit.some((row) => row.action === "admin.org.limits")).toBe(true);
  });

  it("persists uploadMaxBytes so the upload path can enforce it per org", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    const fiveMib = 5 * 1024 * 1024;

    await admin.admin.setOrgLimits({
      orgId: "org_agent_personal",
      overrides: [{ key: "uploadMaxBytes", value: fiveMib }],
    });

    const org = await store.orgById("org_agent_personal");
    expect(org?.limitOverrides.uploadMaxBytes).toBe(fiveMib);
  });

  it("clears an uploadMaxBytes override back to the platform default", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));

    await admin.admin.setOrgLimits({
      orgId: "org_agent_personal",
      overrides: [{ key: "uploadMaxBytes", value: 5 * 1024 * 1024 }],
    });
    await admin.admin.setOrgLimits({
      orgId: "org_agent_personal",
      overrides: [{ key: "uploadMaxBytes", value: null }],
    });

    const org = await store.orgById("org_agent_personal");
    expect(org?.limitOverrides.uploadMaxBytes).toBeUndefined();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { createCallerFactory, type TrpcContext } from "@kytelink/trpc";
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
  setConfigForTest(
    loadConfig({
      ...process.env,
      ADMIN_EMAILS: "agent-admin@kytelink.dev",
      WEB_BASE_URL: "http://localhost:3000",
    }),
  );
});

describe("deleteKyte — the suspension gate", () => {
  it("refuses to delete a live kyte", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await expect(
      admin.admin.deleteKyte({ kyteId: "kyte_ag_1", reason: REASON }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await store.kyteById("kyte_ag_1")).not.toBeNull();
  });

  it("deletes a suspended kyte and frees its username", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.deleteKyte({ kyteId: "kyte_suspended", reason: REASON });

    expect(await store.kyteById("kyte_suspended")).toBeNull();
    expect(await store.usernameOwner("suspended-demo")).toBeNull();

    const row = store.audit.find((entry) => entry.action === "admin.kyte.delete");
    expect(row?.kyteId).toBe("kyte_suspended");
    expect(row?.meta.username).toBe("suspended-demo");
  });

  it("deletes a live kyte inside a suspended org — the org suspension is the gate", async () => {
    await store.setOrgSuspension({
      orgId: "org_agency_demo",
      suspended: true,
      reason: REASON,
      actorEmail: "agent-admin@kytelink.dev",
      cause: null,
    });
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.deleteKyte({ kyteId: "kyte_ag_1", reason: REASON });
    expect(await store.kyteById("kyte_ag_1")).toBeNull();
  });
});

describe("banUser — scorched earth with guardrails", () => {
  it("refuses to ban the acting admin's own account or any platform admin", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await expect(
      admin.admin.banUser({ userId: "usr_agent_admin", reason: REASON }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await store.userById("usr_agent_admin")).not.toBeNull();
  });

  it("erases owned orgs, leaves joined orgs, denylists the email", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.banUser({ userId: "usr_agent", reason: REASON });

    expect(await store.userById("usr_agent")).toBeNull();
    // Their personal org (owned) is gone with every kyte in it.
    expect(await store.orgById("org_agent_personal")).toBeNull();
    expect(await store.kyteById("kyte_agent_draft")).toBeNull();
    expect(await store.usernameOwner("agent")).toBeNull();
    // The agency org they merely managed survives untouched, minus them.
    expect(await store.orgById("org_agency_demo")).not.toBeNull();
    expect(await store.kyteById("kyte_ag_1")).not.toBeNull();
    expect(await store.orgMember("org_agency_demo", "usr_agent")).toBeNull();

    expect(store.bannedEmails).toEqual([
      { email: "agent@kytelink.dev", reason: REASON, bannedBy: "agent-admin@kytelink.dev" },
    ]);
    expect(store.invalidatedSessionUserIds).toContain("usr_agent");

    const row = store.audit.find((entry) => entry.action === "admin.user.ban");
    expect(row?.meta.targetEmail).toBe("agent@kytelink.dev");
    expect(row?.meta.deletedOrgIds).toEqual(["org_agent_personal"]);
    expect(row?.meta.deletedUsernames).toEqual(["agent", "agent-draft"]);
  });
});

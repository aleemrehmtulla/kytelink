import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { createCallerFactory, type TrpcContext } from "@kytelink/trpc";
import { loadConfig, setConfigForTest } from "../config";
import { logger } from "../logger";
import { createSeededStore, type MemoryStore } from "../store/memory-store";
import { appRouter } from "./index";

const createCaller = createCallerFactory(appRouter);

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

describe("org.delete guards (H6/H7/L3)", () => {
  it("refuses to delete a personal org even for its owner (H7 data-loss)", async () => {
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    await expect(
      caller.org.delete({ orgId: "org_agent_personal", confirm: "Agent's Organization" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await store.orgById("org_agent_personal")).not.toBeNull();
  });

  it("blocks deleting an org that still has kytes (H6 data-loss)", async () => {
    const caller = createCaller(await contextFor(store, "owner@kytelink.dev"));
    await expect(
      caller.org.delete({ orgId: "org_agency_demo", confirm: "Agency Demo" }),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(await store.orgById("org_agency_demo")).not.toBeNull();
    expect(await store.countKytesByOrg("org_agency_demo")).toBeGreaterThan(0);
  });

  it("throws on a confirmation mismatch instead of silently returning ok (L3)", async () => {
    const caller = createCaller(await contextFor(store, "owner@kytelink.dev"));
    await expect(
      caller.org.delete({ orgId: "org_agency_demo", confirm: "wrong name" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("deletes an empty non-personal org with the exact confirmation", async () => {
    const owner = await contextFor(store, "owner@kytelink.dev");
    const caller = createCaller(owner);
    const { orgId } = await caller.org.create({ name: "Disposable" });
    await caller.org.delete({ orgId, confirm: "Disposable" });
    expect(await store.orgById(orgId)).toBeNull();
  });
});

describe("org.listMine batches per-kyte grant lookups (H8)", () => {
  it("issues one kyteMembersForUser call and zero per-kyte kyteMember calls", async () => {
    let singleKyteMemberCalls = 0;
    let batchCalls = 0;
    const originalSingle = store.kyteMember.bind(store);
    const originalBatch = store.kyteMembersForUser.bind(store);
    store.kyteMember = async (kyteId, userId) => {
      singleKyteMemberCalls += 1;
      return originalSingle(kyteId, userId);
    };
    store.kyteMembersForUser = async (userId, kyteIds) => {
      batchCalls += 1;
      return originalBatch(userId, kyteIds);
    };

    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const { orgs } = await caller.org.listMine();

    expect(orgs.map((o) => o.id).sort()).toEqual(["org_agency_demo", "org_agent_personal"]);
    expect(batchCalls).toBe(1);
    expect(singleKyteMemberCalls).toBe(0);
  });

  it("preserves effectiveRole semantics (MANAGER sees agency kytes)", async () => {
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const { orgs } = await caller.org.listMine();
    const agency = orgs.find((o) => o.id === "org_agency_demo");
    expect(agency?.role).toBe("MANAGER");
    expect(agency?.kytes.every((k) => k.effectiveRole === "MANAGER")).toBe(true);
  });
});

describe("org.storage aggregation", () => {
  async function seedAsset(kyteId: string, sizeBytes: number, id: string): Promise<void> {
    await store.insertAsset({
      id,
      kyteId,
      uploadedById: null,
      key: `assets/${id}`,
      kind: "LINK_IMAGE",
      contentType: "image/png",
      sizeBytes,
      width: null,
      height: null,
      createdAt: new Date(),
    });
  }

  it("returns used bytes, the default limit, and a per-kyte breakdown", async () => {
    const kytes = await store.listKytesByOrg("org_agency_demo");
    const first = kytes[0];
    if (!first) throw new Error("expected at least one kyte in org_agency_demo");
    await seedAsset(first.id, 1000, "asset_a");
    await seedAsset(first.id, 500, "asset_b");

    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const result = await caller.org.storage({ orgId: "org_agency_demo" });

    expect(result.usedBytes).toBe(1500);
    expect(result.limitBytes).toBe(250 * 1024 * 1024);
    const firstKyte = result.kytes.find((k) => k.kyteId === first.id);
    expect(firstKyte?.bytes).toBe(1500);
    expect(firstKyte?.displayName).toBe(first.draft.displayName);
    expect(result.kytes.length).toBe(kytes.length);
  });

  it("rejects a caller who is not a member of the org", async () => {
    const owner = createCaller(await contextFor(store, "owner@kytelink.dev"));
    const { orgId } = await owner.org.create({ name: "Outsiders" });
    const stranger = createCaller(await contextFor(store, "agent@kytelink.dev"));
    await expect(stranger.org.storage({ orgId })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("owner management (M3)", () => {
  it("lets an OWNER promote a member to OWNER", async () => {
    const owner = createCaller(await contextFor(store, "owner@kytelink.dev"));
    const members = await store.listOrgMembers("org_agency_demo");
    const viewer = members.find((m) => m.email === "viewer@kytelink.dev");
    if (!viewer) throw new Error("viewer membership missing");
    await owner.team.updateAccess({
      orgId: "org_agency_demo",
      membershipId: viewer.membershipId,
      role: "OWNER",
      kyteAccess: "ALL",
    });
    const after = await store.orgMember("org_agency_demo", viewer.userId);
    expect(after?.role).toBe("OWNER");
  });

  it("lets a non-last OWNER leave once a co-owner exists", async () => {
    const owner = createCaller(await contextFor(store, "owner@kytelink.dev"));
    const members = await store.listOrgMembers("org_agency_demo");
    const viewer = members.find((m) => m.email === "viewer@kytelink.dev");
    if (!viewer) throw new Error("viewer membership missing");
    await owner.team.updateAccess({
      orgId: "org_agency_demo",
      membershipId: viewer.membershipId,
      role: "OWNER",
      kyteAccess: "ALL",
    });
    const originalOwner = createCaller(await contextFor(store, "owner@kytelink.dev"));
    await originalOwner.team.leave({ orgId: "org_agency_demo" });
    const remaining = (await store.listOrgMembers("org_agency_demo")).filter(
      (m) => m.role === "OWNER",
    );
    expect(remaining.map((m) => m.email)).toEqual(["viewer@kytelink.dev"]);
  });

  it("still blocks the LAST owner from leaving", async () => {
    const owner = createCaller(await contextFor(store, "owner@kytelink.dev"));
    await expect(owner.team.leave({ orgId: "org_agency_demo" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("blocks demoting the last owner via updateAccess", async () => {
    const owner = createCaller(await contextFor(store, "owner@kytelink.dev"));
    const members = await store.listOrgMembers("org_agency_demo");
    const self = members.find((m) => m.email === "owner@kytelink.dev");
    if (!self) throw new Error("owner membership missing");
    await expect(
      owner.team.updateAccess({
        orgId: "org_agency_demo",
        membershipId: self.membershipId,
        role: "MANAGER",
        kyteAccess: "ALL",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("invites.decline email match (S5)", () => {
  function seedInvite(email: string, rawToken: string): void {
    store.invites.push({
      id: "inv_decline_test",
      orgId: "org_agency_demo",
      email: email.toLowerCase(),
      role: "VIEWER",
      kyteAccess: "ALL",
      kyteGrants: [],
      status: "PENDING",
      invitedByUserId: "usr_agency_owner",
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
    });
  }

  it("ignores a token-branch decline from a non-recipient", async () => {
    seedInvite("viewer@kytelink.dev", "raw-token-abc");
    const wrongUser = createCaller(await contextFor(store, "agent@kytelink.dev"));
    await wrongUser.invites.decline({ token: "raw-token-abc" });
    expect(store.invites.find((i) => i.id === "inv_decline_test")?.status).toBe("PENDING");
  });

  it("declines when the token holder is the invited recipient", async () => {
    seedInvite("viewer@kytelink.dev", "raw-token-abc");
    const recipient = createCaller(await contextFor(store, "viewer@kytelink.dev"));
    await recipient.invites.decline({ token: "raw-token-abc" });
    expect(store.invites.find((i) => i.id === "inv_decline_test")?.status).toBe("DECLINED");
  });
});

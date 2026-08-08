import { beforeEach, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { appCodeOf, createCallerFactory, type TrpcContext } from "@kytelink/trpc";
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

describe("permissions", () => {
  it("lists orgs the caller belongs to with per-kyte effective role", async () => {
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const { orgs } = await caller.org.listMine();
    expect(orgs.map((o) => o.id).sort()).toEqual(["org_agency_demo", "org_agent_personal"]);
    const agency = orgs.find((o) => o.id === "org_agency_demo");
    expect(agency?.role).toBe("MANAGER");
  });

  it("lets a MANAGER publish", async () => {
    const caller = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const result = await caller.kyte.publish({ kyteId: "kyte_ag_1" });
    expect(result.publishSeq).toBe(3);
  });

  it("blocks a VIEWER from publishing with a typed FORBIDDEN error", async () => {
    const caller = createCaller(await contextFor(store, "viewer@kytelink.dev"));
    await expect(caller.kyte.publish({ kyteId: "kyte_ag_1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("limits", () => {
  it("raises LIMIT_REACHED when an org is at its kyte cap", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setOrgLimits({
      orgId: "org_agent_personal",
      overrides: [{ key: "kytesPerOrg", value: 2 }],
    });

    const agent = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const error = await agent.kyte
      .create({ orgId: "org_agent_personal", username: "limit-check" })
      .then(() => null)
      .catch((e: unknown) => e);
    expect(appCodeOf(error)).toBe("LIMIT_REACHED");
  });
});

describe("suspension", () => {
  it("blocks mutations on a SUSPENDED kyte but allows reads", async () => {
    const admin = createCaller(await contextFor(store, "agent-admin@kytelink.dev"));
    await admin.admin.setKyteModeration({
      kyteId: "usr_agent",
      status: "SUSPENDED",
      reason: "phishing links in bio",
    });

    const agent = createCaller(await contextFor(store, "agent@kytelink.dev"));
    const error = await agent.kyte
      .publish({ kyteId: "usr_agent" })
      .then(() => null)
      .catch((e: unknown) => e);
    expect(appCodeOf(error)).toBe("KYTE_SUSPENDED");

    const view = await agent.kyte.get({ kyteId: "usr_agent" });
    expect(view.moderationStatus).toBe("SUSPENDED");
  });
});

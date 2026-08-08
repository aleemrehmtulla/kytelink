import { beforeEach, describe, expect, it } from "vitest";
import { getClickhouse } from "@kytelink/clickhouse";
import { createCallerFactory, type TrpcContext } from "@kytelink/trpc";
import { loadConfig, setConfigForTest } from "../config";
import { logger } from "../logger";
import { appRouter } from "../routers/index";
import { createSeededStore, type MemoryStore } from "../store/memory-store";
import {
  decodeGrant,
  encodeGrant,
  impersonationCookieName,
  IMPERSONATION_TTL_MS,
  newGrant,
} from "./impersonation";

const createCaller = createCallerFactory(appRouter);

const GRANT = {
  adminUserId: "usr_agent_admin",
  adminEmail: "agent-admin@kytelink.dev",
  userId: "usr_agent",
  readOnly: true,
};

let store: MemoryStore;

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret-for-impersonation-grants";
  store = createSeededStore();
  setConfigForTest(
    loadConfig({
      ...process.env,
      AGENT_MODE: "false",
      ADMIN_EMAILS: "agent-admin@kytelink.dev",
      WEB_BASE_URL: "http://localhost:3000",
    }),
  );
});

describe("impersonation grants", () => {
  it("round-trips a grant it signed itself", () => {
    const grant = newGrant(GRANT);
    expect(decodeGrant(encodeGrant(grant))).toEqual(grant);
  });

  it("expires exactly TTL after it was minted", () => {
    const now = Date.parse("2026-07-25T12:00:00.000Z");
    const token = encodeGrant(newGrant({ ...GRANT, now }));
    expect(decodeGrant(token, now + IMPERSONATION_TTL_MS - 1)).not.toBeNull();
    expect(decodeGrant(token, now + IMPERSONATION_TTL_MS + 1)).toBeNull();
  });

  it("rejects a payload edited to point at another user", () => {
    const token = encodeGrant(newGrant(GRANT));
    const [payload, signature] = token.split(".");
    const tampered = JSON.parse(Buffer.from(payload ?? "", "base64url").toString("utf8")) as {
      userId: string;
    };
    tampered.userId = "usr_someone_else";
    const forged = `${Buffer.from(JSON.stringify(tampered), "utf8").toString("base64url")}.${signature}`;
    expect(decodeGrant(forged)).toBeNull();
  });

  it("rejects a grant signed with a different secret", () => {
    const token = encodeGrant(newGrant(GRANT));
    process.env.AUTH_SECRET = "a-completely-different-secret";
    expect(decodeGrant(token)).toBeNull();
  });

  it("rejects garbage rather than throwing", () => {
    expect(decodeGrant(undefined)).toBeNull();
    expect(decodeGrant("")).toBeNull();
    expect(decodeGrant("not-a-token")).toBeNull();
    expect(decodeGrant("....")).toBeNull();
  });

  it("namespaces the cookie the same way better-auth namespaces its session", () => {
    expect(impersonationCookieName()).toBe("kyte.impersonation");
    setConfigForTest(loadConfig({ ...process.env, AGENT_MODE: "true" }));
    expect(impersonationCookieName()).toBe("kyte_agent.impersonation");
  });
});

async function impersonatedContext(
  email: string,
  readOnly: boolean,
): Promise<TrpcContext> {
  const user = await store.userByEmail(email);
  if (!user) throw new Error(`no fixture user ${email}`);
  return {
    session: { userId: user.id, email: user.email, isAdmin: false, status: user.status },
    user: { id: user.id, email: user.email },
    impersonation: {
      adminUserId: "usr_agent_admin",
      adminEmail: "agent-admin@kytelink.dev",
      readOnly,
      expiresAt: new Date(Date.now() + IMPERSONATION_TTL_MS).toISOString(),
    },
    ip: "127.0.0.1",
    redis: null,
    db: store,
    ch: getClickhouse(),
    log: logger,
  };
}

describe("read-only impersonation", () => {
  it("refuses a mutation made in the user's name", async () => {
    const caller = createCaller(await impersonatedContext("agent@kytelink.dev", true));
    await expect(caller.account.setAvatar({ image: null })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("still allows reads", async () => {
    const caller = createCaller(await impersonatedContext("agent@kytelink.dev", true));
    await expect(caller.org.listMine()).resolves.toBeDefined();
  });

  it("allows mutations under a full-access grant", async () => {
    const caller = createCaller(await impersonatedContext("agent@kytelink.dev", false));
    await expect(caller.account.setAvatar({ image: null })).resolves.toEqual({ ok: true });
  });

  it("never grants admin procedures, whatever the underlying session was", async () => {
    const context = await impersonatedContext("agent@kytelink.dev", false);
    const caller = createCaller({
      ...context,
      session: { ...context.session!, isAdmin: true },
    });
    await expect(caller.admin.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

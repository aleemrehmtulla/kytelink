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

const KYTE_ID = "usr_agent";

let store: MemoryStore;

function setRedirect(redirectUrl: string | null): void {
  const kyte = store.kytes.find((k) => k.id === KYTE_ID);
  if (!kyte) throw new Error("no fixture kyte");
  kyte.draft = { ...kyte.draft, shouldRedirect: redirectUrl !== null, redirectUrl };
}

async function agentCaller() {
  return createCaller(await contextFor(store, "agent@kytelink.dev"));
}

async function publish(): Promise<unknown> {
  return (await agentCaller()).kyte.publish({ kyteId: KYTE_ID });
}

async function schedule(): Promise<unknown> {
  return (await agentCaller()).schedule.create({
    kyteId: KYTE_ID,
    scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
    timezone: "UTC",
  });
}

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

describe("publish rejects self-referential redirects", () => {
  it("refuses a redirect to the kyte's own apex profile URL", async () => {
    setRedirect("https://kytelink.com/agent");
    await expect(publish()).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses www and vanity aliases of the same profile", async () => {
    for (const url of ["https://www.kytelink.com/agent", "https://kyte.bio/agent"]) {
      setRedirect(url);
      await expect(publish()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("refuses a redirect to the kyte's own custom domain", async () => {
    await store.addDomain({ kyteId: KYTE_ID, host: "links.agent.com", actorUserId: "usr_agent" });
    setRedirect("https://links.agent.com/anything");
    await expect(publish()).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("allows an external redirect, another profile, and no redirect at all", async () => {
    await store.addDomain({ kyteId: KYTE_ID, host: "links.agent.com", actorUserId: "usr_agent" });
    for (const url of ["https://example.com/agent", "https://kytelink.com/agency-flagship", null]) {
      setRedirect(url);
      await expect(publish()).resolves.toMatchObject({ publishSeq: expect.any(Number) });
    }
  });

  it("allows a stored redirect URL while shouldRedirect is off", async () => {
    const kyte = store.kytes.find((k) => k.id === KYTE_ID);
    if (!kyte) throw new Error("no fixture kyte");
    kyte.draft = { ...kyte.draft, shouldRedirect: false, redirectUrl: "https://kytelink.com/agent" };
    await expect(publish()).resolves.toMatchObject({ publishSeq: expect.any(Number) });
  });
});

// The scheduled-publish worker fires the snapshot captured here, so a schedule a
// manual publish would have refused must never be accepted in the first place.
describe("scheduling a publish applies the same guard", () => {
  it("refuses to schedule a looping draft, and refuses to re-snapshot into one", async () => {
    setRedirect("https://kyte.lol/agent");
    await expect(schedule()).rejects.toMatchObject({ code: "BAD_REQUEST" });

    setRedirect(null);
    const created = await schedule();
    expect(created).toMatchObject({ scheduleId: expect.any(String) });

    const { scheduleId } = created as { scheduleId: string };
    setRedirect("https://kytelink.com/agent");
    await expect(
      (await agentCaller()).schedule.updateSnapshot({ scheduleId }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("adding a domain the kyte already redirects to", () => {
  it("is refused for a draft target, a published target, and a www spelling", async () => {
    const caller = await agentCaller();
    for (const [redirect, host] of [
      ["https://links.agent.com", "links.agent.com"],
      ["https://links.agent.com", "www.links.agent.com"],
    ] as const) {
      setRedirect(redirect);
      await expect(caller.domains.add({ kyteId: KYTE_ID, host })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    }

    setRedirect(null);
    const kyte = store.kytes.find((k) => k.id === KYTE_ID);
    if (!kyte) throw new Error("no fixture kyte");
    kyte.published = { ...kyte.draft, shouldRedirect: true, redirectUrl: "https://links.agent.com" };
    await expect(
      caller.domains.add({ kyteId: KYTE_ID, host: "links.agent.com" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

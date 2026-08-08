import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@kytelink/db";
import { buildServer } from "../server";
import { loadConfig, setConfigForTest } from "../config";

const createdUserIds: string[] = [];

beforeEach(() => {
  setConfigForTest(loadConfig({ ...process.env, AGENT_MODE: "true", NODE_ENV: "test" }));
});

afterEach(async () => {
  const db = getDb();
  while (createdUserIds.length > 0) {
    const id = createdUserIds.pop();
    if (id) await db.user.delete({ where: { id } }).catch(() => undefined);
  }
});

describe("suspension never blocks sign-in", () => {
  it("dev-login mints a session for a SUSPENDED account", async () => {
    const db = getDb();
    const email = `suspended-${Date.now().toString(36)}@kytelink.dev`;
    const user = await db.user.create({
      data: {
        id: `usr_suspended_${Date.now().toString(36)}`,
        email,
        emailVerified: true,
        status: "SUSPENDED",
        statusReason: "phishing links in bio",
        statusChangedAt: new Date(),
        statusChangedBy: "admin@kytelink.dev",
      },
    });
    createdUserIds.push(user.id);

    const app = await buildServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/auth/dev-login",
        headers: { "content-type": "application/json" },
        payload: { email },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ ok: true, userId: user.id });
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(await db.session.count({ where: { userId: user.id } })).toBeGreaterThan(0);
    } finally {
      await app.close();
    }
  });
});

describe("POST /appeal", () => {
  // The appeal rate limit is 5/day/IP and its Redis counter outlives a test
  // run, so injecting from the default 127.0.0.1 starts failing with 429 on
  // the sixth run of the day. A per-run address keeps the budget fresh.
  const seed = Date.now();
  const remoteAddress = `10.99.${(seed >> 8) & 255}.${seed & 255}`;

  it("accepts an appeal and answers identically for an unknown handle", async () => {
    const app = await buildServer();
    try {
      const payload = {
        kind: "kyte",
        handle: "definitely-not-a-real-handle",
        email: "appellant@example.com",
        message: "I did not post any of that — please take another look.",
      };
      const res = await app.inject({
        method: "POST",
        url: "/appeal",
        headers: { "content-type": "application/json" },
        payload,
        remoteAddress,
      });

      expect(res.statusCode).toBe(202);
      expect(res.json()).toEqual({ ok: true });

      const row = await getDb().appeal.findFirst({
        where: { handle: payload.handle },
        orderBy: { createdAt: "desc" },
      });
      expect(row).toMatchObject({ kind: "kyte", status: "OPEN", email: payload.email });
      // The IP is stored only as a hash, never in the clear.
      expect(row?.ipHash).toMatch(/^[0-9a-f]{64}$/);
      if (row) await getDb().appeal.delete({ where: { id: row.id } });
    } finally {
      await app.close();
    }
  });

  it("rejects a body that is missing the message", async () => {
    const app = await buildServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/appeal",
        headers: { "content-type": "application/json" },
        payload: { kind: "user", handle: "someone", email: "a@b.com" },
        remoteAddress,
      });
      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});

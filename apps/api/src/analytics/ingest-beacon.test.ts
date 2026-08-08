import { describe, expect, it, vi } from "vitest";
import { RATE_LIMIT_CLASSES } from "@kytelink/schemas";
import type { Clickhouse } from "@kytelink/clickhouse";
import { ingestBeacon, type IngestDeps } from "./ingest-beacon";
import { bufferKey } from "./clickhouse-buffer";
import { kyteMapKey } from "./kyte-membership";

function fakeClickhouse(overrides: Partial<Clickhouse> = {}): Clickhouse {
  return {
    enabled: true,
    insertPageHits: vi.fn().mockResolvedValue(undefined),
    insertLinkHits: vi.fn().mockResolvedValue(undefined),
    insertProductEvents: vi.fn().mockResolvedValue(undefined),
    overview: vi.fn(),
    timeSeries: vi.fn(),
    topLinks: vi.fn(),
    referrers: vi.fn(),
    devices: vi.fn(),
    countries: vi.fn(),
    platformSeries: vi.fn(),
    topKytes: vi.fn(),
    ping: vi.fn(),
    close: vi.fn(),
    ...overrides,
  };
}

function fakeRedis() {
  const strings = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const counters = new Map<string, number>();
  const ttls = new Map<string, number>();
  return {
    strings,
    lists,
    counters,
    get: vi.fn(async (key: string) => strings.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      strings.set(key, value);
      return "OK";
    }),
    del: vi.fn(async (key: string) => {
      strings.delete(key);
      return 1;
    }),
    incr: vi.fn(async (key: string) => {
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return next;
    }),
    pexpire: vi.fn(async (key: string, ms: number) => {
      ttls.set(key, ms);
      return 1;
    }),
    pttl: vi.fn(async (key: string) => ttls.get(key) ?? -1),
    rpush: vi.fn(async (key: string, ...values: string[]) => {
      const list = lists.get(key) ?? [];
      list.push(...values);
      lists.set(key, list);
      return list.length;
    }),
    lpush: vi.fn(async (key: string, ...values: string[]) => {
      const list = [...values].reverse().concat(lists.get(key) ?? []);
      lists.set(key, list);
      return list.length;
    }),
    lpop: vi.fn(async (key: string, count: number) => {
      const list = lists.get(key) ?? [];
      const popped = list.splice(0, count);
      return popped.length > 0 ? popped : null;
    }),
    llen: vi.fn(async (key: string) => (lists.get(key) ?? []).length),
  };
}

function makeDeps(overrides: { ch?: Clickhouse; findUnique?: ReturnType<typeof vi.fn> } = {}) {
  const redis = fakeRedis();
  const ch = overrides.ch ?? fakeClickhouse();
  const findUnique = overrides.findUnique ?? vi.fn().mockResolvedValue(null);
  const deps: IngestDeps = {
    ch,
    redis: redis as unknown as IngestDeps["redis"],
    db: { publishedKyte: { findUnique } } as unknown as IngestDeps["db"],
    log: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } as unknown as IngestDeps["log"],
  };
  return { deps, redis, ch, findUnique };
}

const REAL_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

describe("ingestBeacon — page/link", () => {
  it("inserts a page hit for a beacon whose kyteId matches the resolved membership", async () => {
    const { deps, ch } = makeDeps({ findUnique: vi.fn().mockResolvedValue({ kyteId: "k_agent" }) });

    await ingestBeacon(deps, "page", {
      ip: "203.0.113.7",
      userAgent: REAL_UA,
      headers: { "cf-ipcountry": "US" },
      body: { username: "agent", kyteId: "k_agent", referrer: "https://www.google.com/search" },
    });

    expect(ch.insertPageHits).toHaveBeenCalledTimes(1);
    const [rows] = (ch.insertPageHits as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { kyte_id: string; username: string; country: string; device: string; ref_domain: string; is_bot: number }[],
    ];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kyte_id: "k_agent",
      username: "agent",
      country: "US",
      device: "MOBILE",
      ref_domain: "google.com",
      is_bot: 0,
    });
  });

  it("rejects a spoofed kyteId and inserts nothing", async () => {
    const { deps, ch } = makeDeps({ findUnique: vi.fn().mockResolvedValue({ kyteId: "k_real_owner" }) });

    await ingestBeacon(deps, "page", {
      ip: "203.0.113.7",
      userAgent: REAL_UA,
      body: { username: "agent", kyteId: "k_attacker_spoofed" },
    });

    expect(ch.insertPageHits).not.toHaveBeenCalled();
  });

  it("drops a beacon for a username with no published kyte", async () => {
    const { deps, ch } = makeDeps({ findUnique: vi.fn().mockResolvedValue(null) });

    await ingestBeacon(deps, "page", {
      ip: "203.0.113.7",
      body: { username: "nobody", kyteId: "k_fake" },
    });

    expect(ch.insertPageHits).not.toHaveBeenCalled();
  });

  it("inserts a link hit with link_url/link_title", async () => {
    const { deps, ch } = makeDeps({ findUnique: vi.fn().mockResolvedValue({ kyteId: "k_agent" }) });

    await ingestBeacon(deps, "link", {
      ip: "203.0.113.9",
      body: { username: "agent", kyteId: "k_agent", linkUrl: "https://x.com/agent", linkTitle: "X" },
    });

    expect(ch.insertLinkHits).toHaveBeenCalledTimes(1);
    const [rows] = (ch.insertLinkHits as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { link_url: string; link_title: string }[],
    ];
    expect(rows[0]).toMatchObject({ link_url: "https://x.com/agent", link_title: "X" });
  });

  it("caches a repeat lookup from redis instead of re-querying postgres", async () => {
    const findUnique = vi.fn().mockResolvedValue({ kyteId: "k_agent" });
    const { deps } = makeDeps({ findUnique });

    await ingestBeacon(deps, "page", { ip: "203.0.113.7", body: { username: "agent", kyteId: "k_agent" } });
    await ingestBeacon(deps, "page", { ip: "203.0.113.7", body: { username: "agent", kyteId: "k_agent" } });

    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it("never throws when the envelope is malformed", async () => {
    const { deps } = makeDeps();
    await expect(ingestBeacon(deps, "page", { body: {} })).resolves.toBeUndefined();
    await expect(ingestBeacon(deps, "page", "not-an-object")).resolves.toBeUndefined();
    await expect(ingestBeacon(deps, "page", undefined)).resolves.toBeUndefined();
  });

  it("buffers to redis instead of throwing when clickhouse insert fails, and never rejects", async () => {
    const ch = fakeClickhouse({ insertPageHits: vi.fn().mockRejectedValue(new Error("clickhouse down")) });
    const { deps, redis } = makeDeps({ ch, findUnique: vi.fn().mockResolvedValue({ kyteId: "k_agent" }) });

    await expect(
      ingestBeacon(deps, "page", { ip: "203.0.113.7", body: { username: "agent", kyteId: "k_agent" } }),
    ).resolves.toBeUndefined();

    expect(redis.lists.get(bufferKey("page_hits"))).toHaveLength(1);
  });

  it("enforces the beacon-per-kyte rate limit and drops beacons past it", async () => {
    const { deps, ch } = makeDeps({ findUnique: vi.fn().mockResolvedValue({ kyteId: "k_agent" }) });
    const perKyteRule = RATE_LIMIT_CLASSES["beacon-per-kyte"].find(
      (rule) => rule.subject === "ip+kyte",
    );
    if (!perKyteRule) throw new Error("beacon-per-kyte rule missing");
    const cap = Math.min(perKyteRule.limit, RATE_LIMIT_CLASSES.beacon[0]!.limit);

    for (let i = 0; i < cap; i++) {
      await ingestBeacon(deps, "page", { ip: "203.0.113.7", body: { username: "agent", kyteId: "k_agent" } });
    }
    expect(ch.insertPageHits).toHaveBeenCalledTimes(cap);

    await ingestBeacon(deps, "page", { ip: "203.0.113.7", body: { username: "agent", kyteId: "k_agent" } });
    expect(ch.insertPageHits).toHaveBeenCalledTimes(cap);
  });
});

describe("ingestBeacon — event", () => {
  it("inserts a product event with typed properties, including a ref for signup_completed", async () => {
    const { deps, ch } = makeDeps();

    await ingestBeacon(deps, "event", {
      ip: "203.0.113.5",
      sessionUserId: "u1",
      body: { event: "signup_completed", ref: "agent" },
    });

    expect(ch.insertProductEvents).toHaveBeenCalledTimes(1);
    const [rows] = (ch.insertProductEvents as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { event: string; user_id: string; properties: string }[],
    ];
    expect(rows[0]?.event).toBe("signup_completed");
    expect(rows[0]?.user_id).toBe("u1");
    expect(JSON.parse(rows[0]?.properties ?? "{}")).toEqual({ ref: "agent" });
  });

  // S3 regression: attribution must come from the session, never the body — the
  // beacon endpoint is unauthenticated and any visitor can post whatever they like.
  it("ignores userId and kyteId in the beacon body, attributing only from the session", async () => {
    const { deps, ch } = makeDeps();

    await ingestBeacon(deps, "event", {
      ip: "203.0.113.5",
      sessionUserId: "real-user",
      body: { event: "login", userId: "victim-user", kyteId: "victim-kyte" },
    });

    const [rows] = (ch.insertProductEvents as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { user_id: string; kyte_id: string }[],
    ];
    expect(rows[0]?.user_id).toBe("real-user");
    expect(rows[0]?.kyte_id).toBe("");
  });

  it("records an empty user_id for a logged-out sender rather than trusting the body", async () => {
    const { deps, ch } = makeDeps();

    await ingestBeacon(deps, "event", {
      ip: "203.0.113.5",
      body: { event: "hit_landing", userId: "forged" },
    });

    const [rows] = (ch.insertProductEvents as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { user_id: string }[],
    ];
    expect(rows[0]?.user_id).toBe("");
  });

  it("drops an event beacon with properties that fail the event's typed schema", async () => {
    const { deps, ch } = makeDeps();

    await ingestBeacon(deps, "event", {
      ip: "203.0.113.5",
      body: { event: "login", properties: { unexpectedField: "nope" } },
    });

    expect(ch.insertProductEvents).not.toHaveBeenCalled();
  });

  it("does not require kyte membership validation for account-level events", async () => {
    const { deps, ch, findUnique } = makeDeps();

    await ingestBeacon(deps, "event", { ip: "203.0.113.5", body: { event: "hit_landing" } });

    expect(ch.insertProductEvents).toHaveBeenCalledTimes(1);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("ingestBeacon — kyte-map integration", () => {
  it("resolves through the redis kyte-map key the publish flow is expected to populate", async () => {
    const { deps, redis, ch } = makeDeps({ findUnique: vi.fn() });
    redis.strings.set(kyteMapKey("agent"), "k_agent");

    await ingestBeacon(deps, "page", { ip: "203.0.113.7", body: { username: "agent", kyteId: "k_agent" } });

    expect(ch.insertPageHits).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@kytelink/db";
import type { DomainConnectionState, DomainProvider } from "../domains";
import { DOMAIN_GRACE_MS, runDomainReaper } from "./domain-reaper";

const NOW = new Date("2026-07-26T12:00:00.000Z");
const hoursAgo = (h: number): Date => new Date(NOW.getTime() - h * 3_600_000);

interface DomainSeed {
  domain: string;
  kyteId: string;
  verified: boolean;
  createdAt: Date;
  lastVerifiedAt: Date | null;
}

function fakeDb(domains: DomainSeed[]) {
  const rows = [...domains];
  const updates: { domain: string; data: Record<string, unknown> }[] = [];
  const deletes: string[] = [];
  const audits: Record<string, unknown>[] = [];
  const tx = {
    domain: { delete: vi.fn(async ({ where }: never) => void deletes.push((where as { domain: string }).domain)) },
    auditLog: { create: vi.fn(async ({ data }: never) => void audits.push(data as Record<string, unknown>)) },
  };
  const db = {
    domain: {
      findMany: vi.fn(async () => rows),
      update: vi.fn(async ({ where, data }: never) => {
        updates.push({ domain: (where as { domain: string }).domain, data: data as Record<string, unknown> });
      }),
    },
    kyte: { findUnique: vi.fn(async () => ({ id: "k1", orgId: "o1" })) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => fn(tx)),
  };
  return { db: db as unknown as PrismaClient, updates, deletes, audits };
}

function fakeProvider(state: DomainConnectionState | Error): DomainProvider & { detached: string[] } {
  const detached: string[] = [];
  return {
    kind: "proxy",
    detached,
    attach: vi.fn(async () => undefined),
    detach: vi.fn(async (host: string) => void detached.push(host)),
    status: vi.fn(async () => {
      if (state instanceof Error) throw state;
      return state;
    }),
  };
}

vi.mock("../redis", () => ({ getRedis: () => ({ del: vi.fn(async () => 1) }) }));
vi.mock("../config", () => ({ getConfig: () => ({ capabilities: { domains: false } }) }));
vi.mock("../logger", () => {
  const stub = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  return { logger: stub, taggedLogger: () => stub };
});

describe("domain reaper", () => {
  it("marks a connected domain verified and stamps lastVerifiedAt", async () => {
    const { db, updates } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: false, createdAt: hoursAgo(1), lastVerifiedAt: null },
    ]);
    const result = await runDomainReaper({ force: true, db, provider: fakeProvider("CONNECTED"), now: NOW });

    expect(result).toMatchObject({ confirmed: 1, reaped: 0 });
    expect(updates[0]?.data).toEqual({ verified: true, lastVerifiedAt: NOW });
  });

  it("un-verifies a broken domain inside the grace window but keeps the row", async () => {
    const { db, updates, deletes } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: true, createdAt: hoursAgo(72), lastVerifiedAt: hoursAgo(5) },
    ]);
    const provider = fakeProvider("PENDING");
    const result = await runDomainReaper({ force: true, db, provider, now: NOW });

    expect(result).toMatchObject({ pending: 1, reaped: 0 });
    expect(updates[0]?.data).toEqual({ verified: false });
    expect(deletes).toEqual([]);
    expect(provider.detached).toEqual([]);
  });

  it("reaps a domain never connected within 48h — from the provider and from us", async () => {
    const { db, deletes, audits } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: false, createdAt: hoursAgo(49), lastVerifiedAt: null },
    ]);
    const provider = fakeProvider("PENDING");
    const result = await runDomainReaper({ force: true, db, provider, now: NOW });

    expect(result).toMatchObject({ reaped: 1 });
    expect(provider.detached).toEqual(["a.com"]);
    expect(deletes).toEqual(["a.com"]);
    expect(audits[0]).toMatchObject({ action: "domain.reaped" });
  });

  it("reaps a domain that worked and has been disconnected 48h, measured from lastVerifiedAt", async () => {
    const { db, deletes } = fakeDb([
      // Added long ago and healthy for months — only the disconnect clock counts.
      { domain: "a.com", kyteId: "k1", verified: true, createdAt: hoursAgo(5000), lastVerifiedAt: hoursAgo(49) },
    ]);
    const provider = fakeProvider("PENDING");

    expect(await runDomainReaper({ force: true, db, provider, now: NOW })).toMatchObject({ reaped: 1 });
    expect(provider.detached).toEqual(["a.com"]);
    expect(deletes).toEqual(["a.com"]);
  });

  it("does not reap one second before the deadline", async () => {
    const justInside = new Date(NOW.getTime() - DOMAIN_GRACE_MS + 1000);
    const { db, deletes } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: false, createdAt: justInside, lastVerifiedAt: null },
    ]);
    expect(await runDomainReaper({ force: true, db, provider: fakeProvider("PENDING"), now: NOW })).toMatchObject({
      pending: 1,
      reaped: 0,
    });
    expect(deletes).toEqual([]);
  });

  // A provider outage returning errors for every domain must not wipe the table.
  it("leaves everything untouched when the provider check throws", async () => {
    const { db, updates, deletes } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: true, createdAt: hoursAgo(5000), lastVerifiedAt: hoursAgo(9999) },
    ]);
    const provider = fakeProvider(new Error("vercel is down"));
    const result = await runDomainReaper({ force: true, db, provider, now: NOW });

    expect(result).toMatchObject({ checked: 1, confirmed: 0, pending: 0, reaped: 0 });
    expect(updates).toEqual([]);
    expect(deletes).toEqual([]);
    expect(provider.detached).toEqual([]);
  });

  // ERROR means "could not determine" — an expired API token or unset record
  // targets must not be read as "every domain is disconnected".
  it("never reaps on an inconclusive ERROR, however old the domain is", async () => {
    const { db, updates, deletes } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: true, createdAt: hoursAgo(9000), lastVerifiedAt: hoursAgo(9000) },
    ]);
    const provider = fakeProvider("ERROR");
    const result = await runDomainReaper({ force: true, db, provider, now: NOW });

    expect(result).toMatchObject({ inconclusive: 1, reaped: 0, pending: 0 });
    expect(updates).toEqual([]);
    expect(deletes).toEqual([]);
    expect(provider.detached).toEqual([]);
  });

  // Local dev and unconfigured self-hosts have no provider to ask; sweeping
  // there would delete the seeded fixtures.
  it("skips entirely when the domains capability is off", async () => {
    const { db, deletes } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: true, createdAt: hoursAgo(9000), lastVerifiedAt: null },
    ]);
    const result = await runDomainReaper({ db, provider: fakeProvider("PENDING"), now: NOW });

    expect(result).toMatchObject({ checked: 0, reaped: 0, skipped: "domains-capability-off" });
    expect(deletes).toEqual([]);
  });

  // The path that takes a freshly-pointed domain live without the user sitting on
  // the editor tab. It must never delete anything — v1 served on DNS alone, and a
  // frequent sweep that could reap would be far more dangerous than the 6h one.
  it("pendingOnly promotes a newly-connected domain and never reaps", async () => {
    const { db, updates, deletes } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: false, createdAt: hoursAgo(500), lastVerifiedAt: null },
    ]);
    const provider = fakeProvider("CONNECTED");
    const result = await runDomainReaper({ force: true, pendingOnly: true, db, provider, now: NOW });

    expect(result).toMatchObject({ confirmed: 1, reaped: 0 });
    expect(updates[0]?.data).toEqual({ verified: true, lastVerifiedAt: NOW });
    expect(deletes).toEqual([]);
  });

  it("pendingOnly leaves a long-dead domain alone instead of reaping it", async () => {
    const { db, deletes } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: false, createdAt: hoursAgo(9000), lastVerifiedAt: null },
    ]);
    const provider = fakeProvider("PENDING");
    const result = await runDomainReaper({ force: true, pendingOnly: true, db, provider, now: NOW });

    expect(result).toMatchObject({ pending: 1, reaped: 0 });
    expect(deletes).toEqual([]);
    expect(provider.detached).toEqual([]);
  });

  it("still deletes the row when detach fails, so it cannot retry forever", async () => {
    const { db, deletes } = fakeDb([
      { domain: "a.com", kyteId: "k1", verified: false, createdAt: hoursAgo(100), lastVerifiedAt: null },
    ]);
    const provider = fakeProvider("PENDING");
    provider.detach = vi.fn(async () => {
      throw new Error("provider 500");
    });

    expect(await runDomainReaper({ force: true, db, provider, now: NOW })).toMatchObject({ reaped: 1 });
    expect(deletes).toEqual(["a.com"]);
  });
});

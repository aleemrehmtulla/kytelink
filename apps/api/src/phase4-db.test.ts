import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "@kytelink/db";
import { resolveProfile, resolvePreview } from "./internal/data";
import { getRedis } from "./redis";
import { PrismaStore } from "./store/prisma-store";

const createdOrgIds: string[] = [];

async function freshOrgAndKyte(): Promise<{ orgId: string; kyteId: string; store: PrismaStore }> {
  const db = getDb();
  const org = await db.organization.create({ data: { name: `phase4-${crypto.randomUUID()}` } });
  createdOrgIds.push(org.id);
  const store = new PrismaStore(db, getRedis());
  const { kyteId } = await store.createKyte({ orgId: org.id, actorUserId: "phase4-tester" });
  return { orgId: org.id, kyteId, store };
}

afterEach(async () => {
  const db = getDb();
  while (createdOrgIds.length > 0) {
    const id = createdOrgIds.pop();
    if (id) await db.organization.delete({ where: { id } }).catch(() => undefined);
  }
});

describe("publishKyte assigns atomic, distinct publishSeqs under concurrency (H5)", () => {
  it("N concurrent publishes yield N distinct, gap-free increasing seqs", async () => {
    const { kyteId, store } = await freshOrgAndKyte();
    const first = await store.publishKyte({ kyteId, actorUserId: "phase4-tester" });
    expect(first.publishSeq).toBe(1);

    const N = 8;
    const results = await Promise.all(
      Array.from({ length: N }, () => store.publishKyte({ kyteId, actorUserId: "phase4-tester" })),
    );
    const seqs = results.map((r) => r.publishSeq).sort((a, b) => a - b);
    expect(new Set(seqs).size).toBe(N);
    expect(seqs).toEqual(Array.from({ length: N }, (_, i) => i + 2));

    const published = await getDb().publishedKyte.findUnique({ where: { kyteId } });
    expect(published?.publishSeq).toBe(N + 1);
  });
});

describe("resolvePreview compares the passcode in constant time (S6)", () => {
  it("accepts the correct passcode and rejects wrong passcode / token", async () => {
    const { kyteId } = await freshOrgAndKyte();
    await getDb().previewLink.create({
      data: {
        kyteId,
        token: "phase4-token",
        passcode: "246810",
        createdById: "phase4-tester",
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });

    expect((await resolvePreview("phase4-token", "246810")).ok).toBe(true);
    expect((await resolvePreview("phase4-token", "000000")).ok).toBe(false);
    expect((await resolvePreview("phase4-token", "24681")).ok).toBe(false);
    expect((await resolvePreview("wrong-token", "246810")).ok).toBe(false);
  });

  it("rejects an expired link", async () => {
    const { kyteId } = await freshOrgAndKyte();
    await getDb().previewLink.create({
      data: {
        kyteId,
        token: "phase4-expired",
        passcode: "135791",
        createdById: "phase4-tester",
        expiresAt: new Date(Date.now() - 1_000),
      },
    });

    expect((await resolvePreview("phase4-expired", "135791")).ok).toBe(false);
  });
});

describe("resolveProfile carries the OG image URL (M7)", () => {
  it("includes ogImageUrl null when no OG asset exists, and a CDN url when it does", async () => {
    const { kyteId, store } = await freshOrgAndKyte();
    const username = `phase4-${Date.now().toString(36)}`;
    await store.changeUsername({ kyteId, actorUserId: "phase4-tester", username });
    await store.publishKyte({ kyteId, actorUserId: "phase4-tester" });
    await getRedis().del(`profile:${username}`);

    const withoutOg = await resolveProfile(username);
    expect(withoutOg).not.toBeNull();
    expect(withoutOg?.ogImageUrl).toBeNull();

    await getDb().asset.create({
      data: {
        kyteId,
        key: `u/${kyteId}/og.png`,
        kind: "OG_IMAGE",
        contentType: "image/png",
        sizeBytes: 1234,
      },
    });
    await getRedis().del(`profile:${username}`);

    const withOg = await resolveProfile(username);
    expect(withOg?.ogImageUrl).toContain(`u/${kyteId}/og.png`);
  });
});

describe("an org suspension makes every member kyte effectively suspended", () => {
  it("flips the served moderationStatus and carries the reason, then restores", async () => {
    const { orgId, kyteId, store } = await freshOrgAndKyte();
    const username = `orgsusp-${Date.now().toString(36)}`;
    await store.changeUsername({ kyteId, actorUserId: "phase4-tester", username });
    await store.publishKyte({ kyteId, actorUserId: "phase4-tester" });
    await getRedis().del(`profile:${username}`);

    const live = await resolveProfile(username);
    expect(live?.moderationStatus).toBe("APPROVED");
    expect(live?.suspensionReason).toBeNull();

    await store.setOrgSuspension({
      orgId,
      suspended: true,
      reason: "owner suspended for phishing",
      actorEmail: "admin@kytelink.dev",
      cause: "user_phase4-tester",
    });
    await getRedis().del(`profile:${username}`);

    const down = await resolveProfile(username);
    // The kyte's own column is untouched — only the effective status changes.
    expect(await getDb().publishedKyte.findUnique({ where: { kyteId } })).toMatchObject({
      moderationStatus: "APPROVED",
    });
    expect(down?.moderationStatus).toBe("SUSPENDED");
    expect(down?.suspensionReason).toBe("owner suspended for phishing");

    await store.setOrgSuspension({
      orgId,
      suspended: false,
      reason: "appeal upheld",
      actorEmail: "admin@kytelink.dev",
      cause: null,
    });
    await getRedis().del(`profile:${username}`);

    const restored = await resolveProfile(username);
    expect(restored?.moderationStatus).toBe("APPROVED");
    expect(restored?.suspensionReason).toBeNull();
  });
});

describe("a kyte's own suspension reason wins over its org's", () => {
  it("prefers the latest SUSPEND ModerationReview", async () => {
    const { orgId, kyteId, store } = await freshOrgAndKyte();
    const username = `kytesusp-${Date.now().toString(36)}`;
    await store.changeUsername({ kyteId, actorUserId: "phase4-tester", username });
    await store.publishKyte({ kyteId, actorUserId: "phase4-tester" });
    await store.setKyteModeration(kyteId, "SUSPENDED");
    await getDb().moderationReview.create({
      data: {
        kyteId,
        contentHash: "hash",
        verdict: "SUSPEND",
        categories: ["nsfw"],
        reason: "explicit imagery on the avatar",
        provider: "deterministic",
      },
    });
    await store.setOrgSuspension({
      orgId,
      suspended: true,
      reason: "org-level reason",
      actorEmail: "admin@kytelink.dev",
      cause: null,
    });
    await getRedis().del(`profile:${username}`);

    const payload = await resolveProfile(username);
    expect(payload?.moderationStatus).toBe("SUSPENDED");
    expect(payload?.suspensionReason).toBe("explicit imagery on the avatar");
  });
});

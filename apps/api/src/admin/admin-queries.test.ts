import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "@kytelink/db";
import { exportRows } from "./admin-exports";
import { kytePublishedSnapshot, searchUsers, suspendedList } from "./admin-queries";
import { storageOrgFiles, storageOrphans } from "./storage-queries";

const hasDb = Boolean(process.env.DATABASE_URL);

const createdUserIds: string[] = [];
const createdOrgIds: string[] = [];

afterEach(async () => {
  if (!hasDb) return;
  const db = getDb();
  while (createdOrgIds.length > 0) {
    const id = createdOrgIds.pop();
    if (id) await db.organization.delete({ where: { id } }).catch(() => undefined);
  }
  while (createdUserIds.length > 0) {
    const id = createdUserIds.pop();
    if (id) await db.user.delete({ where: { id } }).catch(() => undefined);
  }
});

async function seedUsers(count: number, tag: string): Promise<string[]> {
  const db = getDb();
  const ids: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const id = `adminq_${tag}_${index}`;
    await db.user.create({
      data: {
        id,
        email: `${tag}+${index}@admin-queries.test`,
        name: `Fixture ${index}`,
        createdAt: new Date(Date.UTC(2026, 0, index + 1)),
      },
    });
    createdUserIds.push(id);
    ids.push(id);
  }
  return ids;
}

describe.skipIf(!hasDb)("pagination totals are the filtered total, not the page size", () => {
  it("reports the same accurate total on every page and past the end", async () => {
    const tag = `pg${Date.now().toString(36)}`;
    await seedUsers(7, tag);
    const base = { query: tag, sort: "createdAt" as const, dir: "asc" as const };

    const first = await searchUsers(getDb(), { ...base, page: 1, pageSize: 2 });
    expect(first.total).toBe(7);
    expect(first.rows).toHaveLength(2);
    expect(first.page).toBe(1);
    expect(first.pageSize).toBe(2);

    const last = await searchUsers(getDb(), { ...base, page: 4, pageSize: 2 });
    expect(last.total).toBe(7);
    expect(last.rows).toHaveLength(1);

    const beyond = await searchUsers(getDb(), { ...base, page: 9, pageSize: 2 });
    expect(beyond.rows).toHaveLength(0);

    const seen = new Set<string>();
    for (const page of [1, 2, 3, 4]) {
      const result = await searchUsers(getDb(), { ...base, page, pageSize: 2 });
      for (const row of result.rows) seen.add(row.id);
    }
    expect(seen.size).toBe(7);
  });

  it("narrows the total when a status filter is applied", async () => {
    const tag = `st${Date.now().toString(36)}`;
    const ids = await seedUsers(4, tag);
    await getDb().user.update({
      where: { id: ids[0] as string },
      data: { status: "SUSPENDED", statusReason: "test" },
    });

    const all = await searchUsers(getDb(), {
      query: tag,
      sort: "createdAt",
      dir: "desc",
      page: 1,
      pageSize: 25,
    });
    expect(all.total).toBe(4);

    const suspended = await searchUsers(getDb(), {
      query: tag,
      status: "SUSPENDED",
      sort: "createdAt",
      dir: "desc",
      page: 1,
      pageSize: 25,
    });
    expect(suspended.total).toBe(1);
    expect(suspended.rows[0]?.status).toBe("SUSPENDED");
  });

  it("treats % and _ in the search box as literal characters", async () => {
    const tag = `lit${Date.now().toString(36)}`;
    await seedUsers(2, tag);
    const result = await searchUsers(getDb(), {
      query: "%",
      sort: "createdAt",
      dir: "desc",
      page: 1,
      pageSize: 25,
    });
    // A literal "%" matches no fixture email, where an unescaped wildcard would
    // have matched every user in the database.
    expect(result.rows.every((row) => !row.email.startsWith(tag))).toBe(true);
  });
});

describe.skipIf(!hasDb)("exportRows", () => {
  it("returns human column labels, flat rows and an honest truncation flag", async () => {
    const tag = `ex${Date.now().toString(36)}`;
    await seedUsers(5, tag);

    const full = await exportRows(
      "users",
      { query: tag },
      { db: getDb(), webBaseUrl: "http://localhost:3000", limit: 1000 },
    );
    expect(full.total).toBe(5);
    expect(full.rows).toHaveLength(5);
    expect(full.columns.map((column) => column.label)).toContain("Signed up");
    expect(full.columns.map((column) => column.label)).not.toContain("createdAt");
    const row = full.rows[0];
    expect(typeof row?.storageBytes).toBe("number");
    expect(typeof row?.createdAt).toBe("string");

    const capped = await exportRows(
      "users",
      { query: tag },
      { db: getDb(), webBaseUrl: "http://localhost:3000", limit: 2 },
    );
    expect(capped.rows).toHaveLength(2);
    expect(capped.total).toBe(5);
  });

  it("ignores unknown keys and falls back on invalid values instead of throwing", async () => {
    const tag = `lenient${Date.now().toString(36)}`;
    await seedUsers(2, tag);

    const result = await exportRows(
      "users",
      {
        query: tag,
        // A stale client sending garbage must never 400 an export.
        sort: "notAColumn",
        dir: 42,
        status: "NOT_A_STATUS",
        someRemovedFilter: { nested: true },
      },
      { db: getDb(), webBaseUrl: "http://localhost:3000", limit: 100 },
    );
    expect(result.total).toBe(2);
    expect(result.rows).toHaveLength(2);
  });
});

describe.skipIf(!hasDb)("orphan detection follows reachability, not the old avatar guess", () => {
  it("flags only assets no published or draft content can reach", async () => {
    const db = getDb();
    const tag = `orph${Date.now().toString(36)}`;
    const [ownerId] = await seedUsers(1, tag);

    const org = await db.organization.create({
      data: {
        name: `Orphan fixture ${tag}`,
        members: { create: { userId: ownerId as string, role: "OWNER", kyteAccess: "ALL" } },
      },
    });
    createdOrgIds.push(org.id);

    const kyteId = `kyte_${tag}`;
    const avatarId = `asset_avatar_${tag}`;
    const liveLinkKey = `u/${kyteId}/links/live.webp`;

    await db.kyte.create({
      data: {
        id: kyteId,
        orgId: org.id,
        username: `orphan-${tag}`,
        avatarAssetId: avatarId,
        links: [{ title: "Live", link: "https://example.com", emoji: `https://cdn.test/${liveLinkKey}` }],
      },
    });

    await db.asset.createMany({
      data: [
        {
          id: avatarId,
          kyteId,
          key: `u/${kyteId}/avatar/a.webp`,
          kind: "AVATAR",
          contentType: "image/webp",
          sizeBytes: 100,
        },
        {
          id: `asset_live_${tag}`,
          kyteId,
          key: liveLinkKey,
          kind: "LINK_IMAGE",
          contentType: "image/webp",
          sizeBytes: 200,
        },
        {
          id: `asset_dead_${tag}`,
          kyteId,
          key: `u/${kyteId}/links/dead.webp`,
          kind: "LINK_IMAGE",
          contentType: "image/webp",
          sizeBytes: 300,
        },
        {
          id: `asset_og_${tag}`,
          kyteId,
          key: `u/${kyteId}/og/hash.png`,
          kind: "OG_IMAGE",
          contentType: "image/png",
          sizeBytes: 400,
        },
      ],
    });

    const files = await storageOrgFiles(db, {
      orgId: org.id,
      sort: "sizeBytes",
      dir: "asc",
      page: 1,
      pageSize: 25,
    });
    expect(files.total).toBe(4);
    const orphaned = new Map(files.rows.map((row) => [row.assetId, row.orphaned]));
    expect(orphaned.get(avatarId)).toBe(false);
    expect(orphaned.get(`asset_live_${tag}`)).toBe(false);
    expect(orphaned.get(`asset_dead_${tag}`)).toBe(true);
    expect(orphaned.get(`asset_og_${tag}`)).toBe(false);

    expect(files.org.assetCount).toBe(4);
    expect(files.org.totalBytes).toBe(1000);
    expect(files.org.ownerEmail).toContain(tag);

    const orphanPage = await storageOrphans(db, { page: 1, pageSize: 100 });
    const ids = orphanPage.rows.map((row) => row.assetId);
    expect(ids).toContain(`asset_dead_${tag}`);
    expect(ids).not.toContain(`asset_live_${tag}`);
  });
});

describe.skipIf(!hasDb)("kytePublishedSnapshot serves what the public page refuses to", () => {
  async function seedSuspendedKyte(tag: string): Promise<string> {
    const db = getDb();
    const [userId] = await seedUsers(1, tag);
    const org = await db.organization.create({ data: { name: `Org ${tag}`, personal: true } });
    createdOrgIds.push(org.id);
    await db.orgMember.create({
      data: { orgId: org.id, userId: userId!, role: "OWNER", kyteAccess: "ALL" },
    });

    const kyteId = `kyte_${tag}`;
    const columns = {
      username: tag,
      displayName: "Snapshot Fixture",
      description: "Reviewed under suspension.",
      theme: "midnight",
      links: [{ title: "Sketchy", link: "https://example.invalid/promo" }],
    };
    await db.kyte.create({ data: { id: kyteId, orgId: org.id, ...columns } });
    await db.publishedKyte.create({
      data: { kyteId, ...columns, moderationStatus: "SUSPENDED", publishSeq: 3 },
    });
    await db.moderationReview.create({
      data: {
        kyteId,
        contentHash: `hash_${tag}`,
        verdict: "SUSPEND",
        categories: ["spam"],
        reason: "Phishing link in the first button.",
        provider: "deterministic",
        confidence: 0.91,
        signals: { sus_link: [{ url: "https://example.invalid/promo" }] },
        reviewedBy: `admin-sweep:agent-admin@kytelink.dev`,
      },
    });
    return kyteId;
  }

  it("returns the full published content of a suspended kyte, plus its verdict trail", async () => {
    const tag = `snap${Date.now().toString(36)}`;
    const kyteId = await seedSuspendedKyte(tag);

    const snapshot = await kytePublishedSnapshot(getDb(), kyteId, "https://kytelink.com");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.moderationStatus).toBe("SUSPENDED");
    // The whole point: a suspended page's real content, not the blocked shell.
    expect(snapshot?.content.displayName).toBe("Snapshot Fixture");
    expect(snapshot?.content.theme).toBe("midnight");
    expect(snapshot?.content.links).toHaveLength(1);
    expect(snapshot?.publicUrl).toBe(`https://kytelink.com/${tag}`);
    expect(snapshot?.publishSeq).toBe(3);
    expect(snapshot?.suspensionReason).toBe("Phishing link in the first button.");

    expect(snapshot?.latestReview?.provider).toBe("deterministic");
    expect(snapshot?.latestReview?.confidence).toBeCloseTo(0.91);
    expect(snapshot?.latestReview?.reviewedBy).toBe("admin-sweep:agent-admin@kytelink.dev");
    expect(snapshot?.latestReview?.signals.map((signal) => signal.key)).toEqual(["sus_links"]);
    expect(snapshot?.reviewHistory).toHaveLength(1);
  });

  it("carries the verdict's own provenance onto the suspended list row", async () => {
    const tag = `srow${Date.now().toString(36)}`;
    await seedSuspendedKyte(tag);

    const list = await suspendedList(getDb(), {
      search: tag,
      sort: "suspendedAt",
      dir: "desc",
      page: 1,
      pageSize: 25,
    });
    const row = list.rows.find((entry) => entry.username === tag);
    expect(row?.verdict).toBe("SUSPEND");
    expect(row?.provider).toBe("deterministic");
    expect(row?.reviewedAt).toEqual(expect.any(String));
  });

  it("returns null for a kyte that was never published", async () => {
    expect(await kytePublishedSnapshot(getDb(), "kyte_does_not_exist", "https://kytelink.com")).toBeNull();
  });
});

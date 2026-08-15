import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "@kytelink/db";
import { buildServer } from "../server";
import { getRedis } from "../redis";
import { PrismaStore } from "../store/prisma-store";
import type { DirectoryPage } from "@kytelink/schemas";

const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

const createdOrgIds: string[] = [];

function store(): PrismaStore {
  return new PrismaStore(getDb(), getRedis());
}

async function publishedKyte(): Promise<{ kyteId: string; username: string }> {
  const db = getDb();
  const org = await db.organization.create({ data: { name: `dir-${randomUUID()}` } });
  createdOrgIds.push(org.id);
  const s = store();
  const { kyteId } = await s.createKyte({ orgId: org.id, actorUserId: "dir-tester" });
  const username = `dir${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  await s.changeUsername({ kyteId, actorUserId: "dir-tester", username });
  await s.publishKyte({ kyteId, actorUserId: "dir-tester" });
  return { kyteId, username };
}

interface Result {
  statusCode: number;
  body: string;
  cacheControl: string | string[] | undefined;
}

async function get(page: string): Promise<Result> {
  const app = await buildServer();
  try {
    const response = await app.inject({ method: "GET", url: `/directory/${page}` });
    return {
      statusCode: response.statusCode,
      body: response.body,
      cacheControl: response.headers["cache-control"],
    };
  } finally {
    await app.close();
  }
}

afterEach(async () => {
  const db = getDb();
  while (createdOrgIds.length > 0) {
    const id = createdOrgIds.pop();
    if (id) await db.organization.delete({ where: { id } }).catch(() => undefined);
  }
});

describe("GET /directory/:page (public /discover listing)", () => {
  // Public on purpose: the payload is the sitemap's own URL set plus each page's
  // public display name and avatar, so it carries no HMAC and needs no session.
  it("serves without any authentication", async () => {
    expect((await get("1")).statusCode).toBe(200);
  });

  it("is cacheable at the edge", async () => {
    expect((await get("1")).cacheControl).toBe(CACHE_CONTROL);
  });

  it("returns a page of published profiles", async () => {
    await publishedKyte();
    const response = await get("1");
    expect(response.statusCode).toBe(200);

    const page = JSON.parse(response.body) as DirectoryPage;
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(100);
    expect(page.total).toBeGreaterThanOrEqual(1);
    expect(page.pageCount).toBe(Math.max(1, Math.ceil(page.total / page.pageSize)));
    expect(page.entries.length).toBeLessThanOrEqual(page.pageSize);
    expect(page.entries.every((entry) => typeof entry.username === "string")).toBe(true);
  });

  it("carries an avatar field on every entry", async () => {
    await publishedKyte();
    const page = JSON.parse((await get("1")).body) as DirectoryPage;
    expect(page.entries.length).toBeGreaterThan(0);
    for (const entry of page.entries) {
      expect(entry).toHaveProperty("avatarUrl");
      expect(entry).toHaveProperty("lqipUrl");
      expect(entry.avatarUrl === null || typeof entry.avatarUrl === "string").toBe(true);
    }
  });

  // The directory is the only internal link into the profile pages, so it must
  // never link a URL that answers with a 307.
  it("excludes profiles that redirect", async () => {
    const db = getDb();
    const { kyteId } = await publishedKyte();
    const before = JSON.parse((await get("1")).body) as DirectoryPage;

    await db.publishedKyte.update({
      where: { kyteId },
      data: { shouldRedirect: true, redirectUrl: "https://example.com" },
    });

    const after = JSON.parse((await get("1")).body) as DirectoryPage;
    expect(after.total).toBe(before.total - 1);
  });

  // The opt-out has to drop the kyte here as well as from the sitemap, or the
  // directory would link a URL the sitemap never lists.
  it("excludes profiles that opted out of Discover", async () => {
    const db = getDb();
    const { kyteId } = await publishedKyte();
    const before = JSON.parse((await get("1")).body) as DirectoryPage;

    await db.publishedKyte.update({ where: { kyteId }, data: { hideFromDiscover: true } });

    const after = JSON.parse((await get("1")).body) as DirectoryPage;
    expect(after.total).toBe(before.total - 1);
  });

  it("returns an empty page rather than an error past the last page", async () => {
    await publishedKyte();
    const page = JSON.parse((await get("999999")).body) as DirectoryPage;
    expect(page.entries).toEqual([]);
    expect(page.pageCount).toBeGreaterThanOrEqual(1);
  });

  it("rejects a page number that is not a positive integer with 400", async () => {
    for (const page of ["abc", "0", "-1", "1abc"]) {
      expect((await get(page)).statusCode).toBe(400);
    }
  });

  it("lists kytes with an avatar and two or more links ahead of bare ones", async () => {
    const db = getDb();
    const bare = await publishedKyte();
    const complete = await publishedKyte();
    const asset = await db.asset.create({
      data: {
        id: `dir-avatar-${randomUUID()}`,
        kyteId: complete.kyteId,
        key: `u/${complete.kyteId}/avatar.webp`,
        kind: "AVATAR",
        contentType: "image/webp",
        sizeBytes: 1,
        width: 1,
        height: 1,
      },
    });
    await db.kyte.update({
      where: { id: complete.kyteId },
      data: {
        avatarAssetId: asset.id,
        links: [
          { id: "a", title: "One", link: "https://example.com/1" },
          { id: "b", title: "Two", link: "https://example.com/2" },
        ],
      },
    });
    await store().publishKyte({ kyteId: complete.kyteId, actorUserId: "dir-tester" });

    const rows = await db.publishedKyte.findMany({
      where: { kyteId: { in: [bare.kyteId, complete.kyteId] } },
      select: { kyteId: true, directoryPriority: true },
    });
    const flag = (kyteId: string) => rows.find((row) => row.kyteId === kyteId)?.directoryPriority;
    expect(flag(complete.kyteId)).toBe(true);
    expect(flag(bare.kyteId)).toBe(false);

    const page = JSON.parse((await get("1")).body) as DirectoryPage;
    const flags = await db.publishedKyte.findMany({
      where: { username: { in: page.entries.map((entry) => entry.username) } },
      select: { username: true, directoryPriority: true },
    });
    const priorityOf = new Map(flags.map((row) => [row.username, row.directoryPriority]));
    const ordered = page.entries.map((entry) => priorityOf.get(entry.username) ?? false);
    const firstBare = ordered.indexOf(false);
    expect(firstBare === -1 || !ordered.slice(firstBare).includes(true)).toBe(true);
  });
});

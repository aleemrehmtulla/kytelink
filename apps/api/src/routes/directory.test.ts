import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@kytelink/db";
import { buildServer } from "../server";
import { loadConfig, setConfigForTest } from "../config";
import { getRedis } from "../redis";
import {
  INTERNAL_SIGNATURE_HEADER,
  INTERNAL_TIMESTAMP_HEADER,
  signInternalRequest,
} from "../internal/hmac";
import { PrismaStore } from "../store/prisma-store";
import type { DirectoryPage } from "@kytelink/schemas";

const SECRET = "directory-internal-secret";

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

async function get(page: string): Promise<{ statusCode: number; body: string }> {
  const app = await buildServer();
  try {
    const path = `/internal/directory/${page}`;
    const timestamp = String(Date.now());
    const response = await app.inject({
      method: "GET",
      url: path,
      headers: {
        [INTERNAL_TIMESTAMP_HEADER]: timestamp,
        [INTERNAL_SIGNATURE_HEADER]: signInternalRequest(SECRET, "GET", path, timestamp, ""),
      },
    });
    return { statusCode: response.statusCode, body: response.body };
  } finally {
    await app.close();
  }
}

beforeEach(() => {
  setConfigForTest(loadConfig({ ...process.env, INTERNAL_API_SECRET: SECRET }));
});

afterEach(async () => {
  const db = getDb();
  while (createdOrgIds.length > 0) {
    const id = createdOrgIds.pop();
    if (id) await db.organization.delete({ where: { id } }).catch(() => undefined);
  }
});

describe("GET /internal/directory/:page (public /discover listing)", () => {
  it("requires the internal HMAC signature", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/internal/directory/1" });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("returns a signed page of published profiles", async () => {
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

  it("returns an empty page rather than an error past the last page", async () => {
    await publishedKyte();
    const page = JSON.parse((await get("999999")).body) as DirectoryPage;
    expect(page.entries).toEqual([]);
    expect(page.pageCount).toBeGreaterThanOrEqual(1);
  });

  it("rejects a non-numeric page with 400", async () => {
    const response = await get("abc");
    expect(response.statusCode).toBe(400);
  });
});

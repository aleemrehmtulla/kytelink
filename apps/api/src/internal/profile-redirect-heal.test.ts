import { afterEach, describe, expect, it } from "vitest";
import { emptyProfileContent } from "@kytelink/schemas";
import { getDb } from "@kytelink/db";
import { resolveProfile } from "./data";
import { getRedis } from "../redis";
import { PrismaStore } from "../store/prisma-store";

const createdOrgIds: string[] = [];

async function publishedKyteRedirectingTo(redirectUrl: string): Promise<string> {
  const db = getDb();
  const org = await db.organization.create({ data: { name: `loop-${crypto.randomUUID()}` } });
  createdOrgIds.push(org.id);
  const store = new PrismaStore(db, getRedis());
  const { kyteId } = await store.createKyte({ orgId: org.id, actorUserId: "loop-tester" });
  const username = `loop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await store.changeUsername({ kyteId, actorUserId: "loop-tester", username });
  await store.updateDraft(kyteId, { ...emptyProfileContent(), shouldRedirect: true, redirectUrl });
  await store.publishKyte({ kyteId, actorUserId: "loop-tester" });
  await store.addDomain({ kyteId, host: "loop-demo.example", actorUserId: "loop-tester" });
  await getRedis().del(`profile:${username}`);
  return username;
}

afterEach(async () => {
  const db = getDb();
  while (createdOrgIds.length > 0) {
    const id = createdOrgIds.pop();
    if (id) await db.organization.delete({ where: { id } }).catch(() => undefined);
  }
});

describe("resolveProfile heals a redirect that loops through the kyte's own domain", () => {
  it("drops shouldRedirect when the target is one of the kyte's own domains", async () => {
    const username = await publishedKyteRedirectingTo("https://loop-demo.example/anything");
    const payload = await resolveProfile(username);
    expect(payload?.content.shouldRedirect).toBe(false);
    expect(payload?.content.redirectUrl).toBe("https://loop-demo.example/anything");
  });

  it("matches the www spelling of the same domain", async () => {
    const username = await publishedKyteRedirectingTo("https://www.loop-demo.example");
    expect((await resolveProfile(username))?.content.shouldRedirect).toBe(false);
  });

  it("leaves a genuine external redirect alone", async () => {
    const username = await publishedKyteRedirectingTo("https://example.com/elsewhere");
    expect((await resolveProfile(username))?.content.shouldRedirect).toBe(true);
  });
});

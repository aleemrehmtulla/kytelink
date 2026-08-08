import type { PrismaClient } from "@kytelink/db";

// Everything tools/seed's sample seed (src/fixtures.ts) and agent seed
// (src/agent-accounts.ts) can write. A production database must contain none of
// it: this is the list both `preflight` reports on and `purge-test-data` deletes.
export const SEED_EMAIL_DOMAINS = ["agency.demo", "people.demo", "kytelink.dev"] as const;
export const SEED_ORG_IDS = ["org_agency_demo", "org_agent_personal"] as const;
export const SEED_ORG_ID_PREFIXES = ["org_p_"] as const;
export const SEED_USER_ID_PREFIXES = ["usr_"] as const;

export type TestDataScan = {
  users: { id: string; email: string }[];
  organizations: { id: string; name: string }[];
  kytes: { id: string; username: string | null }[];
  total: number;
};

function emailFilters() {
  return SEED_EMAIL_DOMAINS.map((domain) => ({ email: { endsWith: `@${domain}` } }));
}

function orgFilters() {
  return [
    { id: { in: [...SEED_ORG_IDS] } },
    ...SEED_ORG_ID_PREFIXES.map((prefix) => ({ id: { startsWith: prefix } })),
  ];
}

export async function scanTestData(db: PrismaClient): Promise<TestDataScan> {
  const [users, organizations] = await Promise.all([
    db.user.findMany({
      where: { OR: [...emailFilters(), ...SEED_USER_ID_PREFIXES.map((p) => ({ id: { startsWith: p } }))] },
      select: { id: true, email: true },
      orderBy: { id: "asc" },
    }),
    db.organization.findMany({ where: { OR: orgFilters() }, select: { id: true, name: true }, orderBy: { id: "asc" } }),
  ]);

  const orgIds = organizations.map((org) => org.id);
  const userIds = users.map((user) => user.id);
  const kytes = await db.kyte.findMany({
    where: { OR: [{ orgId: { in: orgIds } }, { id: { in: userIds } }] },
    select: { id: true, username: true },
    orderBy: { id: "asc" },
  });

  return { users, organizations, kytes, total: users.length + organizations.length + kytes.length };
}

// PublishedKyte/Asset/Domain/ScheduledPublish/PreviewLink cascade from Kyte, and
// Kyte/OrgMember/AuditLog cascade from Organization, so deleting the two roots
// clears the tree. ModerationReview and AbuseReport hold a bare `kyteId` string
// with no foreign key, so they would survive as orphans and have to go
// explicitly — a leftover seed-sweep verdict would otherwise show up in the
// production admin app on day one.
export async function purgeTestData(db: PrismaClient, scan: TestDataScan): Promise<void> {
  const orgIds = scan.organizations.map((org) => org.id);
  const userIds = scan.users.map((user) => user.id);
  const kyteIds = scan.kytes.map((kyte) => kyte.id);

  if (kyteIds.length > 0) {
    await db.moderationReview.deleteMany({ where: { kyteId: { in: kyteIds } } });
    await db.abuseReport.deleteMany({ where: { kyteId: { in: kyteIds } } });
    await db.kyte.deleteMany({ where: { id: { in: kyteIds } } });
  }
  if (orgIds.length > 0) await db.organization.deleteMany({ where: { id: { in: orgIds } } });
  if (userIds.length > 0) await db.user.deleteMany({ where: { id: { in: userIds } } });
}

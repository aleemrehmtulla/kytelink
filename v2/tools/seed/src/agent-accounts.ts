import { type PrismaClient } from "@kytelink/db";
import { defaultOrgName, emptyProfileContent, profileContentSchema } from "@kytelink/schemas";
import { AGENCY_ORG_ID, makeContent } from "./fixtures";

const AGENT_USER_ID = "usr_agent";
const AGENT_ADMIN_USER_ID = "usr_agent_admin";
const AGENT_PERSONAL_ORG_ID = "org_agent_personal";
const AGENT_DRAFT_KYTE_ID = "kyte_agent_draft";
const AGENT_ORG_NAME = defaultOrgName("Agent", "agent@kytelink.dev");

function jsonFields() {
  const content = makeContent({
    displayName: "Agent",
    description: "Seeded agent account for scripted flows.",
    theme: "default",
    links: [{ title: "Kytelink", link: "https://kytelink.com", emoji: "👋" }],
  });
  return {
    content,
    contentHash: JSON.stringify(content),
  };
}

export async function seedAgentAccounts(db: PrismaClient): Promise<void> {
  await db.user.upsert({
    where: { id: AGENT_USER_ID },
    create: { id: AGENT_USER_ID, email: "agent@kytelink.dev", name: "Agent", emailVerified: true },
    update: { email: "agent@kytelink.dev", name: "Agent", emailVerified: true },
  });

  await db.user.upsert({
    where: { id: AGENT_ADMIN_USER_ID },
    create: {
      id: AGENT_ADMIN_USER_ID,
      email: "agent-admin@kytelink.dev",
      name: "Agent Admin",
      role: "ADMIN",
      emailVerified: true,
    },
    update: { email: "agent-admin@kytelink.dev", name: "Agent Admin", role: "ADMIN", emailVerified: true },
  });

  await db.organization.upsert({
    where: { id: AGENT_PERSONAL_ORG_ID },
    create: { id: AGENT_PERSONAL_ORG_ID, name: AGENT_ORG_NAME, personal: true },
    update: { name: AGENT_ORG_NAME, personal: true },
  });

  await db.orgMember.upsert({
    where: { orgId_userId: { orgId: AGENT_PERSONAL_ORG_ID, userId: AGENT_USER_ID } },
    create: { orgId: AGENT_PERSONAL_ORG_ID, userId: AGENT_USER_ID, role: "OWNER", kyteAccess: "ALL" },
    update: { role: "OWNER", kyteAccess: "ALL" },
  });

  await db.orgMember.upsert({
    where: { orgId_userId: { orgId: AGENCY_ORG_ID, userId: AGENT_USER_ID } },
    create: { orgId: AGENCY_ORG_ID, userId: AGENT_USER_ID, role: "MANAGER", kyteAccess: "ALL" },
    update: { role: "MANAGER", kyteAccess: "ALL" },
  });

  const { content, contentHash } = jsonFields();
  const draftContent = profileContentSchema.parse({ ...emptyProfileContent(), displayName: "Agent Draft" });

  await db.kyte.upsert({
    where: { id: AGENT_USER_ID },
    create: {
      id: AGENT_USER_ID,
      orgId: AGENT_PERSONAL_ORG_ID,
      username: "agent",
      displayName: content.displayName,
      description: content.description,
      theme: content.theme,
      links: JSON.parse(JSON.stringify(content.links)),
      icons: JSON.parse(JSON.stringify(content.icons)),
    },
    update: { username: "agent", displayName: content.displayName, theme: content.theme },
  });

  await db.publishedKyte.upsert({
    where: { kyteId: AGENT_USER_ID },
    create: {
      kyteId: AGENT_USER_ID,
      username: "agent",
      displayName: content.displayName,
      description: content.description,
      theme: content.theme,
      links: JSON.parse(JSON.stringify(content.links)),
      icons: JSON.parse(JSON.stringify(content.icons)),
      publishedById: AGENT_USER_ID,
      publishSeq: 1,
      contentHash,
    },
    update: { displayName: content.displayName },
  });

  await db.kyte.upsert({
    where: { id: AGENT_DRAFT_KYTE_ID },
    create: {
      id: AGENT_DRAFT_KYTE_ID,
      orgId: AGENT_PERSONAL_ORG_ID,
      username: "agent-draft",
      displayName: draftContent.displayName,
      theme: draftContent.theme,
    },
    update: { displayName: draftContent.displayName },
  });
}

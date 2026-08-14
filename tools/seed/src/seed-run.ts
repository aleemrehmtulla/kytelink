import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@kytelink/db";
import type { ProfileContent } from "@kytelink/schemas";
import {
  AGENCY_AVATAR_ASSET_ID,
  AGENCY_FLAGSHIP_KYTE,
  AGENCY_KYTE_GRANTS,
  AGENCY_KYTES,
  AGENCY_MEMBERS,
  AGENCY_ORG_ID,
  AGENCY_OWNER,
  AGENCY_USERS,
  PERSONAL_ORGS,
  type SeedKyte,
} from "./fixtures";

const SUSPENDED_DEMO_KYTE_ID = "usr_p_suspended-demo";
const ORG_SUSPENDED_DEMO_KYTE_ID = "usr_p_org-suspended-demo";

export type SeedSummary = {
  users: number;
  organizations: number;
  orgMembers: number;
  kyteMembers: number;
  kytes: number;
  publishedKytes: number;
  invites: number;
  schedules: number;
  previewLinks: number;
  auditLogs: number;
  assets: number;
  domains: number;
  moderationReviews: number;
  abuseReports: number;
  appeals: number;
  adminAlerts: number;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function kyteWriteFields(kyte: SeedKyte) {
  const c = kyte.content;
  return {
    username: kyte.username,
    displayName: c.displayName,
    description: c.description,
    theme: c.theme,
    customFont: c.customFont,
    customColor: c.customColor,
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
    redirectUrl: c.redirectUrl,
    shouldRedirect: c.shouldRedirect,
    hideWatermark: c.hideWatermark,
    hideFromDiscover: c.hideFromDiscover,
    links: json(c.links),
    icons: json(c.icons),
    avatarAssetId: kyte.avatarAssetId ?? null,
  };
}

async function upsertKyte(db: PrismaClient, kyte: SeedKyte): Promise<void> {
  const fields = kyteWriteFields(kyte);
  await db.kyte.upsert({
    where: { id: kyte.id },
    create: { id: kyte.id, orgId: kyte.orgId, ...fields },
    update: { orgId: kyte.orgId, ...fields },
  });

  if (!kyte.published) return;

  const contentHash = sha256(JSON.stringify(kyte.content));
  const publishedFields = {
    ...fields,
    moderationStatus: kyte.moderationStatus,
    publishSeq: kyte.publishSeq,
    publishedById: kyte.ownerUserId,
    contentHash,
  };
  await db.publishedKyte.upsert({
    where: { kyteId: kyte.id },
    create: { kyteId: kyte.id, ...publishedFields },
    update: publishedFields,
  });
}

async function seedAgency(db: PrismaClient): Promise<void> {
  await db.organization.upsert({
    where: { id: AGENCY_ORG_ID },
    create: { id: AGENCY_ORG_ID, name: "Aleem's Agency", personal: false },
    update: { name: "Aleem's Agency", personal: false },
  });

  for (const user of AGENCY_USERS) {
    await db.user.upsert({
      where: { id: user.id },
      create: { id: user.id, email: user.email, name: user.name, emailVerified: true },
      update: { email: user.email, name: user.name, emailVerified: true },
    });
  }

  for (const member of AGENCY_MEMBERS) {
    await db.orgMember.upsert({
      where: { orgId_userId: { orgId: AGENCY_ORG_ID, userId: member.userId } },
      create: {
        orgId: AGENCY_ORG_ID,
        userId: member.userId,
        role: member.role,
        kyteAccess: member.kyteAccess,
        invitedById: member.userId === AGENCY_OWNER.id ? null : AGENCY_OWNER.id,
      },
      update: { role: member.role, kyteAccess: member.kyteAccess },
    });
  }

  for (const kyte of AGENCY_KYTES) {
    await upsertKyte(db, kyte);
  }

  await db.asset.upsert({
    where: { id: AGENCY_AVATAR_ASSET_ID },
    create: {
      id: AGENCY_AVATAR_ASSET_ID,
      kyteId: AGENCY_FLAGSHIP_KYTE.id,
      uploadedById: AGENCY_OWNER.id,
      key: `u/${AGENCY_FLAGSHIP_KYTE.id}/avatar/seed-avatar.png`,
      kind: "AVATAR",
      contentType: "image/png",
      sizeBytes: 24_576,
      width: 400,
      height: 400,
    },
    update: {},
  });

  await db.domain.upsert({
    where: { domain: "aleem.agency.demo" },
    create: { domain: "aleem.agency.demo", kyteId: AGENCY_FLAGSHIP_KYTE.id, verified: true },
    update: { kyteId: AGENCY_FLAGSHIP_KYTE.id, verified: true },
  });

  for (const grant of AGENCY_KYTE_GRANTS) {
    await db.kyteMember.upsert({
      where: { kyteId_userId: { kyteId: grant.kyteId, userId: grant.userId } },
      create: { orgId: AGENCY_ORG_ID, kyteId: grant.kyteId, userId: grant.userId, role: grant.role },
      update: { role: grant.role },
    });
  }

  await seedAgencyInvites(db);
  await seedAgencySchedules(db, AGENCY_FLAGSHIP_KYTE.content);
  await seedAgencyPreviews(db);
  await seedAgencyAudit(db);
}

async function seedAgencyInvites(db: PrismaClient): Promise<void> {
  const invites = [
    {
      id: "inv_agency_all",
      email: "new-editor@example.com",
      role: "EDITOR" as const,
      kyteAccess: "ALL" as const,
      kyteGrants: null,
      token: "seed-invite-all-access",
    },
    {
      id: "inv_agency_selected",
      email: "client-viewer@example.com",
      role: "VIEWER" as const,
      kyteAccess: "SELECTED" as const,
      kyteGrants: json([{ kyteId: "kyte_ag_2", role: "VIEWER" }]),
      token: "seed-invite-selected",
    },
  ];

  for (const invite of invites) {
    const data = {
      orgId: AGENCY_ORG_ID,
      email: invite.email,
      role: invite.role,
      kyteAccess: invite.kyteAccess,
      kyteGrants: invite.kyteGrants ?? undefined,
      invitedById: AGENCY_OWNER.id,
      tokenHash: sha256(invite.token),
      status: "PENDING" as const,
      expiresAt: daysFromNow(14),
    };
    await db.orgInvite.upsert({ where: { id: invite.id }, create: { id: invite.id, ...data }, update: data });
  }
}

async function seedAgencySchedules(db: PrismaClient, snapshot: ProfileContent): Promise<void> {
  const schedules = [
    { id: "sch_agency_1", scheduledFor: daysFromNow(1), timezone: "America/Toronto" },
    { id: "sch_agency_2", scheduledFor: daysFromNow(5), timezone: "America/Toronto" },
    { id: "sch_agency_3", scheduledFor: daysFromNow(12), timezone: "America/Toronto" },
  ];

  for (const schedule of schedules) {
    const data = {
      kyteId: AGENCY_FLAGSHIP_KYTE.id,
      scheduledFor: schedule.scheduledFor,
      timezone: schedule.timezone,
      snapshot: json(snapshot),
      status: "PENDING" as const,
      createdById: AGENCY_OWNER.id,
    };
    await db.scheduledPublish.upsert({ where: { id: schedule.id }, create: { id: schedule.id, ...data }, update: data });
  }
}

// One preview link per kyte — the flagship demo kyte gets its own.
async function seedAgencyPreviews(db: PrismaClient): Promise<void> {
  const data = {
    kyteId: AGENCY_FLAGSHIP_KYTE.id,
    token: "seedprevw001",
    passcode: "482915",
    createdById: AGENCY_OWNER.id,
    expiresAt: daysFromNow(7),
  };
  await db.previewLink.upsert({
    where: { kyteId: AGENCY_FLAGSHIP_KYTE.id },
    create: { id: "prev_agency_1", ...data },
    update: data,
  });
}

async function seedAgencyAudit(db: PrismaClient): Promise<void> {
  const rows = [
    { id: "aud_1", action: "kyte.create", kyteId: AGENCY_FLAGSHIP_KYTE.id, summary: "Created kyte @aleem" },
    { id: "aud_2", action: "publish", kyteId: AGENCY_FLAGSHIP_KYTE.id, summary: "Published @aleem" },
    { id: "aud_3", action: "member.invite", kyteId: null, summary: "Invited new-editor@example.com as Editor" },
    { id: "aud_4", action: "schedule.create", kyteId: AGENCY_FLAGSHIP_KYTE.id, summary: "Scheduled a publish for tomorrow" },
    { id: "aud_5", action: "preview.create", kyteId: AGENCY_FLAGSHIP_KYTE.id, summary: "Created a draft preview link" },
    { id: "aud_6", action: "member.role-change", kyteId: null, summary: "Changed Intern to Editor" },
  ];

  for (const row of rows) {
    const data = {
      orgId: AGENCY_ORG_ID,
      kyteId: row.kyteId,
      actorId: AGENCY_OWNER.id,
      action: row.action,
      summary: row.summary,
    };
    await db.auditLog.upsert({ where: { id: row.id }, create: { id: row.id, ...data }, update: data });
  }
}

async function seedPersonalOrgs(db: PrismaClient): Promise<void> {
  for (const personal of PERSONAL_ORGS) {
    const userStatus = personal.orgSuspended
      ? {
          status: "SUSPENDED" as const,
          statusReason: "Repeated policy violations across their pages.",
          statusChangedAt: new Date("2026-07-20T09:00:00.000Z"),
          statusChangedBy: "agent-admin@kytelink.dev",
        }
      : {
          status: "ACTIVE" as const,
          statusReason: null,
          statusChangedAt: null,
          statusChangedBy: null,
        };
    await db.user.upsert({
      where: { id: personal.user.id },
      create: {
        id: personal.user.id,
        email: personal.user.email,
        name: personal.user.name,
        emailVerified: true,
        ...userStatus,
      },
      update: {
        email: personal.user.email,
        name: personal.user.name,
        emailVerified: true,
        ...userStatus,
      },
    });

    const suspension = personal.orgSuspended
      ? {
          suspendedAt: new Date("2026-07-20T09:00:00.000Z"),
          suspensionReason: "Owner suspended for repeated policy violations.",
          suspendedBy: "agent-admin@kytelink.dev",
          suspensionCause: `user_${personal.user.id}`,
        }
      : {
          suspendedAt: null,
          suspensionReason: null,
          suspendedBy: null,
          suspensionCause: null,
        };
    await db.organization.upsert({
      where: { id: personal.orgId },
      create: { id: personal.orgId, name: personal.orgName, personal: true, ...suspension },
      update: { name: personal.orgName, personal: true, ...suspension },
    });

    await db.orgMember.upsert({
      where: { orgId_userId: { orgId: personal.orgId, userId: personal.user.id } },
      create: { orgId: personal.orgId, userId: personal.user.id, role: "OWNER", kyteAccess: "ALL" },
      update: { role: "OWNER", kyteAccess: "ALL" },
    });

    await upsertKyte(db, personal.kyte);
  }
}

async function seedModerationReviews(db: PrismaClient): Promise<void> {
  const reviews = [
    {
      id: "modrev_suspended_demo",
      kyteId: SUSPENDED_DEMO_KYTE_ID,
      verdict: "SUSPEND" as const,
      categories: ["spam", "impersonation"],
      reason: "Automated sweep flagged spam links and a suspicious display name.",
      provider: "deterministic",
      confidence: null as number | null,
      reviewedBy: null as string | null,
      signals: json({
        sus_link: [{ url: "https://free-followers.example/promo", pattern: "known-spam-host" }],
        sus_name: { keyword: "free followers", value: "Suspended Kyte" },
      }),
    },
    {
      id: "modrev_org_suspended_demo",
      kyteId: ORG_SUSPENDED_DEMO_KYTE_ID,
      verdict: "SUSPEND" as const,
      categories: ["nsfw", "malware"],
      reason: "NSFW avatar and a malicious redirect target; the whole org was suspended.",
      provider: "openai",
      confidence: 0.94,
      reviewedBy: "agent-admin@kytelink.dev",
      signals: json({
        nsfw_image: { reason: "explicit imagery detected on avatar", confidence: 0.94 },
        sus_redirect: { url: "https://malware.example/landing" },
        sus_email: { domain: "throwaway-mail.example" },
      }),
    },
  ];

  for (const review of reviews) {
    const data = {
      kyteId: review.kyteId,
      contentHash: sha256(`${review.kyteId}:${review.reason}`),
      verdict: review.verdict,
      categories: review.categories,
      reason: review.reason,
      provider: review.provider,
      confidence: review.confidence,
      reviewedBy: review.reviewedBy,
      signals: review.signals,
    };
    await db.moderationReview.upsert({
      where: { id: review.id },
      create: { id: review.id, ...data },
      update: data,
    });
  }
}

async function seedAbuseReports(db: PrismaClient): Promise<void> {
  const reports = [
    {
      id: "abuse_gothere",
      username: "gothere",
      kyteId: "usr_p_gothere",
      reason: "impersonation",
      details: "This page is pretending to be a well-known brand and redirects elsewhere.",
    },
    {
      id: "abuse_suspended_demo",
      username: "suspended-demo",
      kyteId: SUSPENDED_DEMO_KYTE_ID,
      reason: "nsfw",
      details: "Links lead to explicit content.",
    },
    {
      id: "abuse_maxedout",
      username: "maxedout",
      kyteId: "usr_p_maxedout",
      reason: "other",
      details: "Spammy walls of links, looks like link farming.",
    },
  ];

  for (const report of reports) {
    const data = {
      username: report.username,
      kyteId: report.kyteId,
      reason: report.reason,
      details: report.details,
      ipHash: sha256(`report-ip:${report.id}`),
      status: "OPEN" as const,
    };
    await db.abuseReport.upsert({
      where: { id: report.id },
      create: { id: report.id, ...data },
      update: data,
    });
  }
}

async function seedAppeals(db: PrismaClient): Promise<void> {
  const appeals = [
    {
      id: "appeal_suspended_demo",
      kind: "kyte" as const,
      handle: "suspended-demo",
      email: "suspended-demo@people.demo",
      message: "The flagged links were removed weeks ago — please re-review the page.",
      status: "OPEN" as const,
    },
    {
      id: "appeal_org_suspended_demo",
      kind: "user" as const,
      handle: "org-suspended-demo@people.demo",
      email: "org-suspended-demo@people.demo",
      message: "My whole account went read-only. I never posted the content described.",
      status: "OPEN" as const,
    },
    {
      id: "appeal_dismissed",
      kind: "kyte" as const,
      handle: "gothere",
      email: "gothere@people.demo",
      message: "I think the redirect is fine, it goes to my own site.",
      status: "DISMISSED" as const,
    },
  ];

  for (const appeal of appeals) {
    const data = {
      kind: appeal.kind,
      handle: appeal.handle,
      email: appeal.email,
      message: appeal.message,
      status: appeal.status,
      ipHash: sha256(`appeal-ip:${appeal.id}`),
      reviewedAt: appeal.status === "OPEN" ? null : new Date("2026-07-22T10:00:00.000Z"),
      reviewedBy: appeal.status === "OPEN" ? null : "agent-admin@kytelink.dev",
    };
    await db.appeal.upsert({
      where: { id: appeal.id },
      create: { id: appeal.id, ...data },
      update: data,
    });
  }
}

async function seedAdminAlerts(db: PrismaClient): Promise<void> {
  const alerts = [
    {
      id: "alert_revalidate_dead_letter",
      kind: "revalidate-dead-letter",
      message: "3 revalidation jobs exhausted all retries and landed in the dead-letter queue.",
      meta: json({ queue: "revalidate", failedJobs: 3, lastError: "ECONNREFUSED web:3000" }),
    },
    {
      id: "alert_moderation_fail_open",
      kind: "moderation-fail-open",
      message: "Moderation provider timed out; a publish was allowed through fail-open.",
      meta: json({ kyteId: "usr_p_maxedout", provider: "openai", waitedMs: 8000 }),
    },
  ];

  for (const alert of alerts) {
    const data = { kind: alert.kind, message: alert.message, meta: alert.meta };
    await db.adminAlert.upsert({
      where: { id: alert.id },
      create: { id: alert.id, ...data },
      update: data,
    });
  }
}

export async function runSeed(db: PrismaClient): Promise<SeedSummary> {
  await seedAgency(db);
  await seedPersonalOrgs(db);
  await seedModerationReviews(db);
  await seedAbuseReports(db);
  await seedAppeals(db);
  await seedAdminAlerts(db);

  const [
    users,
    organizations,
    orgMembers,
    kyteMembers,
    kytes,
    publishedKytes,
    invites,
    schedules,
    previewLinks,
    auditLogs,
    assets,
    domains,
    moderationReviews,
    abuseReports,
    appeals,
    adminAlerts,
  ] = await Promise.all([
    db.user.count(),
    db.organization.count(),
    db.orgMember.count(),
    db.kyteMember.count(),
    db.kyte.count(),
    db.publishedKyte.count(),
    db.orgInvite.count(),
    db.scheduledPublish.count(),
    db.previewLink.count(),
    db.auditLog.count(),
    db.asset.count(),
    db.domain.count(),
    db.moderationReview.count(),
    db.abuseReport.count(),
    db.appeal.count(),
    db.adminAlert.count(),
  ]);

  return {
    users,
    organizations,
    orgMembers,
    kyteMembers,
    kytes,
    publishedKytes,
    invites,
    schedules,
    previewLinks,
    auditLogs,
    assets,
    domains,
    moderationReviews,
    abuseReports,
    appeals,
    adminAlerts,
  };
}

import type { PrismaClient } from "@kytelink/db";
import type { Redis } from "ioredis";
import {
  emptyProfileContent,
  type InviteStatus,
  type KyteAccess,
  type LimitKey,
  type ModerationStatus,
  type ProfileContent,
  profileContentSchema,
  type Role,
  type UserStatus,
} from "@kytelink/schemas";
import { getCdnUrl, getLqipUrl } from "@kytelink/cdn";
import { columnsToContent, contentToColumns } from "./content-mapping";
import type {
  AdminAuditInput,
  AuditFilter,
  AuditRow,
  CreateInviteInput,
  CreatePreviewInput,
  DomainRow,
  InviteRow,
  KyteMemberRow,
  KyteRow,
  MemberDetail,
  OrgMemberRow,
  OrgRow,
  PreviewRow,
  PublishResult,
  ScheduleRow,
  SetOrgSuspensionInput,
  SetUserStatusInput,
  Store,
  StoredAsset,
  UserRow,
} from "./store";

const ORG_LIMIT_COLUMN: Partial<Record<LimitKey, keyof PrismaOrgLimitColumns>> = {
  kytesPerOrg: "maxKytes",
  peoplePerOrg: "maxMembers",
  schedulesPerKyte: "maxSchedulesPerKyte",
  storageBytesPerOrg: "maxStorageBytes",
  uploadMaxBytes: "maxUploadBytes",
};

// The two byte-valued columns are BigInt in Postgres; everything else is Int.
const BIGINT_ORG_LIMIT_COLUMNS = new Set(["maxStorageBytes", "maxUploadBytes"]);

interface PrismaOrgLimitColumns {
  maxKytes: number | null;
  maxMembers: number | null;
  maxSchedulesPerKyte: number | null;
  maxStorageBytes: bigint | null;
  maxUploadBytes: bigint | null;
}

function auditSummary(action: string): string {
  return action.replace(/[._]/g, " ");
}

function toJson(value: unknown): object {
  return JSON.parse(JSON.stringify(value)) as object;
}

function domainRowOf(d: {
  domain: string;
  kyteId: string;
  verified: boolean;
  createdAt: Date;
  lastVerifiedAt: Date | null;
}): DomainRow {
  return {
    id: d.domain,
    kyteId: d.kyteId,
    host: d.domain,
    verified: d.verified,
    createdAt: d.createdAt,
    lastVerifiedAt: d.lastVerifiedAt,
  };
}

interface PrismaUserColumns {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  createdAt: Date;
  image: string | null;
  status: UserStatus;
  statusReason: string | null;
  statusChangedAt: Date | null;
  statusChangedBy: string | null;
}

function userRow(user: PrismaUserColumns): UserRow {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    image: user.image,
    status: user.status,
    statusReason: user.statusReason,
    statusChangedAt: user.statusChangedAt,
    statusChangedBy: user.statusChangedBy,
  };
}

export class PrismaStore implements Store {
  constructor(
    private readonly db: PrismaClient,
    private readonly redis: Redis,
  ) {}

  async userById(id: string): Promise<UserRow | null> {
    const user = await this.db.user.findUnique({ where: { id } });
    return user ? userRow(user) : null;
  }

  async userByEmail(email: string): Promise<UserRow | null> {
    const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    return user ? userRow(user) : null;
  }

  private async ownerOf(orgId: string): Promise<string> {
    const owner = await this.db.orgMember.findFirst({ where: { orgId, role: "OWNER" } });
    return owner?.userId ?? "";
  }

  async orgById(id: string): Promise<OrgRow | null> {
    const org = await this.db.organization.findUnique({ where: { id } });
    if (!org) return null;
    const limitOverrides: Partial<Record<LimitKey, number>> = {};
    if (org.maxKytes !== null) limitOverrides.kytesPerOrg = org.maxKytes;
    if (org.maxMembers !== null) limitOverrides.peoplePerOrg = org.maxMembers;
    if (org.maxSchedulesPerKyte !== null) limitOverrides.schedulesPerKyte = org.maxSchedulesPerKyte;
    if (org.maxStorageBytes !== null) limitOverrides.storageBytesPerOrg = Number(org.maxStorageBytes);
    if (org.maxUploadBytes !== null) limitOverrides.uploadMaxBytes = Number(org.maxUploadBytes);
    return {
      id: org.id,
      name: org.name,
      ownerUserId: await this.ownerOf(org.id),
      personal: org.personal,
      createdAt: org.createdAt,
      limitOverrides,
      suspendedAt: org.suspendedAt,
      suspensionReason: org.suspensionReason,
      suspendedBy: org.suspendedBy,
      suspensionCause: org.suspensionCause,
    };
  }

  async membershipsForUser(userId: string): Promise<OrgMemberRow[]> {
    const rows = await this.db.orgMember.findMany({ where: { userId } });
    return rows.map((m) => ({
      id: `${m.orgId}:${m.userId}`,
      orgId: m.orgId,
      userId: m.userId,
      role: m.role,
      kyteAccess: m.kyteAccess,
    }));
  }

  async orgMember(orgId: string, userId: string): Promise<OrgMemberRow | null> {
    const m = await this.db.orgMember.findUnique({ where: { orgId_userId: { orgId, userId } } });
    return m
      ? { id: `${m.orgId}:${m.userId}`, orgId: m.orgId, userId: m.userId, role: m.role, kyteAccess: m.kyteAccess }
      : null;
  }

  async listOrgMembers(orgId: string): Promise<MemberDetail[]> {
    const members = await this.db.orgMember.findMany({ where: { orgId }, include: { user: true } });
    const grants = await this.db.kyteMember.findMany({
      where: { member: { orgId } },
    });
    return members.map((m) => ({
      membershipId: `${m.orgId}:${m.userId}`,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      kyteAccess: m.kyteAccess,
      kyteGrants: grants
        .filter((g) => g.userId === m.userId)
        .map((g) => ({ kyteId: g.kyteId, role: g.role })),
    }));
  }

  async ownedOrgCount(userId: string): Promise<number> {
    return this.db.orgMember.count({ where: { userId, role: "OWNER" } });
  }

  async joinedOrgCount(userId: string): Promise<number> {
    return this.db.orgMember.count({ where: { userId, role: { not: "OWNER" } } });
  }

  async createOrg(input: {
    name: string;
    ownerUserId: string;
    personal?: boolean;
  }): Promise<{ orgId: string }> {
    const org = await this.db.organization.create({
      data: {
        name: input.name,
        personal: input.personal ?? false,
        members: { create: { userId: input.ownerUserId, role: "OWNER", kyteAccess: "ALL" } },
      },
    });
    return { orgId: org.id };
  }

  async renameOrg(orgId: string, name: string): Promise<void> {
    await this.db.organization.update({ where: { id: orgId }, data: { name } });
  }

  async deleteOrg(orgId: string): Promise<void> {
    await this.db.organization.delete({ where: { id: orgId } });
  }

  private async avatarsByAssetId(
    assetIds: (string | null)[],
  ): Promise<Map<string, ProfileContent["avatar"]>> {
    const ids = assetIds.filter((id): id is string => id !== null);
    if (ids.length === 0) return new Map();
    const assets = await this.db.asset.findMany({
      where: { id: { in: ids } },
      select: { id: true, key: true },
    });
    return new Map(
      assets.map((asset) => [asset.id, { url: getCdnUrl(asset.key), lqip: getLqipUrl(asset.key) }]),
    );
  }

  async kyteById(id: string): Promise<KyteRow | null> {
    const kyte = await this.db.kyte.findUnique({ where: { id }, include: { published: true } });
    if (!kyte) return null;
    const avatars = await this.avatarsByAssetId([kyte.avatarAssetId, kyte.published?.avatarAssetId ?? null]);
    return {
      id: kyte.id,
      orgId: kyte.orgId,
      username: kyte.username,
      draft: {
        ...columnsToContent(kyte),
        avatar: kyte.avatarAssetId ? avatars.get(kyte.avatarAssetId) ?? null : null,
      },
      published: kyte.published
        ? {
            ...columnsToContent(kyte.published),
            avatar: kyte.published.avatarAssetId
              ? avatars.get(kyte.published.avatarAssetId) ?? null
              : null,
          }
        : null,
      publishSeq: kyte.published?.publishSeq ?? 0,
      publishedAt: kyte.published?.publishedAt ?? null,
      moderationStatus: kyte.published?.moderationStatus ?? "APPROVED",
      updatedAt: kyte.updatedAt,
      createdAt: kyte.createdAt,
    };
  }

  async kyteMember(kyteId: string, userId: string): Promise<KyteMemberRow | null> {
    const m = await this.db.kyteMember.findUnique({ where: { kyteId_userId: { kyteId, userId } } });
    return m ? { kyteId: m.kyteId, userId: m.userId, role: m.role } : null;
  }

  async kyteMembersForUser(userId: string, kyteIds: string[]): Promise<KyteMemberRow[]> {
    if (kyteIds.length === 0) return [];
    const rows = await this.db.kyteMember.findMany({
      where: { userId, kyteId: { in: kyteIds } },
    });
    return rows.map((m) => ({ kyteId: m.kyteId, userId: m.userId, role: m.role }));
  }

  async listKytesByOrg(orgId: string): Promise<KyteRow[]> {
    const kytes = await this.db.kyte.findMany({ where: { orgId }, include: { published: true } });
    const avatars = await this.avatarsByAssetId(
      kytes.flatMap((kyte) => [kyte.avatarAssetId, kyte.published?.avatarAssetId ?? null]),
    );
    return kytes.map((kyte) => ({
      id: kyte.id,
      orgId: kyte.orgId,
      username: kyte.username,
      draft: {
        ...columnsToContent(kyte),
        avatar: kyte.avatarAssetId ? avatars.get(kyte.avatarAssetId) ?? null : null,
      },
      published: kyte.published
        ? {
            ...columnsToContent(kyte.published),
            avatar: kyte.published.avatarAssetId
              ? avatars.get(kyte.published.avatarAssetId) ?? null
              : null,
          }
        : null,
      publishSeq: kyte.published?.publishSeq ?? 0,
      publishedAt: kyte.published?.publishedAt ?? null,
      moderationStatus: kyte.published?.moderationStatus ?? "APPROVED",
      updatedAt: kyte.updatedAt,
      createdAt: kyte.createdAt,
    }));
  }

  async countKytesByOrg(orgId: string): Promise<number> {
    return this.db.kyte.count({ where: { orgId } });
  }

  async usernameOwner(username: string): Promise<string | null> {
    const kyte = await this.db.kyte.findUnique({ where: { username } });
    return kyte?.id ?? null;
  }

  async createKyte(input: { orgId: string; actorUserId: string }): Promise<{ kyteId: string }> {
    const id = `kyte_${crypto.randomUUID()}`;
    await this.db.$transaction(async (tx) => {
      await tx.kyte.create({
        data: { id, orgId: input.orgId, ...contentToColumns(emptyProfileContent()) },
      });
      await tx.auditLog.create({
        data: {
          orgId: input.orgId,
          kyteId: id,
          actorId: input.actorUserId,
          action: "kyte.create",
          summary: auditSummary("kyte.create"),
        },
      });
    });
    return { kyteId: id };
  }

  async updateDraft(kyteId: string, content: ProfileContent): Promise<{ updatedAt: Date }> {
    const updated = await this.db.kyte.update({
      where: { id: kyteId },
      data: contentToColumns(content),
    });
    return { updatedAt: updated.updatedAt };
  }

  async setKyteAvatar(kyteId: string, assetId: string | null): Promise<void> {
    await this.db.kyte.update({ where: { id: kyteId }, data: { avatarAssetId: assetId } });
  }

  async publishKyte(input: { kyteId: string; actorUserId: string }): Promise<PublishResult> {
    const result = await this.db.$transaction(async (tx) => {
      const kyte = await tx.kyte.findUnique({
        where: { id: input.kyteId },
        include: { published: true },
      });
      if (!kyte) throw new Error("kyte not found");
      const content = columnsToContent(kyte);
      const columns = {
        ...contentToColumns(content),
        avatarAssetId: kyte.avatarAssetId,
      };
      // publishSeq must be a DB-atomic increment: two concurrent publishes on an
      // already-published kyte must never read-then-write the same seq. Prisma
      // emits `SET "publishSeq" = "publishSeq" + 1`, which serializes under the
      // row lock (READ COMMITTED), so each publish observes a distinct value.
      const published = await tx.publishedKyte.upsert({
        where: { kyteId: input.kyteId },
        create: {
          kyteId: input.kyteId,
          username: kyte.username,
          ...columns,
          publishedById: input.actorUserId,
          publishSeq: 1,
          contentHash: JSON.stringify(columns),
        },
        update: {
          username: kyte.username,
          ...columns,
          publishedById: input.actorUserId,
          publishSeq: { increment: 1 },
          contentHash: JSON.stringify(columns),
        },
      });
      await tx.auditLog.create({
        data: {
          orgId: kyte.orgId,
          kyteId: kyte.id,
          actorId: input.actorUserId,
          action: "publish",
          summary: auditSummary("publish"),
          meta: { publishSeq: published.publishSeq },
        },
      });
      return {
        publishSeq: published.publishSeq,
        publishedAt: published.publishedAt,
        username: kyte.username,
      };
    });
    if (result.username) {
      await this.redis.del(`profile:${result.username}`);
    }
    return { publishSeq: result.publishSeq, publishedAt: result.publishedAt };
  }

  async changeUsername(input: {
    kyteId: string;
    actorUserId: string;
    username: string;
  }): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const kyte = await tx.kyte.findUnique({ where: { id: input.kyteId } });
      if (!kyte) throw new Error("kyte not found");
      await tx.kyte.update({ where: { id: input.kyteId }, data: { username: input.username } });
      await tx.publishedKyte.updateMany({
        where: { kyteId: input.kyteId },
        data: { username: input.username },
      });
      await tx.auditLog.create({
        data: {
          orgId: kyte.orgId,
          kyteId: kyte.id,
          actorId: input.actorUserId,
          action: "username.change",
          summary: auditSummary("username.change"),
          meta: { previous: kyte.username, next: input.username },
        },
      });
    });
  }

  async deleteKyte(input: { kyteId: string; actorUserId: string }): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const kyte = await tx.kyte.findUnique({ where: { id: input.kyteId } });
      if (!kyte) return;
      await tx.auditLog.create({
        data: {
          orgId: kyte.orgId,
          kyteId: kyte.id,
          actorId: input.actorUserId,
          action: "kyte.delete",
          summary: auditSummary("kyte.delete"),
        },
      });
      await tx.kyte.delete({ where: { id: input.kyteId } });
    });
  }

  async listSchedules(kyteId: string): Promise<ScheduleRow[]> {
    const rows = await this.db.scheduledPublish.findMany({ where: { kyteId } });
    return rows.map((s) => ({
      id: s.id,
      kyteId: s.kyteId,
      scheduledFor: s.scheduledFor,
      timezone: s.timezone,
      status: s.status,
      snapshot: profileContentSchema.parse(s.snapshot),
      createdAt: s.createdAt,
    }));
  }

  async countPendingSchedules(kyteId: string): Promise<number> {
    return this.db.scheduledPublish.count({ where: { kyteId, status: "PENDING" } });
  }

  async getSchedule(scheduleId: string): Promise<ScheduleRow | null> {
    const s = await this.db.scheduledPublish.findUnique({ where: { id: scheduleId } });
    return s
      ? {
          id: s.id,
          kyteId: s.kyteId,
          scheduledFor: s.scheduledFor,
          timezone: s.timezone,
          status: s.status,
          snapshot: profileContentSchema.parse(s.snapshot),
          createdAt: s.createdAt,
        }
      : null;
  }

  async createSchedule(input: {
    kyteId: string;
    scheduledFor: Date;
    timezone: string;
    snapshot: ProfileContent;
    actorUserId: string;
  }): Promise<{ scheduleId: string }> {
    const kyte = await this.db.kyte.findUnique({ where: { id: input.kyteId } });
    const schedule = await this.db.$transaction(async (tx) => {
      const created = await tx.scheduledPublish.create({
        data: {
          kyteId: input.kyteId,
          scheduledFor: input.scheduledFor,
          timezone: input.timezone,
          snapshot: toJson(input.snapshot),
          createdById: input.actorUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          orgId: kyte?.orgId ?? "",
          kyteId: input.kyteId,
          actorId: input.actorUserId,
          action: "schedule.create",
          summary: auditSummary("schedule.create"),
          meta: { scheduleId: created.id, scheduledFor: input.scheduledFor.toISOString() },
        },
      });
      return created;
    });
    return { scheduleId: schedule.id };
  }

  async refreshScheduleSnapshot(scheduleId: string, snapshot: ProfileContent): Promise<void> {
    await this.db.scheduledPublish.update({
      where: { id: scheduleId },
      data: { snapshot: toJson(snapshot) },
    });
  }

  async reschedule(scheduleId: string, scheduledFor: Date, timezone: string): Promise<void> {
    await this.db.scheduledPublish.update({
      where: { id: scheduleId },
      data: { scheduledFor, timezone },
    });
  }

  async cancelSchedule(input: { scheduleId: string; actorUserId: string }): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const schedule = await tx.scheduledPublish.findUnique({ where: { id: input.scheduleId } });
      if (!schedule || schedule.status !== "PENDING") return;
      await tx.scheduledPublish.update({ where: { id: schedule.id }, data: { status: "CANCELED" } });
      const kyte = await tx.kyte.findUnique({ where: { id: schedule.kyteId } });
      await tx.auditLog.create({
        data: {
          orgId: kyte?.orgId ?? "",
          kyteId: schedule.kyteId,
          actorId: input.actorUserId,
          action: "schedule.cancel",
          summary: auditSummary("schedule.cancel"),
          meta: { scheduleId: schedule.id },
        },
      });
    });
  }

  private previewRow(p: {
    id: string;
    kyteId: string;
    token: string;
    passcode: string;
    expiresAt: Date;
    createdAt: Date;
  }): PreviewRow {
    return {
      id: p.id,
      kyteId: p.kyteId,
      token: p.token,
      passcode: p.passcode,
      expiresAt: p.expiresAt,
      createdAt: p.createdAt,
    };
  }

  async cancelPendingSchedules(
    kyteId: string,
    options: { overdueOnly: boolean },
  ): Promise<number> {
    const result = await this.db.scheduledPublish.updateMany({
      where: {
        kyteId,
        status: "PENDING",
        ...(options.overdueOnly ? { scheduledFor: { lte: new Date() } } : {}),
      },
      data: { status: "CANCELED" },
    });
    return result.count;
  }

  async getPreviewForKyte(kyteId: string): Promise<PreviewRow | null> {
    const p = await this.db.previewLink.findUnique({ where: { kyteId } });
    return p ? this.previewRow(p) : null;
  }

  async createPreview(input: CreatePreviewInput & { actorUserId: string }): Promise<PreviewRow> {
    const kyte = await this.db.kyte.findUnique({ where: { id: input.kyteId } });
    const preview = await this.db.$transaction(async (tx) => {
      const created = await tx.previewLink.create({
        data: {
          kyteId: input.kyteId,
          token: input.token,
          passcode: input.passcode,
          createdById: input.createdById,
          expiresAt: input.expiresAt,
        },
      });
      await tx.auditLog.create({
        data: {
          orgId: kyte?.orgId ?? "",
          kyteId: input.kyteId,
          actorId: input.actorUserId,
          action: "preview.create",
          summary: auditSummary("preview.create"),
          meta: { previewId: created.id },
        },
      });
      return created;
    });
    return this.previewRow(preview);
  }

  async rotatePreviewPasscode(input: {
    kyteId: string;
    passcode: string;
    expiresAt: Date;
    actorUserId: string;
  }): Promise<PreviewRow> {
    const kyte = await this.db.kyte.findUnique({ where: { id: input.kyteId } });
    const preview = await this.db.$transaction(async (tx) => {
      const updated = await tx.previewLink.update({
        where: { kyteId: input.kyteId },
        data: { passcode: input.passcode, expiresAt: input.expiresAt },
      });
      await tx.auditLog.create({
        data: {
          orgId: kyte?.orgId ?? "",
          kyteId: input.kyteId,
          actorId: input.actorUserId,
          action: "preview.rotate",
          summary: auditSummary("preview.rotate"),
          meta: { previewId: updated.id },
        },
      });
      return updated;
    });
    return this.previewRow(preview);
  }

  private inviteRow(i: {
    id: string;
    orgId: string;
    email: string;
    role: Role;
    kyteAccess: KyteAccess;
    kyteGrants: unknown;
    status: InviteStatus;
    invitedById: string;
    expiresAt: Date;
    createdAt: Date;
  }): InviteRow {
    const grants = Array.isArray(i.kyteGrants)
      ? (i.kyteGrants as { kyteId: string; role: Role }[])
      : [];
    return {
      id: i.id,
      orgId: i.orgId,
      email: i.email,
      role: i.role,
      kyteAccess: i.kyteAccess,
      kyteGrants: grants,
      status: i.status,
      invitedByUserId: i.invitedById,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    };
  }

  async listInvitesForEmail(email: string): Promise<InviteRow[]> {
    const rows = await this.db.orgInvite.findMany({ where: { email: email.trim().toLowerCase() } });
    return rows.map((i) => this.inviteRow(i));
  }

  async getInviteById(inviteId: string): Promise<InviteRow | null> {
    const i = await this.db.orgInvite.findUnique({ where: { id: inviteId } });
    return i ? this.inviteRow(i) : null;
  }

  async getInviteByTokenHash(tokenHash: string): Promise<InviteRow | null> {
    const i = await this.db.orgInvite.findUnique({ where: { tokenHash } });
    return i ? this.inviteRow(i) : null;
  }

  async countActiveInvites(orgId: string): Promise<number> {
    return this.db.orgInvite.count({ where: { orgId, status: "PENDING" } });
  }

  async createInvite(input: CreateInviteInput): Promise<{ inviteId: string }> {
    const invite = await this.db.$transaction(async (tx) => {
      const created = await tx.orgInvite.create({
        data: {
          orgId: input.orgId,
          email: input.email,
          role: input.role,
          kyteAccess: input.kyteAccess,
          kyteGrants: toJson(input.kyteGrants),
          invitedById: input.invitedById,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
        },
      });
      await tx.auditLog.create({
        data: {
          orgId: input.orgId,
          actorId: input.invitedById,
          action: "member.invite",
          summary: auditSummary("member.invite"),
          meta: { inviteId: created.id, email: input.email, role: input.role },
        },
      });
      return created;
    });
    return { inviteId: invite.id };
  }

  async setInviteStatus(input: {
    inviteId: string;
    status: InviteStatus;
    actorUserId: string;
  }): Promise<void> {
    const invite = await this.db.orgInvite.findUnique({ where: { id: input.inviteId } });
    if (!invite) return;
    await this.db.$transaction(async (tx) => {
      await tx.orgInvite.update({
        where: { id: input.inviteId },
        data: { status: input.status, respondedAt: new Date() },
      });
      const action = input.status === "REVOKED" ? "member.revoke" : "member.decline";
      await tx.auditLog.create({
        data: {
          orgId: invite.orgId,
          actorId: input.actorUserId,
          action,
          summary: auditSummary(action),
          meta: { inviteId: invite.id, status: input.status },
        },
      });
    });
  }

  async acceptInvite(input: { inviteId: string; userId: string }): Promise<{ orgId: string }> {
    return this.db.$transaction(async (tx) => {
      const invite = await tx.orgInvite.findUnique({ where: { id: input.inviteId } });
      if (!invite) throw new Error("invite not found");
      const existing = await tx.orgMember.findUnique({
        where: { orgId_userId: { orgId: invite.orgId, userId: input.userId } },
      });
      if (!existing) {
        await tx.orgMember.create({
          data: {
            orgId: invite.orgId,
            userId: input.userId,
            role: invite.role,
            kyteAccess: invite.kyteAccess,
            invitedById: invite.invitedById,
          },
        });
        if (invite.kyteAccess === "SELECTED" && Array.isArray(invite.kyteGrants)) {
          for (const grant of invite.kyteGrants as { kyteId: string; role: Role }[]) {
            await tx.kyteMember.create({
              data: {
                orgId: invite.orgId,
                kyteId: grant.kyteId,
                userId: input.userId,
                role: grant.role,
              },
            });
          }
        }
      }
      await tx.orgInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          orgId: invite.orgId,
          actorId: input.userId,
          action: "member.accept",
          summary: auditSummary("member.accept"),
          meta: { inviteId: invite.id },
        },
      });
      return { orgId: invite.orgId };
    });
  }

  async updateMemberAccess(input: {
    orgId: string;
    membershipId: string;
    role: Role;
    kyteAccess: KyteAccess;
    kyteGrants: { kyteId: string; role: Role }[];
    actorUserId: string;
  }): Promise<void> {
    const [orgId, userId] = input.membershipId.split(":");
    if (!orgId || !userId || orgId !== input.orgId) throw new Error("member not found");
    await this.db.$transaction(async (tx) => {
      await tx.orgMember.update({
        where: { orgId_userId: { orgId: input.orgId, userId } },
        data: { role: input.role, kyteAccess: input.kyteAccess },
      });
      await tx.kyteMember.deleteMany({ where: { orgId: input.orgId, userId } });
      if (input.kyteAccess === "SELECTED") {
        for (const grant of input.kyteGrants) {
          await tx.kyteMember.create({
            data: { orgId: input.orgId, kyteId: grant.kyteId, userId, role: grant.role },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          orgId: input.orgId,
          actorId: input.actorUserId,
          action: "member.role-change",
          summary: auditSummary("member.role-change"),
          meta: { membershipId: input.membershipId, role: input.role, kyteAccess: input.kyteAccess },
        },
      });
    });
  }

  async removeMember(input: {
    orgId: string;
    membershipId: string;
    actorUserId: string;
  }): Promise<void> {
    const [orgId, userId] = input.membershipId.split(":");
    if (!orgId || !userId || orgId !== input.orgId) return;
    await this.db.$transaction(async (tx) => {
      await tx.orgMember.delete({ where: { orgId_userId: { orgId: input.orgId, userId } } });
      await tx.auditLog.create({
        data: {
          orgId: input.orgId,
          actorId: input.actorUserId,
          action: "member.remove",
          summary: auditSummary("member.remove"),
          meta: { membershipId: input.membershipId },
        },
      });
    });
  }

  async leaveOrg(input: { orgId: string; userId: string }): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.orgMember.delete({
        where: { orgId_userId: { orgId: input.orgId, userId: input.userId } },
      });
      await tx.auditLog.create({
        data: {
          orgId: input.orgId,
          actorId: input.userId,
          action: "member.remove",
          summary: auditSummary("member.remove"),
          meta: { self: true },
        },
      });
    });
  }

  async listDomains(kyteId: string): Promise<DomainRow[]> {
    const rows = await this.db.domain.findMany({ where: { kyteId } });
    return rows.map((d) => ({
      id: d.domain,
      kyteId: d.kyteId,
      host: d.domain,
      verified: d.verified,
      createdAt: d.createdAt,
      lastVerifiedAt: d.lastVerifiedAt,
    }));
  }

  async getDomain(domainId: string): Promise<DomainRow | null> {
    const d = await this.db.domain.findUnique({ where: { domain: domainId } });
    return d ? domainRowOf(d) : null;
  }

  async listAllDomains(): Promise<DomainRow[]> {
    const rows = await this.db.domain.findMany();
    return rows.map(domainRowOf);
  }

  async setDomainVerification(input: {
    host: string;
    verified: boolean;
    lastVerifiedAt?: Date;
  }): Promise<void> {
    await this.db.domain.update({
      where: { domain: input.host },
      data: {
        verified: input.verified,
        ...(input.lastVerifiedAt ? { lastVerifiedAt: input.lastVerifiedAt } : {}),
      },
    });
    await this.redis.del(`domain:${input.host}`);
  }

  async addDomain(input: {
    kyteId: string;
    host: string;
    actorUserId: string;
  }): Promise<DomainRow> {
    const host = input.host.trim().toLowerCase();
    const kyte = await this.db.kyte.findUnique({ where: { id: input.kyteId } });
    const row = await this.db.$transaction(async (tx) => {
      const created = await tx.domain.create({ data: { domain: host, kyteId: input.kyteId } });
      await tx.auditLog.create({
        data: {
          orgId: kyte?.orgId ?? "",
          kyteId: input.kyteId,
          actorId: input.actorUserId,
          action: "domain.add",
          summary: auditSummary("domain.add"),
          meta: { host },
        },
      });
      return created;
    });
    await this.redis.del(`domain:${host}`);
    return domainRowOf(row);
  }

  async removeDomain(input: { domainId: string; actorUserId: string }): Promise<void> {
    const domain = await this.db.domain.findUnique({ where: { domain: input.domainId } });
    if (!domain) return;
    const kyte = await this.db.kyte.findUnique({ where: { id: domain.kyteId } });
    await this.db.$transaction(async (tx) => {
      await tx.domain.delete({ where: { domain: domain.domain } });
      await tx.auditLog.create({
        data: {
          orgId: kyte?.orgId ?? "",
          kyteId: domain.kyteId,
          actorId: input.actorUserId,
          action: "domain.remove",
          summary: auditSummary("domain.remove"),
          meta: { host: domain.domain },
        },
      });
    });
    await this.redis.del(`domain:${domain.domain}`);
  }

  async insertAsset(asset: StoredAsset): Promise<void> {
    await this.db.asset.create({
      data: {
        id: asset.id,
        kyteId: asset.kyteId,
        uploadedById: asset.uploadedById,
        key: asset.key,
        kind: asset.kind,
        contentType: asset.contentType,
        sizeBytes: asset.sizeBytes,
        width: asset.width,
        height: asset.height,
        createdAt: asset.createdAt,
      },
    });
  }

  async getAsset(assetId: string): Promise<StoredAsset | null> {
    const asset = await this.db.asset.findUnique({ where: { id: assetId } });
    return asset ? { ...asset } : null;
  }

  async removeAsset(assetId: string): Promise<StoredAsset | null> {
    const asset = await this.db.asset.findUnique({ where: { id: assetId } });
    if (!asset) return null;
    await this.db.asset.delete({ where: { id: assetId } });
    return { ...asset };
  }

  async listAssetsForKyte(kyteId: string): Promise<StoredAsset[]> {
    return this.db.asset.findMany({ where: { kyteId } });
  }

  async findOgAsset(kyteId: string): Promise<StoredAsset | null> {
    return this.db.asset.findFirst({ where: { kyteId, kind: "OG_IMAGE" } });
  }

  async sumAssetSizeForOrg(orgId: string): Promise<number> {
    const result = await this.db.asset.aggregate({
      where: { kyte: { orgId } },
      _sum: { sizeBytes: true },
    });
    return result._sum.sizeBytes ?? 0;
  }

  async changeEmail(userId: string, newEmail: string): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { email: newEmail.trim().toLowerCase() },
    });
  }

  async setUserImage(userId: string, image: string | null): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { image } });
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    await this.db.session.deleteMany({ where: { userId } });
  }

  async setUserStatus(input: SetUserStatusInput): Promise<void> {
    const restoring = input.status === "ACTIVE";
    await this.db.user.update({
      where: { id: input.userId },
      data: {
        status: input.status,
        statusReason: restoring ? null : input.reason,
        statusChangedAt: restoring ? null : new Date(),
        statusChangedBy: restoring ? null : input.actorEmail,
      },
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.db.user.delete({ where: { id: userId } });
  }

  async banEmail(input: { email: string; reason: string; actorEmail: string }): Promise<void> {
    const email = input.email.trim().toLowerCase();
    await this.db.bannedEmail.upsert({
      where: { email },
      create: { email, reason: input.reason, bannedBy: input.actorEmail },
      update: { reason: input.reason, bannedBy: input.actorEmail },
    });
  }

  async orgIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.db.orgMember.findMany({ where: { userId }, select: { orgId: true } });
    return rows.map((row) => row.orgId);
  }

  async setOrgSuspension(input: SetOrgSuspensionInput): Promise<void> {
    await this.db.organization.update({
      where: { id: input.orgId },
      data: input.suspended
        ? {
            suspendedAt: new Date(),
            suspensionReason: input.reason,
            suspendedBy: input.actorEmail,
            suspensionCause: input.cause,
          }
        : {
            suspendedAt: null,
            suspensionReason: null,
            suspendedBy: null,
            suspensionCause: null,
          },
    });
  }

  async listOrgKyteHandles(orgId: string): Promise<{ kyteId: string; username: string }[]> {
    const rows = await this.db.kyte.findMany({
      where: { orgId, username: { not: null } },
      select: { id: true, username: true },
    });
    return rows.flatMap((row) =>
      row.username === null ? [] : [{ kyteId: row.id, username: row.username }],
    );
  }

  async auditLog(filter: AuditFilter): Promise<AuditRow[]> {
    const rows = await this.db.auditLog.findMany({
      where: {
        orgId: filter.orgId,
        action: filter.action,
        actorId: filter.actorUserId,
        createdAt: filter.before ? { lt: filter.before } : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: filter.limit,
    });
    const emails = new Map<string, string>();
    for (const row of rows) {
      if (!emails.has(row.actorId)) {
        const user = await this.db.user.findUnique({ where: { id: row.actorId } });
        emails.set(row.actorId, user?.email ?? "");
      }
    }
    return rows.map((a) => ({
      id: a.id,
      action: a.action,
      actorUserId: a.actorId,
      actorEmail: emails.get(a.actorId) ?? null,
      orgId: a.orgId,
      kyteId: a.kyteId,
      meta: (a.meta && typeof a.meta === "object" ? a.meta : {}) as Record<string, unknown>,
      createdAt: a.createdAt,
    }));
  }

  async writeAdminAudit(input: AdminAuditInput): Promise<void> {
    await this.db.auditLog.create({
      data: {
        orgId: input.orgId ?? null,
        kyteId: input.kyteId ?? null,
        actorId: input.actorUserId,
        action: input.action,
        summary: input.summary,
        ...(input.meta ? { meta: toJson(input.meta) } : {}),
      },
    });
  }

  async setOrgLimits(
    orgId: string,
    overrides: { key: LimitKey; value: number | null }[],
  ): Promise<void> {
    const data: Partial<PrismaOrgLimitColumns> = {};
    for (const override of overrides) {
      const column = ORG_LIMIT_COLUMN[override.key];
      if (!column) continue;
      if (BIGINT_ORG_LIMIT_COLUMNS.has(column)) {
        const asBigInt = override.value === null ? null : BigInt(override.value);
        if (column === "maxStorageBytes") data.maxStorageBytes = asBigInt;
        else data.maxUploadBytes = asBigInt;
      } else if (column !== "maxStorageBytes" && column !== "maxUploadBytes") {
        data[column] = override.value;
      }
    }
    await this.db.organization.update({ where: { id: orgId }, data });
  }

  async moderationQueue(input: {
    status?: ModerationStatus;
    limit: number;
  }): Promise<
    { kyteId: string; username: string | null; status: ModerationStatus; flaggedAt: Date }[]
  > {
    const rows = await this.db.publishedKyte.findMany({
      where: { moderationStatus: input.status ?? { not: "APPROVED" } },
      take: input.limit,
      orderBy: { publishedAt: "desc" },
    });
    return rows.map((p) => ({
      kyteId: p.kyteId,
      username: p.username,
      status: p.moderationStatus,
      flaggedAt: p.publishedAt,
    }));
  }

  async setKyteModeration(kyteId: string, status: ModerationStatus): Promise<void> {
    await this.db.publishedKyte.updateMany({ where: { kyteId }, data: { moderationStatus: status } });
  }

  async latestModerationReason(kyteId: string): Promise<string | null> {
    const review = await this.db.moderationReview.findFirst({
      where: { kyteId, verdict: "SUSPEND" },
      orderBy: { createdAt: "desc" },
      select: { reason: true },
    });
    return review?.reason ?? null;
  }
}

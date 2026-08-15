import { emptyProfileContent, type LimitKey, type ProfileContent } from "@kytelink/schemas";
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
import type { InviteStatus, KyteAccess, ModerationStatus, Role } from "@kytelink/schemas";

type MemUser = UserRow;
type MemOrg = OrgRow;
type MemOrgMember = OrgMemberRow;
type MemKyteMember = KyteMemberRow;
type MemKyte = KyteRow;
type MemSchedule = ScheduleRow & { snapshot: ProfileContent };
type MemPreview = PreviewRow;
type MemInvite = InviteRow & { tokenHash: string };
type MemDomain = DomainRow;

const UNSUSPENDED = {
  suspendedAt: null,
  suspensionReason: null,
  suspendedBy: null,
  suspensionCause: null,
} as const;

function content(overrides: Partial<ProfileContent>): ProfileContent {
  return { ...emptyProfileContent(), ...overrides };
}

export class MemoryStore implements Store {
  moderationReasons = new Map<string, string>();
  users: MemUser[] = [];
  orgs: MemOrg[] = [];
  orgMembers: MemOrgMember[] = [];
  kyteMembers: MemKyteMember[] = [];
  kytes: MemKyte[] = [];
  schedules: MemSchedule[] = [];
  previews: MemPreview[] = [];
  invites: MemInvite[] = [];
  domains: MemDomain[] = [];
  audit: AuditRow[] = [];
  invalidatedSessionUserIds: string[] = [];

  private seq = 0;

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}_${this.seq.toString(36)}${Date.now().toString(36)}`;
  }

  private emailOf(userId: string): string | null {
    return this.users.find((u) => u.id === userId)?.email ?? null;
  }

  private ownerOf(orgId: string): string {
    return this.orgMembers.find((m) => m.orgId === orgId && m.role === "OWNER")?.userId ?? "";
  }

  private pushAudit(input: {
    action: string;
    actorUserId: string;
    orgId: string | null;
    kyteId?: string | null;
    meta?: Record<string, unknown>;
  }): void {
    this.audit.push({
      id: this.id("audit"),
      action: input.action,
      actorUserId: input.actorUserId,
      actorEmail: this.emailOf(input.actorUserId),
      orgId: input.orgId,
      kyteId: input.kyteId ?? null,
      meta: input.meta ?? {},
      createdAt: new Date(),
    });
  }

  async userById(id: string): Promise<UserRow | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async userByEmail(email: string): Promise<UserRow | null> {
    const normalized = email.trim().toLowerCase();
    return this.users.find((u) => u.email === normalized) ?? null;
  }

  async orgById(id: string): Promise<OrgRow | null> {
    return this.orgs.find((o) => o.id === id) ?? null;
  }

  async membershipsForUser(userId: string): Promise<OrgMemberRow[]> {
    return this.orgMembers.filter((m) => m.userId === userId);
  }

  async orgMember(orgId: string, userId: string): Promise<OrgMemberRow | null> {
    return this.orgMembers.find((m) => m.orgId === orgId && m.userId === userId) ?? null;
  }

  async listOrgMembers(orgId: string): Promise<MemberDetail[]> {
    return this.orgMembers
      .filter((m) => m.orgId === orgId)
      .map((m) => ({
        membershipId: m.id,
        userId: m.userId,
        email: this.emailOf(m.userId) ?? "",
        role: m.role,
        kyteAccess: m.kyteAccess,
        kyteGrants: this.grantsFor(orgId, m.userId),
      }));
  }

  private grantsFor(orgId: string, userId: string): { kyteId: string; role: Role }[] {
    const orgKyteIds = new Set(this.kytes.filter((k) => k.orgId === orgId).map((k) => k.id));
    return this.kyteMembers
      .filter((m) => m.userId === userId && orgKyteIds.has(m.kyteId))
      .map((m) => ({ kyteId: m.kyteId, role: m.role }));
  }

  async ownedOrgCount(userId: string): Promise<number> {
    return this.orgMembers.filter((m) => m.userId === userId && m.role === "OWNER").length;
  }

  async joinedOrgCount(userId: string): Promise<number> {
    return this.orgMembers.filter((m) => m.userId === userId && m.role !== "OWNER").length;
  }

  async createOrg(input: {
    name: string;
    ownerUserId: string;
    personal?: boolean;
  }): Promise<{ orgId: string }> {
    const orgId = this.id("org");
    this.orgs.push({
      id: orgId,
      name: input.name,
      ownerUserId: input.ownerUserId,
      personal: input.personal ?? false,
      createdAt: new Date(),
      limitOverrides: {},
      ...UNSUSPENDED,
    });
    this.orgMembers.push({
      id: this.id("om"),
      orgId,
      userId: input.ownerUserId,
      role: "OWNER",
      kyteAccess: "ALL",
    });
    return { orgId };
  }

  async renameOrg(orgId: string, name: string): Promise<void> {
    const org = this.orgs.find((o) => o.id === orgId);
    if (org) org.name = name;
  }

  async deleteOrg(orgId: string): Promise<void> {
    this.orgs = this.orgs.filter((o) => o.id !== orgId);
    this.orgMembers = this.orgMembers.filter((m) => m.orgId !== orgId);
    this.kytes = this.kytes.filter((k) => k.orgId !== orgId);
  }

  async kyteById(id: string): Promise<KyteRow | null> {
    return this.kytes.find((k) => k.id === id) ?? null;
  }

  async kyteMember(kyteId: string, userId: string): Promise<KyteMemberRow | null> {
    return this.kyteMembers.find((m) => m.kyteId === kyteId && m.userId === userId) ?? null;
  }

  async kyteMembersForUser(userId: string, kyteIds: string[]): Promise<KyteMemberRow[]> {
    const wanted = new Set(kyteIds);
    return this.kyteMembers.filter((m) => m.userId === userId && wanted.has(m.kyteId));
  }

  async listKytesByOrg(orgId: string): Promise<KyteRow[]> {
    return this.kytes.filter((k) => k.orgId === orgId);
  }

  async countKytesByOrg(orgId: string): Promise<number> {
    return this.kytes.filter((k) => k.orgId === orgId).length;
  }

  async usernameOwner(username: string): Promise<string | null> {
    return this.kytes.find((k) => k.username === username)?.id ?? null;
  }

  async createKyte(input: { orgId: string; actorUserId: string }): Promise<{ kyteId: string }> {
    const kyteId = this.id("kyte");
    const now = new Date();
    this.kytes.push({
      id: kyteId,
      orgId: input.orgId,
      username: null,
      draft: emptyProfileContent(),
      published: null,
      publishSeq: 0,
      publishedAt: null,
      moderationStatus: "APPROVED",
      updatedAt: now,
      createdAt: now,
    });
    this.pushAudit({ action: "kyte.create", actorUserId: input.actorUserId, orgId: input.orgId, kyteId });
    return { kyteId };
  }

  async updateDraft(kyteId: string, contentValue: ProfileContent): Promise<{ updatedAt: Date }> {
    const kyte = this.kytes.find((k) => k.id === kyteId);
    if (!kyte) throw new Error("kyte not found");
    kyte.draft = contentValue;
    kyte.updatedAt = new Date();
    return { updatedAt: kyte.updatedAt };
  }

  // The memory store keeps the avatar inside the draft content itself, so the
  // asset-id column has no separate meaning here.
  async setKyteAvatar(): Promise<void> {}

  async publishKyte(input: { kyteId: string; actorUserId: string }): Promise<PublishResult> {
    const kyte = this.kytes.find((k) => k.id === input.kyteId);
    if (!kyte) throw new Error("kyte not found");
    const now = new Date();
    kyte.published = structuredClone(kyte.draft);
    kyte.publishSeq += 1;
    kyte.publishedAt = now;
    this.pushAudit({
      action: "publish",
      actorUserId: input.actorUserId,
      orgId: kyte.orgId,
      kyteId: kyte.id,
      meta: { publishSeq: kyte.publishSeq },
    });
    return { publishSeq: kyte.publishSeq, publishedAt: now };
  }

  async changeUsername(input: {
    kyteId: string;
    actorUserId: string;
    username: string;
  }): Promise<void> {
    const kyte = this.kytes.find((k) => k.id === input.kyteId);
    if (!kyte) throw new Error("kyte not found");
    const previous = kyte.username;
    kyte.username = input.username;
    this.pushAudit({
      action: "username.change",
      actorUserId: input.actorUserId,
      orgId: kyte.orgId,
      kyteId: kyte.id,
      meta: { previous, next: input.username },
    });
  }

  async deleteKyte(input: { kyteId: string; actorUserId: string }): Promise<void> {
    const kyte = this.kytes.find((k) => k.id === input.kyteId);
    if (!kyte) return;
    this.kytes = this.kytes.filter((k) => k.id !== input.kyteId);
    this.pushAudit({
      action: "kyte.delete",
      actorUserId: input.actorUserId,
      orgId: kyte.orgId,
      kyteId: kyte.id,
    });
  }

  async listSchedules(kyteId: string): Promise<ScheduleRow[]> {
    return this.schedules.filter((s) => s.kyteId === kyteId);
  }

  async countPendingSchedules(kyteId: string): Promise<number> {
    return this.schedules.filter((s) => s.kyteId === kyteId && s.status === "PENDING").length;
  }

  async getSchedule(scheduleId: string): Promise<ScheduleRow | null> {
    return this.schedules.find((s) => s.id === scheduleId) ?? null;
  }

  async createSchedule(input: {
    kyteId: string;
    scheduledFor: Date;
    timezone: string;
    snapshot: ProfileContent;
    actorUserId: string;
  }): Promise<{ scheduleId: string }> {
    const kyte = this.kytes.find((k) => k.id === input.kyteId);
    const scheduleId = this.id("sch");
    this.schedules.push({
      id: scheduleId,
      kyteId: input.kyteId,
      scheduledFor: input.scheduledFor,
      timezone: input.timezone,
      status: "PENDING",
      snapshot: input.snapshot,
      createdAt: new Date(),
    });
    this.pushAudit({
      action: "schedule.create",
      actorUserId: input.actorUserId,
      orgId: kyte?.orgId ?? "",
      kyteId: input.kyteId,
      meta: { scheduleId, scheduledFor: input.scheduledFor.toISOString() },
    });
    return { scheduleId };
  }

  async refreshScheduleSnapshot(scheduleId: string, snapshot: ProfileContent): Promise<void> {
    const schedule = this.schedules.find((s) => s.id === scheduleId);
    if (schedule) schedule.snapshot = snapshot;
  }

  async reschedule(scheduleId: string, scheduledFor: Date, timezone: string): Promise<void> {
    const schedule = this.schedules.find((s) => s.id === scheduleId);
    if (schedule) {
      schedule.scheduledFor = scheduledFor;
      schedule.timezone = timezone;
    }
  }

  async cancelSchedule(input: { scheduleId: string; actorUserId: string }): Promise<void> {
    const schedule = this.schedules.find((s) => s.id === input.scheduleId);
    if (schedule && schedule.status === "PENDING") {
      schedule.status = "CANCELED";
      const kyte = this.kytes.find((k) => k.id === schedule.kyteId);
      this.pushAudit({
        action: "schedule.cancel",
        actorUserId: input.actorUserId,
        orgId: kyte?.orgId ?? "",
        kyteId: schedule.kyteId,
        meta: { scheduleId: schedule.id },
      });
    }
  }

  async cancelPendingSchedules(
    kyteId: string,
    options: { overdueOnly: boolean },
  ): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const schedule of this.schedules) {
      if (schedule.kyteId !== kyteId || schedule.status !== "PENDING") continue;
      if (options.overdueOnly && schedule.scheduledFor.getTime() > now) continue;
      schedule.status = "CANCELED";
      count += 1;
    }
    return count;
  }

  async getPreviewForKyte(kyteId: string): Promise<PreviewRow | null> {
    return this.previews.find((p) => p.kyteId === kyteId) ?? null;
  }

  async createPreview(input: CreatePreviewInput & { actorUserId: string }): Promise<PreviewRow> {
    const row: PreviewRow = {
      id: this.id("prv"),
      kyteId: input.kyteId,
      token: input.token,
      passcode: input.passcode,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    };
    this.previews.push(row);
    const kyte = this.kytes.find((k) => k.id === input.kyteId);
    this.pushAudit({
      action: "preview.create",
      actorUserId: input.actorUserId,
      orgId: kyte?.orgId ?? "",
      kyteId: input.kyteId,
      meta: { previewId: row.id },
    });
    return row;
  }

  async rotatePreviewPasscode(input: {
    kyteId: string;
    passcode: string;
    expiresAt: Date;
    actorUserId: string;
  }): Promise<PreviewRow> {
    const preview = this.previews.find((p) => p.kyteId === input.kyteId);
    if (!preview) throw new Error("Preview link not found");
    preview.passcode = input.passcode;
    preview.expiresAt = input.expiresAt;
    const kyte = this.kytes.find((k) => k.id === input.kyteId);
    this.pushAudit({
      action: "preview.rotate",
      actorUserId: input.actorUserId,
      orgId: kyte?.orgId ?? "",
      kyteId: input.kyteId,
      meta: { previewId: preview.id },
    });
    return preview;
  }

  async listInvitesForEmail(email: string): Promise<InviteRow[]> {
    const normalized = email.trim().toLowerCase();
    return this.invites.filter((i) => i.email === normalized);
  }

  async getInviteById(inviteId: string): Promise<InviteRow | null> {
    return this.invites.find((i) => i.id === inviteId) ?? null;
  }

  async getInviteByTokenHash(tokenHash: string): Promise<InviteRow | null> {
    return this.invites.find((i) => i.tokenHash === tokenHash) ?? null;
  }

  async countActiveInvites(orgId: string): Promise<number> {
    return this.invites.filter((i) => i.orgId === orgId && i.status === "PENDING").length;
  }

  async createInvite(input: CreateInviteInput): Promise<{ inviteId: string }> {
    const inviteId = this.id("inv");
    this.invites.push({
      id: inviteId,
      orgId: input.orgId,
      email: input.email,
      role: input.role,
      kyteAccess: input.kyteAccess,
      kyteGrants: input.kyteGrants,
      status: "PENDING",
      invitedByUserId: input.invitedById,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    });
    this.pushAudit({
      action: "member.invite",
      actorUserId: input.invitedById,
      orgId: input.orgId,
      meta: { inviteId, email: input.email, role: input.role },
    });
    return { inviteId };
  }

  async setInviteStatus(input: {
    inviteId: string;
    status: InviteStatus;
    actorUserId: string;
  }): Promise<void> {
    const invite = this.invites.find((i) => i.id === input.inviteId);
    if (!invite) return;
    invite.status = input.status;
    const action = input.status === "REVOKED" ? "member.revoke" : "member.decline";
    this.pushAudit({
      action,
      actorUserId: input.actorUserId,
      orgId: invite.orgId,
      meta: { inviteId: invite.id, status: input.status },
    });
  }

  async acceptInvite(input: { inviteId: string; userId: string }): Promise<{ orgId: string }> {
    const invite = this.invites.find((i) => i.id === input.inviteId);
    if (!invite) throw new Error("invite not found");
    if (!this.orgMembers.some((m) => m.orgId === invite.orgId && m.userId === input.userId)) {
      this.orgMembers.push({
        id: this.id("om"),
        orgId: invite.orgId,
        userId: input.userId,
        role: invite.role,
        kyteAccess: invite.kyteAccess,
      });
      if (invite.kyteAccess === "SELECTED") {
        for (const grant of invite.kyteGrants) {
          this.kyteMembers.push({ kyteId: grant.kyteId, userId: input.userId, role: grant.role });
        }
      }
    }
    invite.status = "ACCEPTED";
    this.pushAudit({
      action: "member.accept",
      actorUserId: input.userId,
      orgId: invite.orgId,
      meta: { inviteId: invite.id },
    });
    return { orgId: invite.orgId };
  }

  async updateMemberAccess(input: {
    orgId: string;
    membershipId: string;
    role: Role;
    kyteAccess: KyteAccess;
    kyteGrants: { kyteId: string; role: Role }[];
    actorUserId: string;
  }): Promise<void> {
    const target = this.orgMembers.find((m) => m.id === input.membershipId && m.orgId === input.orgId);
    if (!target) throw new Error("member not found");
    target.role = input.role;
    target.kyteAccess = input.kyteAccess;
    this.kyteMembers = this.kyteMembers.filter((m) => m.userId !== target.userId);
    if (input.kyteAccess === "SELECTED") {
      for (const grant of input.kyteGrants) {
        this.kyteMembers.push({ kyteId: grant.kyteId, userId: target.userId, role: grant.role });
      }
    }
    this.pushAudit({
      action: "member.role-change",
      actorUserId: input.actorUserId,
      orgId: input.orgId,
      meta: { membershipId: target.id, role: input.role, kyteAccess: input.kyteAccess },
    });
  }

  async removeMember(input: {
    orgId: string;
    membershipId: string;
    actorUserId: string;
  }): Promise<void> {
    const target = this.orgMembers.find((m) => m.id === input.membershipId && m.orgId === input.orgId);
    if (!target) return;
    this.orgMembers = this.orgMembers.filter((m) => m.id !== target.id);
    this.kyteMembers = this.kyteMembers.filter((m) => m.userId !== target.userId);
    this.pushAudit({
      action: "member.remove",
      actorUserId: input.actorUserId,
      orgId: input.orgId,
      meta: { membershipId: target.id },
    });
  }

  async leaveOrg(input: { orgId: string; userId: string }): Promise<void> {
    const member = this.orgMembers.find((m) => m.orgId === input.orgId && m.userId === input.userId);
    if (!member) return;
    this.orgMembers = this.orgMembers.filter((m) => m.id !== member.id);
    this.kyteMembers = this.kyteMembers.filter((m) => m.userId !== input.userId);
    this.pushAudit({
      action: "member.remove",
      actorUserId: input.userId,
      orgId: input.orgId,
      meta: { membershipId: member.id, self: true },
    });
  }

  async listDomains(kyteId: string): Promise<DomainRow[]> {
    return this.domains.filter((d) => d.kyteId === kyteId);
  }

  async getDomain(domainId: string): Promise<DomainRow | null> {
    return this.domains.find((d) => d.id === domainId) ?? null;
  }

  async listAllDomains(): Promise<DomainRow[]> {
    return [...this.domains];
  }

  async setDomainVerification(input: {
    host: string;
    verified: boolean;
    lastVerifiedAt?: Date;
  }): Promise<void> {
    const row = this.domains.find((d) => d.host === input.host);
    if (!row) return;
    row.verified = input.verified;
    if (input.lastVerifiedAt) row.lastVerifiedAt = input.lastVerifiedAt;
  }

  async addDomain(input: {
    kyteId: string;
    host: string;
    actorUserId: string;
  }): Promise<DomainRow> {
    const host = input.host.trim().toLowerCase();
    const row: MemDomain = {
      id: host,
      kyteId: input.kyteId,
      host,
      verified: false,
      createdAt: new Date(),
      lastVerifiedAt: null,
    };
    this.domains.push(row);
    const kyte = this.kytes.find((k) => k.id === input.kyteId);
    this.pushAudit({
      action: "domain.add",
      actorUserId: input.actorUserId,
      orgId: kyte?.orgId ?? "",
      kyteId: input.kyteId,
      meta: { host },
    });
    return row;
  }

  async removeDomain(input: { domainId: string; actorUserId: string }): Promise<void> {
    const domain = this.domains.find((d) => d.id === input.domainId);
    if (!domain) return;
    this.domains = this.domains.filter((d) => d.id !== domain.id);
    const kyte = this.kytes.find((k) => k.id === domain.kyteId);
    this.pushAudit({
      action: "domain.remove",
      actorUserId: input.actorUserId,
      orgId: kyte?.orgId ?? "",
      kyteId: domain.kyteId,
      meta: { host: domain.host },
    });
  }

  private assets: StoredAsset[] = [];

  async insertAsset(asset: StoredAsset): Promise<void> {
    this.assets.push(asset);
  }

  async getAsset(assetId: string): Promise<StoredAsset | null> {
    return this.assets.find((a) => a.id === assetId) ?? null;
  }

  async removeAsset(assetId: string): Promise<StoredAsset | null> {
    const index = this.assets.findIndex((a) => a.id === assetId);
    if (index === -1) return null;
    const [removed] = this.assets.splice(index, 1);
    return removed ?? null;
  }

  async listAssetsForKyte(kyteId: string): Promise<StoredAsset[]> {
    return this.assets.filter((a) => a.kyteId === kyteId);
  }

  async findOgAsset(kyteId: string): Promise<StoredAsset | null> {
    return this.assets.find((a) => a.kyteId === kyteId && a.kind === "OG_IMAGE") ?? null;
  }

  async sumAssetSizeForOrg(orgId: string): Promise<number> {
    const kyteIds = new Set(this.kytes.filter((k) => k.orgId === orgId).map((k) => k.id));
    return this.assets
      .filter((a) => kyteIds.has(a.kyteId))
      .reduce((total, a) => total + a.sizeBytes, 0);
  }

  async changeEmail(userId: string, newEmail: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) user.email = newEmail.trim().toLowerCase();
  }

  async setUserImage(userId: string, image: string | null): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) user.image = image;
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    this.invalidatedSessionUserIds.push(userId);
  }

  async setUserStatus(input: SetUserStatusInput): Promise<void> {
    const user = this.users.find((u) => u.id === input.userId);
    if (!user) throw new Error("user not found");
    const restoring = input.status === "ACTIVE";
    user.status = input.status;
    user.statusReason = restoring ? null : input.reason;
    user.statusChangedAt = restoring ? null : new Date();
    user.statusChangedBy = restoring ? null : input.actorEmail;
  }

  async orgIdsForUser(userId: string): Promise<string[]> {
    return this.orgMembers.filter((m) => m.userId === userId).map((m) => m.orgId);
  }

  async setOrgSuspension(input: SetOrgSuspensionInput): Promise<void> {
    const org = this.orgs.find((o) => o.id === input.orgId);
    if (!org) throw new Error("org not found");
    if (input.suspended) {
      org.suspendedAt = new Date();
      org.suspensionReason = input.reason;
      org.suspendedBy = input.actorEmail;
      org.suspensionCause = input.cause;
    } else {
      org.suspendedAt = null;
      org.suspensionReason = null;
      org.suspendedBy = null;
      org.suspensionCause = null;
    }
  }

  async listOrgKyteHandles(orgId: string): Promise<{ kyteId: string; username: string }[]> {
    return this.kytes
      .filter((k) => k.orgId === orgId && k.username !== null)
      .map((k) => ({ kyteId: k.id, username: k.username as string }));
  }

  async auditLog(filter: AuditFilter): Promise<AuditRow[]> {
    return this.audit
      .filter((a) => a.orgId === filter.orgId)
      .filter((a) => (filter.action ? a.action === filter.action : true))
      .filter((a) => (filter.actorUserId ? a.actorUserId === filter.actorUserId : true))
      .filter((a) => (filter.before ? a.createdAt < filter.before : true))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, filter.limit);
  }

  async setOrgLimits(
    orgId: string,
    overrides: { key: LimitKey; value: number | null }[],
  ): Promise<void> {
    const org = this.orgs.find((o) => o.id === orgId);
    if (!org) throw new Error("org not found");
    for (const override of overrides) {
      if (override.value === null) delete org.limitOverrides[override.key];
      else org.limitOverrides[override.key] = override.value;
    }
  }

  async moderationQueue(input: {
    status?: ModerationStatus;
    limit: number;
  }): Promise<
    { kyteId: string; username: string | null; status: ModerationStatus; flaggedAt: Date }[]
  > {
    return this.kytes
      .filter((k) => (input.status ? k.moderationStatus === input.status : k.moderationStatus !== "APPROVED"))
      .slice(0, input.limit)
      .map((k) => ({
        kyteId: k.id,
        username: k.username,
        status: k.moderationStatus,
        flaggedAt: k.updatedAt,
      }));
  }

  async setKyteModeration(kyteId: string, status: ModerationStatus): Promise<void> {
    const kyte = this.kytes.find((k) => k.id === kyteId);
    if (kyte) kyte.moderationStatus = status;
  }

  async latestModerationReason(kyteId: string): Promise<string | null> {
    return this.moderationReasons.get(kyteId) ?? null;
  }

  async writeAdminAudit(input: AdminAuditInput): Promise<void> {
    this.pushAudit({
      action: input.action,
      actorUserId: input.actorUserId,
      orgId: input.orgId ?? null,
      kyteId: input.kyteId ?? null,
      meta: { summary: input.summary, ...input.meta },
    });
  }
}

function seedMemoryStore(store: MemoryStore): MemoryStore {
  const now = new Date("2026-07-18T12:00:00.000Z");
  const active = {
    status: "ACTIVE" as const,
    statusReason: null,
    statusChangedAt: null,
    statusChangedBy: null,
  };
  store.users.push(
    { id: "usr_agent", email: "agent@kytelink.dev", name: "Agent", role: "USER", createdAt: now, ...active },
    { id: "usr_agent_admin", email: "agent-admin@kytelink.dev", name: "Agent Admin", role: "ADMIN", createdAt: now, ...active },
    { id: "usr_agency_owner", email: "owner@kytelink.dev", name: "Owner", role: "USER", createdAt: now, ...active },
    { id: "usr_viewer", email: "viewer@kytelink.dev", name: "Viewer", role: "USER", createdAt: now, ...active },
  );
  store.orgs.push(
    {
      id: "org_agent_personal",
      name: "Agent's Organization",
      ownerUserId: "usr_agent",
      personal: true,
      createdAt: now,
      limitOverrides: {},
      ...UNSUSPENDED,
    },
    {
      id: "org_agency_demo",
      name: "Agency Demo",
      ownerUserId: "usr_agency_owner",
      personal: false,
      createdAt: now,
      limitOverrides: {},
      ...UNSUSPENDED,
    },
  );
  store.orgMembers.push(
    { id: "om1", orgId: "org_agent_personal", userId: "usr_agent", role: "OWNER", kyteAccess: "ALL" },
    { id: "om2", orgId: "org_agency_demo", userId: "usr_agency_owner", role: "OWNER", kyteAccess: "ALL" },
    { id: "om3", orgId: "org_agency_demo", userId: "usr_agent", role: "MANAGER", kyteAccess: "ALL" },
    { id: "om4", orgId: "org_agency_demo", userId: "usr_viewer", role: "VIEWER", kyteAccess: "ALL" },
  );
  store.kytes.push(
    {
      id: "usr_agent",
      orgId: "org_agent_personal",
      username: "agent",
      draft: content({ displayName: "Agent" }),
      published: content({ displayName: "Agent" }),
      publishSeq: 1,
      publishedAt: now,
      moderationStatus: "APPROVED",
      updatedAt: now,
      createdAt: now,
    },
    {
      id: "kyte_agent_draft",
      orgId: "org_agent_personal",
      username: "agent-draft",
      draft: content({ displayName: "Agent Draft" }),
      published: null,
      publishSeq: 0,
      publishedAt: null,
      moderationStatus: "APPROVED",
      updatedAt: now,
      createdAt: now,
    },
    {
      id: "kyte_ag_1",
      orgId: "org_agency_demo",
      username: "agency-flagship",
      draft: content({ displayName: "Agency Flagship" }),
      published: content({ displayName: "Agency Flagship" }),
      publishSeq: 2,
      publishedAt: now,
      moderationStatus: "APPROVED",
      updatedAt: now,
      createdAt: now,
    },
    {
      id: "kyte_suspended",
      orgId: "org_agency_demo",
      username: "suspended-demo",
      draft: content({ displayName: "Suspended" }),
      published: content({ displayName: "Suspended" }),
      publishSeq: 1,
      publishedAt: now,
      moderationStatus: "SUSPENDED",
      updatedAt: now,
      createdAt: now,
    },
  );
  return store;
}

export function createSeededStore(): MemoryStore {
  return seedMemoryStore(new MemoryStore());
}

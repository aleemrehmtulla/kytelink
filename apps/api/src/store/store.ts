import type {
  AssetKind,
  AuditAction,
  InviteStatus,
  KyteAccess,
  LimitKey,
  ModerationStatus,
  ProfileContent,
  Role,
  ScheduleStatus,
  UserStatus,
} from "@kytelink/schemas";

export interface StoredAsset {
  id: string;
  kyteId: string;
  uploadedById: string | null;
  key: string;
  kind: AssetKind;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  createdAt: Date;
  image?: string | null;
  status: UserStatus;
  statusReason: string | null;
  statusChangedAt: Date | null;
  statusChangedBy: string | null;
}

export interface OrgRow {
  id: string;
  name: string;
  ownerUserId: string;
  personal: boolean;
  createdAt: Date;
  limitOverrides: Partial<Record<LimitKey, number>>;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  suspendedBy: string | null;
  suspensionCause: string | null;
}

export interface OrgMemberRow {
  id: string;
  orgId: string;
  userId: string;
  role: Role;
  kyteAccess: KyteAccess;
}

export interface KyteMemberRow {
  kyteId: string;
  userId: string;
  role: Role;
}

export interface KyteRow {
  id: string;
  orgId: string;
  username: string | null;
  draft: ProfileContent;
  published: ProfileContent | null;
  publishSeq: number;
  publishedAt: Date | null;
  moderationStatus: ModerationStatus;
  updatedAt: Date;
  createdAt: Date;
}

export interface ScheduleRow {
  id: string;
  kyteId: string;
  scheduledFor: Date;
  timezone: string;
  status: ScheduleStatus;
  snapshot: ProfileContent;
  createdAt: Date;
}

export interface PreviewRow {
  id: string;
  kyteId: string;
  token: string;
  passcode: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface InviteRow {
  id: string;
  orgId: string;
  email: string;
  role: Role;
  kyteAccess: KyteAccess;
  kyteGrants: { kyteId: string; role: Role }[];
  status: InviteStatus;
  invitedByUserId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface DomainRow {
  id: string;
  kyteId: string;
  host: string;
  verified: boolean;
  createdAt: Date;
  lastVerifiedAt: Date | null;
}

export interface AuditRow {
  id: string;
  action: string;
  actorUserId: string;
  actorEmail: string | null;
  orgId: string | null;
  kyteId: string | null;
  meta: Record<string, unknown>;
  createdAt: Date;
}

export interface MemberDetail {
  membershipId: string;
  userId: string;
  email: string;
  role: Role;
  kyteAccess: KyteAccess;
  kyteGrants: { kyteId: string; role: Role }[];
}

export interface PublishResult {
  publishSeq: number;
  publishedAt: Date;
}

export interface CreatePreviewInput {
  kyteId: string;
  token: string;
  passcode: string;
  createdById: string;
  expiresAt: Date;
}

export interface CreateInviteInput {
  orgId: string;
  email: string;
  role: Role;
  kyteAccess: KyteAccess;
  kyteGrants: { kyteId: string; role: Role }[];
  invitedById: string;
  tokenHash: string;
  expiresAt: Date;
}

// Platform-scoped audit rows (a user suspension belongs to no single org), which
// is why orgId is nullable here and in the AuditLog table.
export interface AdminAuditInput {
  action: AuditAction;
  actorUserId: string;
  summary: string;
  orgId?: string | null;
  kyteId?: string | null;
  meta?: Record<string, unknown>;
}

export interface SetUserStatusInput {
  userId: string;
  status: UserStatus;
  reason: string;
  actorEmail: string;
}

export interface SetOrgSuspensionInput {
  orgId: string;
  suspended: boolean;
  reason: string;
  actorEmail: string;
  cause: string | null;
}

export interface AuditFilter {
  orgId: string;
  action?: string;
  actorUserId?: string;
  before?: Date;
  limit: number;
}

/**
 * The persistence seam. `MemoryStore` (fixtures for mock-api + unit tests) and
 * `PrismaStore` (real Postgres via @kytelink/db) both implement it, so every
 * router body runs identical logic regardless of backend.
 */
export interface Store {
  userById(id: string): Promise<UserRow | null>;
  userByEmail(email: string): Promise<UserRow | null>;

  orgById(id: string): Promise<OrgRow | null>;
  membershipsForUser(userId: string): Promise<OrgMemberRow[]>;
  orgMember(orgId: string, userId: string): Promise<OrgMemberRow | null>;
  listOrgMembers(orgId: string): Promise<MemberDetail[]>;
  ownedOrgCount(userId: string): Promise<number>;
  joinedOrgCount(userId: string): Promise<number>;
  createOrg(input: {
    name: string;
    ownerUserId: string;
    personal?: boolean;
  }): Promise<{ orgId: string }>;
  renameOrg(orgId: string, name: string): Promise<void>;
  deleteOrg(orgId: string): Promise<void>;

  kyteById(id: string): Promise<KyteRow | null>;
  kyteMember(kyteId: string, userId: string): Promise<KyteMemberRow | null>;
  kyteMembersForUser(userId: string, kyteIds: string[]): Promise<KyteMemberRow[]>;
  listKytesByOrg(orgId: string): Promise<KyteRow[]>;
  countKytesByOrg(orgId: string): Promise<number>;
  usernameOwner(username: string): Promise<string | null>;
  createKyte(input: { orgId: string; actorUserId: string }): Promise<{ kyteId: string }>;
  updateDraft(kyteId: string, content: ProfileContent): Promise<{ updatedAt: Date }>;
  setKyteAvatar(kyteId: string, assetId: string | null): Promise<void>;
  publishKyte(input: {
    kyteId: string;
    actorUserId: string;
  }): Promise<PublishResult>;
  changeUsername(input: { kyteId: string; actorUserId: string; username: string }): Promise<void>;
  deleteKyte(input: { kyteId: string; actorUserId: string }): Promise<void>;

  listSchedules(kyteId: string): Promise<ScheduleRow[]>;
  countPendingSchedules(kyteId: string): Promise<number>;
  getSchedule(scheduleId: string): Promise<ScheduleRow | null>;
  createSchedule(input: {
    kyteId: string;
    scheduledFor: Date;
    timezone: string;
    snapshot: ProfileContent;
    actorUserId: string;
  }): Promise<{ scheduleId: string }>;
  refreshScheduleSnapshot(scheduleId: string, snapshot: ProfileContent): Promise<void>;
  reschedule(scheduleId: string, scheduledFor: Date, timezone: string): Promise<void>;
  cancelSchedule(input: { scheduleId: string; actorUserId: string }): Promise<void>;
  cancelPendingSchedules(kyteId: string, options: { overdueOnly: boolean }): Promise<number>;

  getPreviewForKyte(kyteId: string): Promise<PreviewRow | null>;
  createPreview(input: CreatePreviewInput & { actorUserId: string }): Promise<PreviewRow>;
  rotatePreviewPasscode(input: {
    kyteId: string;
    passcode: string;
    expiresAt: Date;
    actorUserId: string;
  }): Promise<PreviewRow>;

  listInvitesForEmail(email: string): Promise<InviteRow[]>;
  getInviteById(inviteId: string): Promise<InviteRow | null>;
  getInviteByTokenHash(tokenHash: string): Promise<InviteRow | null>;
  countActiveInvites(orgId: string): Promise<number>;
  createInvite(input: CreateInviteInput): Promise<{ inviteId: string }>;
  setInviteStatus(input: {
    inviteId: string;
    status: InviteStatus;
    actorUserId: string;
  }): Promise<void>;
  acceptInvite(input: { inviteId: string; userId: string }): Promise<{ orgId: string }>;

  updateMemberAccess(input: {
    orgId: string;
    membershipId: string;
    role: Role;
    kyteAccess: KyteAccess;
    kyteGrants: { kyteId: string; role: Role }[];
    actorUserId: string;
  }): Promise<void>;
  removeMember(input: { orgId: string; membershipId: string; actorUserId: string }): Promise<void>;
  leaveOrg(input: { orgId: string; userId: string }): Promise<void>;

  listDomains(kyteId: string): Promise<DomainRow[]>;
  getDomain(domainId: string): Promise<DomainRow | null>;
  addDomain(input: { kyteId: string; host: string; actorUserId: string }): Promise<DomainRow>;
  removeDomain(input: { domainId: string; actorUserId: string }): Promise<void>;
  listAllDomains(): Promise<DomainRow[]>;
  setDomainVerification(input: { host: string; verified: boolean; lastVerifiedAt?: Date }): Promise<void>;

  insertAsset(asset: StoredAsset): Promise<void>;
  getAsset(assetId: string): Promise<StoredAsset | null>;
  removeAsset(assetId: string): Promise<StoredAsset | null>;
  listAssetsForKyte(kyteId: string): Promise<StoredAsset[]>;
  findOgAsset(kyteId: string): Promise<StoredAsset | null>;
  sumAssetSizeForOrg(orgId: string): Promise<number>;

  changeEmail(userId: string, newEmail: string): Promise<void>;
  setUserImage(userId: string, image: string | null): Promise<void>;
  invalidateUserSessions(userId: string): Promise<void>;
  setUserStatus(input: SetUserStatusInput): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  // The denylist row must outlive the User row a ban deletes — it is the only
  // thing standing between a banned email and a fresh signup.
  banEmail(input: { email: string; reason: string; actorEmail: string }): Promise<void>;
  // Every org the user belongs to, at any role — suspending a person suspends
  // all of them, and the cause stamp is what keeps a co-owner's direct
  // suspension from being cleared when this user is restored.
  orgIdsForUser(userId: string): Promise<string[]>;
  setOrgSuspension(input: SetOrgSuspensionInput): Promise<void>;
  listOrgKyteHandles(orgId: string): Promise<{ kyteId: string; username: string }[]>;

  auditLog(filter: AuditFilter): Promise<AuditRow[]>;
  writeAdminAudit(input: AdminAuditInput): Promise<void>;

  setOrgLimits(orgId: string, overrides: { key: LimitKey; value: number | null }[]): Promise<void>;
  moderationQueue(input: {
    status?: ModerationStatus;
    limit: number;
  }): Promise<{ kyteId: string; username: string | null; status: ModerationStatus; flaggedAt: Date }[]>;
  setKyteModeration(kyteId: string, status: ModerationStatus): Promise<void>;
  // The reason shown to the owner and to the public blocked page: the most
  // recent SUSPEND verdict recorded for this kyte, if any.
  latestModerationReason(kyteId: string): Promise<string | null>;
}

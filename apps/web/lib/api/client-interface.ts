import type {
  AssetKind,
  OrgInvitePayload,
  ProfileContent,
  Role,
  KyteAccess,
} from "@kytelink/schemas";
import type {
  AccountInfo,
  AnalyticsOverview,
  AuditEntry,
  CountriesResult,
  DevicesResult,
  DomainRecord,
  ImportProposal,
  KyteGet,
  KyteSummary,
  Member,
  MyInvite,
  OrgStorage,
  OrgSummary,
  Passkey,
  PreviewLinkResult,
  ReferrersResult,
  ScheduleSummary,
  TimeSeriesResult,
  TopLinksResult,
} from "./types";

export interface UsernameCheck {
  available: boolean;
  reason: "empty" | "too_long" | "invalid_chars" | "reserved" | "unsafe_dot" | "taken" | null;
  suggestions: string[];
}

export interface AnalyticsWindow {
  kyteId: string;
  days: number;
}

interface CreateUploadResult {
  assetId: string;
  uploadUrl: string;
  fields: Record<string, string> | null;
  key: string;
}

export interface ApiClient {
  org: {
    listMine(): Promise<{ orgs: OrgSummary[] }>;
    create(input: { name?: string }): Promise<{ orgId: string }>;
    rename(input: { orgId: string; name: string }): Promise<void>;
    delete(input: { orgId: string; confirm: string }): Promise<void>;
    storage(input: { orgId: string }): Promise<OrgStorage>;
    leave(input: { orgId: string }): Promise<void>;
    auditLog(input: {
      orgId?: string;
      kyteId?: string;
      action?: string;
      actorUserId?: string;
    }): Promise<{ entries: AuditEntry[]; nextCursor: string | null }>;
  };
  kyte: {
    get(input: { kyteId: string }): Promise<KyteGet>;
    create(input: { orgId?: string; username: string }): Promise<{ kyteId: string }>;
    updateDraft(input: {
      kyteId: string;
      content: ProfileContent;
      baseUpdatedAt: string;
    }): Promise<{ updatedAt: string }>;
    publish(input: { kyteId: string }): Promise<{ publishSeq: number; publishedAt: string }>;
    checkUsername(input: { username: string; kyteId?: string }): Promise<UsernameCheck>;
    changeUsername(input: { kyteId: string; username: string }): Promise<void>;
    delete(input: { kyteId: string; confirm: string }): Promise<void>;
  };
  team: {
    members(input: { orgId: string }): Promise<{ members: Member[] }>;
    invite(input: { orgId: string } & OrgInvitePayload): Promise<{ inviteId: string }>;
    revokeInvite(input: { inviteId: string }): Promise<void>;
    updateAccess(input: {
      orgId: string;
      membershipId: string;
      role: Role;
      kyteAccess: KyteAccess;
      kyteGrants?: { kyteId: string; role: Role }[];
    }): Promise<void>;
    removeMember(input: { orgId: string; membershipId: string }): Promise<void>;
  };
  invites: {
    listMine(): Promise<{ invites: MyInvite[] }>;
    accept(input: { inviteId: string }): Promise<{ orgId: string }>;
    decline(input: { inviteId: string }): Promise<void>;
  };
  domains: {
    list(input: { kyteId: string }): Promise<{ domains: DomainRecord[] }>;
    add(input: { kyteId: string; host: string }): Promise<DomainRecord>;
    status(input: { domainId: string }): Promise<{ status: DomainRecord["status"]; records: DomainRecord["records"] }>;
    verify(input: { domainId: string }): Promise<{ status: DomainRecord["status"]; records: DomainRecord["records"] }>;
    remove(input: { domainId: string }): Promise<void>;
  };
  schedule: {
    list(input: { kyteId: string }): Promise<{ schedules: ScheduleSummary[] }>;
    create(input: { kyteId: string; scheduledFor: string; timezone: string }): Promise<{ scheduleId: string }>;
    updateSnapshot(input: { scheduleId: string }): Promise<void>;
    reschedule(input: { scheduleId: string; scheduledFor: string; timezone: string }): Promise<void>;
    cancel(input: { scheduleId: string }): Promise<void>;
  };
  preview: {
    ensure(input: { kyteId: string }): Promise<PreviewLinkResult>;
    rotate(input: { kyteId: string }): Promise<PreviewLinkResult>;
    verify(input: {
      token: string;
      passcode: string;
    }): Promise<{ content: ProfileContent; username: string | null } | null>;
  };
  import: {
    fromUrl(input: { kyteId: string; url: string }): Promise<ImportProposal>;
  };
  assets: {
    createUploadUrl(input: {
      kyteId: string;
      kind: AssetKind;
      contentType: string;
      sizeBytes: number;
    }): Promise<CreateUploadResult>;
    finalize(input: { assetId: string }): Promise<{ url: string; lqip: string | null }>;
  };
  analytics: {
    overview(input: AnalyticsWindow): Promise<AnalyticsOverview>;
    timeSeries(input: AnalyticsWindow): Promise<TimeSeriesResult>;
    topLinks(input: AnalyticsWindow): Promise<TopLinksResult>;
    referrers(input: AnalyticsWindow): Promise<ReferrersResult>;
    devices(input: AnalyticsWindow): Promise<DevicesResult>;
    countries(input: AnalyticsWindow): Promise<CountriesResult>;
  };
  account: {
    get(): Promise<AccountInfo>;
    changeEmail(input: { newEmail: string }): Promise<{ ok: true; otpSent: boolean }>;
    setAvatar(input: { image: string | null }): Promise<void>;
    passkeys: {
      list(): Promise<{ passkeys: Passkey[] }>;
      add(input: { name: string }): Promise<void>;
      rename(input: { id: string; name: string }): Promise<void>;
      remove(input: { id: string }): Promise<void>;
    };
  };
  resolveKyteSummary(kyteId: string): Promise<KyteSummary | null>;
}

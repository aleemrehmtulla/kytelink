import type {
  DeviceType,
  DnsRecord,
  DomainStatus,
  ImportProposal,
  InviteStatus,
  KyteAccess,
  ModerationStatus,
  OrgInvitePayload,
  ProfileContent,
  Role,
  ScheduleStatus,
  ThemeKey,
} from "@kytelink/schemas";

export interface KyteSummary {
  id: string;
  username: string | null;
  displayName: string | null;
  theme: ThemeKey;
  published: boolean;
  moderationStatus: ModerationStatus;
  effectiveRole: Role | null;
}

export interface OrgSummary {
  id: string;
  name: string;
  role: Role;
  kyteAccess: KyteAccess;
  ownerUserId: string;
  personal: boolean;
  kytes: KyteSummary[];
}

export interface OrgStorage {
  usedBytes: number;
  limitBytes: number;
  kytes: { kyteId: string; displayName: string | null; bytes: number }[];
}

export interface ScheduleSummary {
  id: string;
  kyteId: string;
  scheduledFor: string;
  timezone: string;
  status: ScheduleStatus;
  createdBy: string;
  createdAt: string;
  snapshot: ProfileContent;
}

export interface KyteGet {
  id: string;
  orgId: string;
  username: string | null;
  role: Role;
  moderationStatus: ModerationStatus;
  suspensionReason: string | null;
  published: boolean;
  updatedAt: string;
  draft: ProfileContent;
  publishedContent: ProfileContent | null;
  schedules: ScheduleSummary[];
}

export interface DomainRecord {
  id: string;
  host: string;
  status: DomainStatus;
  records: DnsRecord[];
  createdAt: string;
}

export interface Member {
  membershipId: string;
  userId: string;
  email: string;
  role: Role;
  kyteAccess: KyteAccess;
  kyteGrants: { kyteId: string; role: Role }[];
}

export interface AuditEntry {
  id: string;
  action: string;
  actorUserId: string;
  actorEmail: string | null;
  orgId: string | null;
  kyteId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AccountInfo {
  id: string;
  email: string;
  createdAt: string;
  image: string | null;
  passkeys: Passkey[];
}

export interface MyInvite {
  id: string;
  orgId: string;
  orgName: string;
  role: Role;
  status: InviteStatus;
  invitedByEmail: string | null;
  invitedEmail: string;
  expiresAt: string;
}

export interface AnalyticsOverview {
  totalViews: number;
  totalClicks: number;
}

export interface TimeSeriesResult {
  points: { date: string; views: number }[];
}

export interface TopLinksResult {
  links: { linkUrl: string; linkTitle: string; clicks: number }[];
}

export interface ReferrersResult {
  referrers: { refDomain: string; views: number }[];
}

export interface DevicesResult {
  devices: { device: DeviceType; views: number }[];
}

export interface CountriesResult {
  countries: { country: string; views: number }[];
}

export interface PreviewLinkResult {
  token: string;
  passcode: string;
  url: string;
  expiresAt: string;
}

export type { OrgInvitePayload, ImportProposal };

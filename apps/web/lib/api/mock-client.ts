import {
  defaultOrgName,
  effectiveRole,
  emptyProfileContent,
  validateUsername,
  PREVIEW_EXPIRY_DAYS,
  PREVIEW_TOKEN_LENGTH,
  previewUrl,
  type ProfileContent,
  type Role,
} from "@kytelink/schemas";
import { LIMITS } from "../../consts/limits";
import { publicWebUrl } from "../env";
import { SAMPLE_DNS_RECORDS } from "../../consts/domains";
import { ApiClientError } from "./errors";
import type { ApiClient, AnalyticsWindow, UsernameCheck } from "./client-interface";
import {
  createStore,
  type MockPersona,
  type MockStore,
  type StoreKyte,
  type StoreOrg,
  type StorePreview,
} from "./fixtures";
import type {
  AuditEntry,
  KyteGet,
  KyteSummary,
  Member,
  OrgSummary,
  PreviewLinkResult,
  ScheduleSummary,
} from "./types";

let storeSingleton: MockStore | null = null;
let currentPersona: MockPersona = "solo";

function store(): MockStore {
  if (!storeSingleton) storeSingleton = createStore(currentPersona);
  return storeSingleton;
}

export function setMockPersona(persona: MockPersona): void {
  if (persona !== currentPersona || !storeSingleton) {
    currentPersona = persona;
    storeSingleton = createStore(persona);
  }
}

let uid = 0;
function id(prefix: string): string {
  uid += 1;
  return `${prefix}_${Date.now().toString(36)}_${uid}`;
}

function iso(date: Date): string {
  return date.toISOString();
}

function roleForKyte(userId: string, kyte: StoreKyte): Role | null {
  const org = store().orgs.find((o) => o.id === kyte.orgId);
  if (!org) return null;
  const membership = org.members.find((m) => m.userId === userId);
  if (!membership) return null;
  const grant = membership.kyteGrants.find((g) => g.kyteId === kyte.id);
  return effectiveRole(
    { role: membership.role, kyteAccess: membership.kyteAccess },
    grant ? { role: grant.role } : null,
  );
}

function summarize(kyte: StoreKyte, userId: string): KyteSummary {
  return {
    id: kyte.id,
    username: kyte.username,
    displayName: kyte.draft.displayName,
    theme: kyte.draft.theme,
    published: kyte.published,
    moderationStatus: kyte.moderationStatus,
    effectiveRole: roleForKyte(userId, kyte),
  };
}

function orgSummary(org: StoreOrg, userId: string): OrgSummary {
  const membership = org.members.find((m) => m.userId === userId);
  const visibleKytes = store()
    .kytes.filter((k) => k.orgId === org.id)
    .filter((k) => roleForKyte(userId, k) !== null)
    .map((k) => summarize(k, userId));
  return {
    id: org.id,
    name: org.name,
    role: membership?.role ?? "VIEWER",
    kyteAccess: membership?.kyteAccess ?? "ALL",
    ownerUserId: org.ownerUserId,
    personal: org.personal,
    kytes: visibleKytes,
  };
}

function scheduleSummary(s: MockStore["schedules"][number]): ScheduleSummary {
  return {
    id: s.id,
    kyteId: s.kyteId,
    scheduledFor: s.scheduledFor,
    timezone: s.timezone,
    status: s.status,
    createdBy: s.createdBy,
    createdAt: s.createdAt,
    snapshot: s.snapshot,
  };
}

function previewResult(p: StorePreview): PreviewLinkResult {
  return {
    token: p.token,
    passcode: p.passcode,
    url: previewUrl(publicWebUrl(), p.token),
    expiresAt: p.expiresAt,
  };
}

// Same shape as the real base64url token, deterministic for the mock store.
function mockPreviewToken(): string {
  const seed = `${store().previews.length + 1}`;
  return `${seed}${Math.abs(Math.sin(store().previews.length + 1) * 1e16).toString(36)}`
    .replace(/[^A-Za-z0-9]/g, "")
    .padEnd(PREVIEW_TOKEN_LENGTH, "0")
    .slice(0, PREVIEW_TOKEN_LENGTH);
}

function previewExpiry(): string {
  return iso(new Date(Date.now() + PREVIEW_EXPIRY_DAYS * 864e5));
}

function nextPasscode(): string {
  return String(100000 + seeded(store().previews.length + 1, 900000)).slice(0, 6);
}

function suggestUsernames(base: string): string[] {
  const root = base.replace(/[^a-z0-9_-]/g, "") || "kyte";
  return [`${root}1`, `${root}_`, `real${root}`].filter(
    (candidate) => !store().usernames.has(candidate) && validateUsername(candidate).ok,
  );
}

function seeded(n: number, max: number): number {
  return Math.floor((Math.sin(n) * 10000) % max + max) % max;
}

export function createMockClient(getCurrentUserId: () => string): ApiClient {
  const me = () => getCurrentUserId();

  // A suspended kyte still reads — only the write paths refuse it, each on
  // their own, exactly as the API's mutation guards do.
  function requireKyte(kyteId: string): StoreKyte {
    const kyte = store().kytes.find((k) => k.id === kyteId);
    if (!kyte) throw new ApiClientError("Kyte not found");
    return kyte;
  }

  function checkUsernameCore(username: string, kyteId?: string): UsernameCheck {
    const validation = validateUsername(username);
    if (!validation.ok) {
      return { available: false, reason: validation.reason, suggestions: suggestUsernames(username) };
    }
    const current = kyteId ? store().kytes.find((k) => k.id === kyteId)?.username : undefined;
    if (store().usernames.has(validation.username) && validation.username !== current) {
      return { available: false, reason: "taken", suggestions: suggestUsernames(validation.username) };
    }
    return { available: true, reason: null, suggestions: [] };
  }

  return {
    org: {
      async listMine() {
        const mine = store()
          .orgs.filter((o) => o.members.some((m) => m.userId === me()))
          .map((o) => orgSummary(o, me()));
        return { orgs: mine };
      },
      async create({ name }) {
        // Mirrors the backend rule: a user's first owned org becomes their
        // personal org with a derived name, ignoring any supplied name.
        if (!store().orgs.some((o) => o.ownerUserId === me())) {
          const email = store().users.find((u) => u.id === me())?.email ?? "";
          return { orgId: ensurePersonalOrg(me(), email) };
        }
        if (!name) throw new ApiClientError("Organization name is required");
        const owned = store().orgs.filter((o) => o.ownerUserId === me() && !o.personal).length;
        if (owned >= LIMITS.orgsOwned) {
          throw new ApiClientError("You've hit the limit on teams", "LIMIT_REACHED", "orgsOwnedPerUser");
        }
        const orgId = id("org");
        store().orgs.push({
          id: orgId,
          name,
          ownerUserId: me(),
          personal: false,
          members: [
            {
              membershipId: id("m"),
              userId: me(),
              email: store().users.find((u) => u.id === me())?.email ?? "",
              role: "OWNER",
              kyteAccess: "ALL",
              kyteGrants: [],
            },
          ],
        });
        return { orgId };
      },
      async rename({ orgId, name }) {
        const org = store().orgs.find((o) => o.id === orgId);
        if (org) org.name = name;
      },
      async delete({ orgId }) {
        const hasKytes = store().kytes.some((k) => k.orgId === orgId);
        if (hasKytes) throw new ApiClientError("Delete kytes before deleting the team");
        storeSingleton = {
          ...store(),
          orgs: store().orgs.filter((o) => o.id !== orgId),
        };
      },
      async storage({ orgId }) {
        const kytes = store().kytes.filter((k) => k.orgId === orgId);
        const perKyte = kytes.map((k) => {
          const linkCount = k.draft.links.length + k.draft.icons.length;
          const bytes = (1 + seeded(k.id.length + linkCount, 9)) * 1024 * 1024 + seeded(linkCount + 1, 900) * 1024;
          return { kyteId: k.id, displayName: k.draft.displayName, bytes };
        });
        const usedBytes = perKyte.reduce((sum, k) => sum + k.bytes, 0);
        return { usedBytes, limitBytes: LIMITS.storageMbPerOrg * 1024 * 1024, kytes: perKyte };
      },
      async leave({ orgId }) {
        const org = store().orgs.find((o) => o.id === orgId);
        if (!org) throw new ApiClientError("Team not found");
        if (org.ownerUserId === me()) throw new ApiClientError("Owners can't leave — delete or transfer the team instead");
        org.members = org.members.filter((m) => m.userId !== me());
      },
      async auditLog({ orgId, kyteId, action, actorUserId }) {
        const entries: AuditEntry[] = store().audit.filter((a) => {
          if (orgId && a.orgId !== orgId) return false;
          if (kyteId && a.kyteId !== kyteId) return false;
          if (action && a.action !== action) return false;
          if (actorUserId && a.actorUserId !== actorUserId) return false;
          return true;
        });
        return { entries, nextCursor: null };
      },
    },

    kyte: {
      async get({ kyteId }): Promise<KyteGet> {
        const kyte = requireKyte(kyteId);
        const role = roleForKyte(me(), kyte);
        if (!role) throw new ApiClientError("You don't have access to this kyte");
        return {
          id: kyte.id,
          orgId: kyte.orgId,
          username: kyte.username,
          role,
          moderationStatus: kyte.moderationStatus,
          suspensionReason: kyte.suspensionReason,
          published: kyte.published,
          updatedAt: kyte.updatedAt,
          draft: kyte.draft,
          publishedContent: kyte.publishedContent,
          schedules: store()
            .schedules.filter((s) => s.kyteId === kyteId)
            .map(scheduleSummary),
        };
      },
      async create({ orgId, username }) {
        const targetOrg =
          orgId ?? store().orgs.find((o) => o.personal && o.ownerUserId === me())?.id;
        if (!targetOrg) throw new ApiClientError("No org available");
        const count = store().kytes.filter((k) => k.orgId === targetOrg).length;
        if (count >= LIMITS.kytesPerOrg) {
          throw new ApiClientError("You've hit the limit on kytes", "LIMIT_REACHED", "kytesPerOrg");
        }
        const validation = validateUsername(username);
        if (!validation.ok || !checkUsernameCore(username).available) {
          throw new ApiClientError("Username unavailable");
        }
        const kyteId = id("kyte");
        store().kytes.push({
          id: kyteId,
          orgId: targetOrg,
          username: validation.username,
          moderationStatus: "APPROVED",
          suspensionReason: null,
          published: false,
          updatedAt: iso(new Date()),
          draft: emptyProfileContent(),
          publishedContent: null,
        });
        store().usernames.add(validation.username);
        return { kyteId };
      },
      async updateDraft({ kyteId, content, baseUpdatedAt }) {
        const kyte = requireKyte(kyteId);
        if (new Date(kyte.updatedAt).getTime() > new Date(baseUpdatedAt).getTime()) {
          throw new ApiClientError("Draft changed elsewhere", "STALE_DRAFT");
        }
        kyte.draft = content;
        kyte.updatedAt = iso(new Date());
        return { updatedAt: kyte.updatedAt };
      },
      async publish({ kyteId }) {
        const kyte = requireKyte(kyteId);
        if (kyte.moderationStatus === "SUSPENDED") {
          throw new ApiClientError("This kyte is suspended", "KYTE_SUSPENDED");
        }
        kyte.publishedContent = structuredClone(kyte.draft);
        kyte.published = true;
        return { publishSeq: 1, publishedAt: iso(new Date()) };
      },
      async checkUsername({ username, kyteId }) {
        return checkUsernameCore(username, kyteId);
      },
      async changeUsername({ kyteId, username }) {
        const result = checkUsernameCore(username, kyteId);
        if (!result.available) throw new ApiClientError("Username unavailable");
        const kyte = requireKyte(kyteId);
        if (kyte.username) store().usernames.delete(kyte.username);
        kyte.username = validateUsername(username).ok ? username.trim().toLowerCase() : username;
        store().usernames.add(kyte.username);
      },
      async delete({ kyteId, confirm }) {
        const kyte = requireKyte(kyteId);
        if (kyte.username && confirm !== kyte.username) throw new ApiClientError("Confirmation does not match");
        if (kyte.username) store().usernames.delete(kyte.username);
        storeSingleton = { ...store(), kytes: store().kytes.filter((k) => k.id !== kyteId) };
      },
    },

    team: {
      async members({ orgId }) {
        const org = store().orgs.find((o) => o.id === orgId);
        const members: Member[] = (org?.members ?? []).map((m) => ({
          membershipId: m.membershipId,
          userId: m.userId,
          email: m.email,
          role: m.role,
          kyteAccess: m.kyteAccess,
          kyteGrants: m.kyteGrants,
        }));
        return { members };
      },
      async invite({ orgId, email, role, kyteAccess, kyteGrants }) {
        const org = store().orgs.find((o) => o.id === orgId);
        if (!org) throw new ApiClientError("Team not found");
        if (org.members.length >= LIMITS.peoplePerOrg) {
          throw new ApiClientError("You've hit the limit on people", "LIMIT_REACHED", "peoplePerOrg");
        }
        const inviteId = id("inv");
        store().invites.push({
          id: inviteId,
          orgId,
          orgName: org.name,
          role,
          status: "PENDING",
          invitedByEmail: store().users.find((u) => u.id === me())?.email ?? null,
          invitedEmail: email,
          expiresAt: iso(new Date(Date.now() + 14 * 864e5)),
        });
        void kyteAccess;
        void kyteGrants;
        return { inviteId };
      },
      async revokeInvite({ inviteId }) {
        const invite = store().invites.find((i) => i.id === inviteId);
        if (invite) invite.status = "REVOKED";
      },
      async updateAccess({ orgId, membershipId, role, kyteAccess, kyteGrants }) {
        const org = store().orgs.find((o) => o.id === orgId);
        const member = org?.members.find((m) => m.membershipId === membershipId);
        if (member) {
          member.role = role;
          member.kyteAccess = kyteAccess;
          member.kyteGrants = kyteAccess === "SELECTED" ? kyteGrants ?? [] : [];
        }
      },
      async removeMember({ orgId, membershipId }) {
        const org = store().orgs.find((o) => o.id === orgId);
        if (org) org.members = org.members.filter((m) => m.membershipId !== membershipId);
      },
    },

    invites: {
      async listMine() {
        const myEmail = store().users.find((u) => u.id === me())?.email;
        const invites = store().invites.filter((i) => i.invitedEmail === myEmail);
        return { invites };
      },
      async accept({ inviteId }) {
        const invite = store().invites.find((i) => i.id === inviteId);
        if (!invite) throw new ApiClientError("Invite not found");
        invite.status = "ACCEPTED";
        const org = store().orgs.find((o) => o.id === invite.orgId);
        if (org && !org.members.some((m) => m.userId === me())) {
          org.members.push({
            membershipId: id("m"),
            userId: me(),
            email: invite.invitedEmail,
            role: invite.role,
            kyteAccess: "ALL",
            kyteGrants: [],
          });
        }
        return { orgId: invite.orgId };
      },
      async decline({ inviteId }) {
        const invite = store().invites.find((i) => i.id === inviteId);
        if (invite) invite.status = "DECLINED";
      },
    },

    domains: {
      async list({ kyteId }) {
        const domains = store()
          .domains.filter((d) => d.kyteId === kyteId)
          .map((d) => ({
            id: d.id,
            host: d.host,
            status: d.status,
            records: [...SAMPLE_DNS_RECORDS],
            createdAt: d.createdAt,
          }));
        return { domains };
      },
      async add({ kyteId, host }) {
        const domainId = id("dom");
        const record = {
          id: domainId,
          kyteId,
          host: host.trim().toLowerCase(),
          status: "PENDING" as const,
          createdAt: iso(new Date()),
        };
        store().domains.push(record);
        return { id: domainId, host: record.host, status: record.status, records: [...SAMPLE_DNS_RECORDS], createdAt: record.createdAt };
      },
      async status({ domainId }) {
        const domain = store().domains.find((d) => d.id === domainId);
        if (domain && domain.status === "PENDING") domain.status = "VERIFYING";
        else if (domain && domain.status === "VERIFYING") domain.status = "ACTIVE";
        return { status: domain?.status ?? "PENDING", records: [...SAMPLE_DNS_RECORDS] };
      },
      async verify({ domainId }) {
        const domain = store().domains.find((d) => d.id === domainId);
        if (domain && domain.status === "PENDING") domain.status = "VERIFYING";
        else if (domain && domain.status === "VERIFYING") domain.status = "ACTIVE";
        return { status: domain?.status ?? "PENDING", records: [...SAMPLE_DNS_RECORDS] };
      },
      async remove({ domainId }) {
        storeSingleton = { ...store(), domains: store().domains.filter((d) => d.id !== domainId) };
      },
    },

    schedule: {
      async list({ kyteId }) {
        return {
          schedules: store()
            .schedules.filter((s) => s.kyteId === kyteId)
            .map(scheduleSummary),
        };
      },
      async create({ kyteId, scheduledFor, timezone }) {
        const kyte = requireKyte(kyteId);
        const pending = store().schedules.filter(
          (s) => s.kyteId === kyteId && s.status === "PENDING",
        ).length;
        if (pending >= LIMITS.pendingSchedulesPerKyte) {
          throw new ApiClientError(
            "You've hit the limit on scheduled publishes",
            "LIMIT_REACHED",
            "schedulesPerKyte",
          );
        }
        const scheduleId = id("sch");
        store().schedules.push({
          id: scheduleId,
          kyteId,
          scheduledFor,
          timezone,
          status: "PENDING",
          createdBy: store().users.find((u) => u.id === me())?.email ?? "you",
          createdAt: iso(new Date()),
          snapshot: structuredClone(kyte.draft),
        });
        return { scheduleId };
      },
      async updateSnapshot({ scheduleId }) {
        const schedule = store().schedules.find((s) => s.id === scheduleId);
        if (schedule) {
          const kyte = store().kytes.find((k) => k.id === schedule.kyteId);
          if (kyte) schedule.snapshot = structuredClone(kyte.draft);
        }
      },
      async reschedule({ scheduleId, scheduledFor, timezone }) {
        const schedule = store().schedules.find((s) => s.id === scheduleId);
        if (schedule) {
          schedule.scheduledFor = scheduledFor;
          schedule.timezone = timezone;
        }
      },
      async cancel({ scheduleId }) {
        const schedule = store().schedules.find((s) => s.id === scheduleId);
        if (schedule) schedule.status = "CANCELED";
      },
    },

    preview: {
      async ensure({ kyteId }) {
        const existing = store().previews.find((p) => p.kyteId === kyteId);
        if (existing && new Date(existing.expiresAt).getTime() > Date.now()) {
          return previewResult(existing);
        }
        if (existing) {
          existing.passcode = nextPasscode();
          existing.expiresAt = previewExpiry();
          return previewResult(existing);
        }
        const created: StorePreview = {
          id: id("prev"),
          kyteId,
          token: mockPreviewToken(),
          passcode: nextPasscode(),
          expiresAt: previewExpiry(),
          createdAt: iso(new Date()),
        };
        store().previews.push(created);
        return previewResult(created);
      },
      async rotate({ kyteId }) {
        const existing = store().previews.find((p) => p.kyteId === kyteId);
        if (!existing) return this.ensure({ kyteId });
        existing.passcode = nextPasscode();
        existing.expiresAt = previewExpiry();
        return previewResult(existing);
      },
      async verify({ token, passcode }) {
        const preview = store().previews.find((p) => p.token === token);
        if (!preview || new Date(preview.expiresAt).getTime() < Date.now()) return null;
        if (preview.passcode !== passcode) throw new ApiClientError("Wrong passcode");
        const kyte = store().kytes.find((k) => k.id === preview.kyteId);
        return kyte ? { content: kyte.draft, username: kyte.username } : null;
      },
    },

    import: {
      async fromUrl({ url }) {
        let host: string;
        try {
          host = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          throw new ApiClientError("couldn't read that page");
        }
        return {
          displayName: "Imported profile",
          description: `Brought over from ${host}`,
          links: [
            { title: "My website", link: "https://example.com" },
            { title: "Latest video", link: "https://youtube.com/watch" },
            { title: "Shop", link: "https://example.com/shop" },
          ],
          icons: [{ name: "Instagram", url: "https://instagram.com/imported" }],
        };
      },
    },

    assets: {
      async createUploadUrl({ kyteId }) {
        const assetId = id("asset");
        return {
          assetId,
          uploadUrl: `/mock-upload/${assetId}`,
          fields: null,
          key: `u/${kyteId}/avatar/${assetId}.webp`,
        };
      },
      async finalize({ assetId }) {
        return {
          url: `u/mock/${assetId}.webp`,
          lqip: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='%23cbd5e0'/%3E%3C/svg%3E",
        };
      },
    },

    analytics: {
      async overview({ days }: AnalyticsWindow) {
        return { totalViews: 1240 + days * 12, totalClicks: 318 + days * 4 };
      },
      async timeSeries({ days }: AnalyticsWindow) {
        const points = Array.from({ length: days }, (_, i) => {
          const date = new Date(Date.now() - (days - 1 - i) * 864e5);
          return { date: date.toISOString().slice(0, 10), views: 20 + seeded(i + 1, 80) };
        });
        return { points };
      },
      async topLinks() {
        return {
          links: [
            { linkUrl: "https://kytelink.com/blog", linkTitle: "My newsletter", clicks: 143 },
            { linkUrl: "https://github.com/kytelink", linkTitle: "Star on GitHub", clicks: 92 },
            { linkUrl: "https://kytelink.com/launch", linkTitle: "New: launch notes", clicks: 51 },
          ],
        };
      },
      async referrers() {
        return {
          referrers: [
            { refDomain: "twitter.com", views: 420 },
            { refDomain: "instagram.com", views: 260 },
            { refDomain: "google.com", views: 180 },
          ],
        };
      },
      async devices() {
        return {
          devices: [
            { device: "MOBILE", views: 810 },
            { device: "DESKTOP", views: 360 },
            { device: "TABLET", views: 70 },
          ],
        };
      },
      async countries() {
        return {
          countries: [
            { country: "United States", views: 540 },
            { country: "Canada", views: 210 },
            { country: "United Kingdom", views: 160 },
          ],
        };
      },
    },

    account: {
      async get() {
        const user = store().users.find((u) => u.id === me());
        if (!user) throw new ApiClientError("Not signed in");
        return {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          image: user.image ?? null,
          passkeys: user.passkeys,
        };
      },
      async changeEmail({ newEmail }) {
        const user = store().users.find((u) => u.id === me());
        if (user) user.email = newEmail;
        return { ok: true, otpSent: true };
      },
      async setAvatar({ image }) {
        const user = store().users.find((u) => u.id === me());
        if (user) user.image = image;
      },
      passkeys: {
        async list() {
          const user = store().users.find((u) => u.id === me());
          return { passkeys: user?.passkeys ?? [] };
        },
        async add({ name }) {
          const user = store().users.find((u) => u.id === me());
          user?.passkeys.push({ id: id("passkey"), name, createdAt: iso(new Date()), lastUsedAt: null });
        },
        async rename({ id: pkId, name }) {
          const user = store().users.find((u) => u.id === me());
          const pk = user?.passkeys.find((p) => p.id === pkId);
          if (pk) pk.name = name;
        },
        async remove({ id: pkId }) {
          const user = store().users.find((u) => u.id === me());
          if (user) user.passkeys = user.passkeys.filter((p) => p.id !== pkId);
        },
      },
    },

    async resolveKyteSummary(kyteId: string) {
      const kyte = store().kytes.find((k) => k.id === kyteId);
      return kyte ? summarize(kyte, me()) : null;
    },
  };
}

export function ensureUserByEmail(email: string): { userId: string; isNew: boolean } {
  const normalized = email.trim().toLowerCase();
  const existing = store().users.find((u) => u.email.toLowerCase() === normalized);
  if (existing) return { userId: existing.id, isNew: false };
  const userId = id("user");
  store().users.push({ id: userId, email: normalized, createdAt: iso(new Date()), passkeys: [] });
  return { userId, isNew: true };
}

export function userHasAnyKyte(userId: string): boolean {
  return store().kytes.some((kyte) => roleForKyte(userId, kyte) !== null);
}

function ensurePersonalOrg(userId: string, email: string): string {
  const existing = store().orgs.find((o) => o.personal && o.ownerUserId === userId);
  if (existing) return existing.id;
  const orgId = id("org");
  store().orgs.push({
    id: orgId,
    name: defaultOrgName(null, email),
    ownerUserId: userId,
    personal: true,
    members: [
      {
        membershipId: id("m"),
        userId,
        email,
        role: "OWNER",
        kyteAccess: "ALL",
        kyteGrants: [],
      },
    ],
  });
  return orgId;
}

export function createKyteForOnboarding(
  userId: string,
  email: string,
  username: string,
  draft: ProfileContent,
): string {
  const orgId = ensurePersonalOrg(userId, email);
  const kyteId = id("kyte");
  const normalized = username.trim().toLowerCase();
  store().kytes.push({
    id: kyteId,
    orgId,
    username: normalized,
    moderationStatus: "APPROVED",
    suspensionReason: null,
    published: true,
    updatedAt: iso(new Date()),
    draft,
    publishedContent: structuredClone(draft),
  });
  store().usernames.add(normalized);
  return kyteId;
}

export function mockProfileByUsername(username: string): {
  kyteId: string | null;
  content: ProfileContent | null;
  status: "APPROVED" | "SUSPENDED" | "NOT_FOUND";
  suspensionReason: string | null;
} {
  const kyte = createStore("solo").kytes.find(
    (k) => k.username === username.toLowerCase() && k.published && k.publishedContent,
  );
  if (!kyte || !kyte.publishedContent) {
    return { kyteId: null, content: null, status: "NOT_FOUND", suspensionReason: null };
  }
  return {
    kyteId: kyte.id,
    content: kyte.publishedContent,
    status: kyte.moderationStatus,
    suspensionReason: kyte.suspensionReason,
  };
}

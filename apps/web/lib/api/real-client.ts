import { emptyProfileContent, type ScheduleStatus } from "@kytelink/schemas";
import { realRegisterPasskey } from "../auth/auth-client";
import { getTrpcClient } from "./trpc";
import { ApiClientError, isAppCode, type AppErrorCode } from "./errors";
import type { ApiClient, UsernameCheck } from "./client-interface";
import type { KyteGet, KyteSummary, OrgSummary, ScheduleSummary } from "./types";

function toApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  const message = error instanceof Error ? error.message : "Something went wrong";
  let appCode: AppErrorCode | null = null;
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "appCode" in data) {
      const code = (data as { appCode?: unknown }).appCode;
      if (isAppCode(code)) appCode = code;
    }
  }
  // The API embeds the canonical LimitKey in the LIMIT_REACHED message
  // ("Limit reached for <key> (<n>)."); surface it as `detail` so the limit
  // modal can name the exact thing that was capped.
  const detail = appCode === "LIMIT_REACHED" ? (/Limit reached for (\w+)/.exec(message)?.[1] ?? null) : null;
  return new ApiClientError(message, appCode, detail);
}

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toApiError(error);
  }
}

function isoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function createRealClient(getCurrentUserId: () => string): ApiClient {
  const c = getTrpcClient();
  const me = () => getCurrentUserId();

  // The org.listMine contract omits the `personal` flag (05-auth lazily creates
  // one personal org per user). The best client-side signal is "the current
  // user owns it" — exact for the seeded solo/agent fixtures.
  function withPersonal(org: {
    id: string;
    name: string;
    role: OrgSummary["role"];
    kyteAccess: OrgSummary["kyteAccess"];
    ownerUserId: string;
    kytes: KyteSummary[];
  }): OrgSummary {
    return { ...org, personal: org.role === "OWNER" && org.ownerUserId === me() };
  }

  return {
    org: {
      listMine: () =>
        run(async () => {
          const { orgs } = await c.org.listMine.query();
          return { orgs: orgs.map(withPersonal) };
        }),
      create: ({ name }) => run(() => c.org.create.mutate({ name })),
      rename: ({ orgId, name }) =>
        run(async () => {
          await c.org.rename.mutate({ orgId, name });
        }),
      delete: ({ orgId, confirm }) =>
        run(async () => {
          await c.org.delete.mutate({ orgId, confirm });
        }),
      auditLog: ({ orgId, kyteId, action, actorUserId }) =>
        run(() => c.org.auditLog.query({ orgId, kyteId, action, actorUserId })),
      storage: ({ orgId }) => run(() => c.org.storage.query({ orgId })),
      leave: ({ orgId }) =>
        run(async () => {
          await c.team.leave.mutate({ orgId });
        }),
    },

    kyte: {
      get: ({ kyteId }) =>
        run(async () => {
          const k = await c.kyte.get.query({ kyteId });
          const result: KyteGet = {
            id: k.id,
            orgId: k.orgId,
            username: k.username,
            role: k.role,
            moderationStatus: k.moderationStatus,
            suspensionReason: k.suspensionReason,
            published: k.published,
            updatedAt: k.updatedAt,
            draft: k.draft,
            publishedContent: k.publishedContent,
            schedules: k.schedules.map((s) => ({
              id: s.id,
              kyteId: k.id,
              scheduledFor: s.scheduledFor,
              timezone: s.timezone,
              status: s.status as ScheduleStatus,
              createdBy: "",
              createdAt: k.updatedAt,
              snapshot: emptyProfileContent(),
            })),
          };
          return result;
        }),
      create: ({ orgId, username }) => run(() => c.kyte.create.mutate({ orgId, username })),
      updateDraft: ({ kyteId, content, baseUpdatedAt }) =>
        run(() => c.kyte.updateDraft.mutate({ kyteId, content, baseUpdatedAt: new Date(baseUpdatedAt) })),
      publish: ({ kyteId }) => run(() => c.kyte.publish.mutate({ kyteId })),
      checkUsername: ({ username, kyteId }) =>
        run(async (): Promise<UsernameCheck> => {
          const check = await c.kyte.checkUsername.query({ username, kyteId });
          // The contract omits server-side suggestions; the UI hides the list
          // when it is empty, so an empty array is a clean degradation.
          return { available: check.available, reason: check.reason, suggestions: [] };
        }),
      changeUsername: ({ kyteId, username }) =>
        run(async () => {
          await c.kyte.changeUsername.mutate({ kyteId, username });
        }),
      delete: ({ kyteId, confirm }) =>
        run(async () => {
          await c.kyte.delete.mutate({ kyteId, confirm });
        }),
    },

    team: {
      members: ({ orgId }) => run(() => c.team.members.query({ orgId })),
      invite: ({ orgId, email, role, kyteAccess, kyteGrants }) =>
        run(() => c.team.invite.mutate({ orgId, email, role, kyteAccess, kyteGrants })),
      revokeInvite: ({ inviteId }) =>
        run(async () => {
          await c.team.revokeInvite.mutate({ inviteId });
        }),
      updateAccess: ({ orgId, membershipId, role, kyteAccess, kyteGrants }) =>
        run(async () => {
          await c.team.updateAccess.mutate({ orgId, membershipId, role, kyteAccess, kyteGrants });
        }),
      removeMember: ({ orgId, membershipId }) =>
        run(async () => {
          await c.team.removeMember.mutate({ orgId, membershipId });
        }),
    },

    invites: {
      listMine: () =>
        run(async () => {
          const { invites } = await c.invites.listMine.query();
          return {
            invites: invites.map((i) => ({
              id: i.id,
              orgId: i.orgId,
              orgName: i.orgName,
              role: i.role,
              status: i.status,
              invitedByEmail: i.invitedByEmail,
              invitedEmail: "",
              expiresAt: i.expiresAt,
            })),
          };
        }),
      accept: ({ inviteId }) => run(() => c.invites.accept.mutate({ inviteId })),
      decline: ({ inviteId }) =>
        run(async () => {
          await c.invites.decline.mutate({ inviteId });
        }),
    },

    domains: {
      list: ({ kyteId }) => run(() => c.domains.list.query({ kyteId })),
      add: ({ kyteId, host }) => run(() => c.domains.add.mutate({ kyteId, host })),
      status: ({ domainId }) => run(() => c.domains.status.query({ domainId })),
      verify: ({ domainId }) => run(() => c.domains.verify.mutate({ domainId })),
      remove: ({ domainId }) =>
        run(async () => {
          await c.domains.remove.mutate({ domainId });
        }),
    },

    schedule: {
      list: ({ kyteId }) =>
        run(async () => {
          const { schedules } = await c.schedule.list.query({ kyteId });
          // The contract strips `snapshot`/`createdBy`; fill an empty content so
          // the mini-preview renders instead of crashing.
          const mapped: ScheduleSummary[] = schedules.map((s) => ({
            id: s.id,
            kyteId: s.kyteId,
            scheduledFor: s.scheduledFor,
            timezone: s.timezone,
            status: s.status,
            createdBy: "",
            createdAt: s.createdAt,
            snapshot: emptyProfileContent(),
          }));
          return { schedules: mapped };
        }),
      create: ({ kyteId, scheduledFor, timezone }) =>
        run(() => c.schedule.create.mutate({ kyteId, scheduledFor: new Date(scheduledFor), timezone })),
      updateSnapshot: ({ scheduleId }) =>
        run(async () => {
          await c.schedule.updateSnapshot.mutate({ scheduleId });
        }),
      reschedule: ({ scheduleId, scheduledFor, timezone }) =>
        run(async () => {
          await c.schedule.reschedule.mutate({ scheduleId, scheduledFor: new Date(scheduledFor), timezone });
        }),
      cancel: ({ scheduleId }) =>
        run(async () => {
          await c.schedule.cancel.mutate({ scheduleId });
        }),
    },

    preview: {
      ensure: ({ kyteId }) =>
        run(async () => {
          const result = await c.preview.ensure.mutate({ kyteId });
          return { ...result, expiresAt: isoString(result.expiresAt) };
        }),
      rotate: ({ kyteId }) =>
        run(async () => {
          const result = await c.preview.rotate.mutate({ kyteId });
          return { ...result, expiresAt: isoString(result.expiresAt) };
        }),
      // Passcode verification is an HMAC-signed, server-only internal call; the
      // /p/[token] page performs it in getServerSideProps. This client
      // path is unused against the real API.
      verify: () => Promise.resolve(null),
    },

    import: {
      fromUrl: ({ kyteId, url }) => run(() => c.import.fromUrl.mutate({ kyteId, url })),
    },

    assets: {
      createUploadUrl: ({ kyteId, kind, contentType, sizeBytes }) =>
        run(() => c.assets.createUploadUrl.mutate({ kyteId, kind, contentType, sizeBytes })),
      finalize: ({ assetId }) => run(() => c.assets.finalize.mutate({ assetId })),
    },

    analytics: {
      overview: (input) => run(() => c.analytics.overview.query(input)),
      timeSeries: (input) => run(() => c.analytics.timeSeries.query(input)),
      topLinks: (input) => run(() => c.analytics.topLinks.query(input)),
      referrers: (input) => run(() => c.analytics.referrers.query(input)),
      devices: (input) => run(() => c.analytics.devices.query(input)),
      countries: (input) => run(() => c.analytics.countries.query(input)),
    },

    account: {
      get: () =>
        run(async () => {
          const info = await c.account.get.query();
          return {
            id: info.id,
            email: info.email,
            createdAt: info.createdAt,
            image: info.image,
            passkeys: info.passkeys,
          };
        }),
      changeEmail: ({ newEmail }) => run(() => c.account.changeEmail.mutate({ newEmail })),
      setAvatar: ({ image }) =>
        run(async () => {
          await c.account.setAvatar.mutate({ image });
        }),
      passkeys: {
        list: () => run(() => c.account.passkeys.list.query()),
        add: ({ name }) => realRegisterPasskey(name),
        rename: ({ id, name }) =>
          run(async () => {
            await c.account.passkeys.rename.mutate({ id, name });
          }),
        remove: ({ id }) =>
          run(async () => {
            await c.account.passkeys.remove.mutate({ id });
          }),
      },
    },

    resolveKyteSummary: (kyteId) =>
      run(async () => {
        const { orgs } = await c.org.listMine.query();
        for (const org of orgs) {
          const found = org.kytes.find((k) => k.id === kyteId);
          if (found) return found;
        }
        return null;
      }),
  };
}

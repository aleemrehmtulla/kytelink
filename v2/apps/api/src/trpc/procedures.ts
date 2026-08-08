import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  accountSuspended,
  adminProcedure,
  authedProcedure,
  kyteProcedure,
  kyteSuspended,
  middleware,
} from "@kytelink/trpc";
import { isKyteEffectivelySuspended, isUserSuspended } from "@kytelink/schemas";
import { getConfig } from "../config";
import {
  suspendedAccountMessage,
  suspendedKyteMessage,
  suspendedOrgMessage,
} from "../moderation/appeal-copy";
import { getStore } from "./context-ext";
import { resolveKyteAccess } from "./permissions";
import { enforceRateLimit, isRedisLike, RedisRateLimiter } from "./rate-limit";
import type { Store } from "../store/store";

const rateLimit = middleware(async ({ ctx, next, type }) => {
  if (isRedisLike(ctx.redis) && ctx.user) {
    const limiter = new RedisRateLimiter(ctx.redis);
    const className = type === "mutation" ? "trpc-write" : "trpc-read";
    await enforceRateLimit(limiter, className, { user: ctx.user.id }, { failOpen: true });
  }
  return next();
});

/**
 * A read-only grant is the default shape of an impersonated session: the admin
 * sees exactly what the user sees and cannot change anything on their behalf.
 * Full-access grants skip this and are audited as such at the start.
 */
const readOnlyImpersonation = middleware(({ ctx, next, type }) => {
  if (type === "mutation" && ctx.impersonation?.readOnly) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You're viewing this account read-only — exit the session to make changes.",
    });
  }
  return next();
});

/**
 * Suspension is read-only, never a lockout: the account still signs in, still
 * reads everything, and simply cannot write. Queries pass untouched, so the
 * person can see their own data, the recorded reason, and the appeal link.
 */
const accountReadOnly = middleware(async ({ ctx, next, type }) => {
  if (type === "mutation" && ctx.session && isUserSuspended(ctx.session.status)) {
    const user = await getStore(ctx).userById(ctx.session.userId);
    throw accountSuspended(suspendedAccountMessage(user?.statusReason ?? null));
  }
  return next();
});

interface ScopeInput {
  kyteId?: string;
  orgId?: string;
  scheduleId?: string;
  domainId?: string;
  inviteId?: string;
}

async function resolveScope(
  store: Store,
  input: ScopeInput,
): Promise<{ kyteId?: string; orgId?: string }> {
  if (input.kyteId || input.orgId) return { kyteId: input.kyteId, orgId: input.orgId };
  if (input.scheduleId) {
    const row = await store.getSchedule(input.scheduleId);
    if (row) return { kyteId: row.kyteId };
  }
  if (input.domainId) {
    const row = await store.getDomain(input.domainId);
    if (row) return { kyteId: row.kyteId };
  }
  if (input.inviteId) {
    const row = await store.getInviteById(input.inviteId);
    if (row) return { orgId: row.orgId };
  }
  return {};
}

const accessInputSchema = z.object({
  kyteId: z.string().min(1).optional(),
  orgId: z.string().min(1).optional(),
  scheduleId: z.string().min(1).optional(),
  domainId: z.string().min(1).optional(),
  inviteId: z.string().min(1).optional(),
});

export const authed = authedProcedure
  .use(rateLimit)
  .use(readOnlyImpersonation)
  .use(accountReadOnly)
  .use(({ ctx, next }) => next({ ctx: { store: getStore(ctx), config: getConfig() } }));

export const kyte = kyteProcedure
  .use(rateLimit)
  .use(readOnlyImpersonation)
  .use(accountReadOnly)
  .use(({ ctx, next }) => next({ ctx: { store: getStore(ctx), config: getConfig() } }))
  .use(async ({ ctx, next, getRawInput, type }) => {
    const parsed = accessInputSchema.safeParse(await getRawInput());
    const input = parsed.success ? parsed.data : {};
    const scope = await resolveScope(ctx.store, input);
    const access = await resolveKyteAccess(ctx.store, ctx.user, scope);

    if (type === "mutation") {
      // An org suspension makes the whole org read-only, kytes included, so it
      // is checked even for org-scoped mutations that name no kyte.
      if (access.org.suspendedAt !== null) {
        throw kyteSuspended(suspendedOrgMessage(access.org.suspensionReason, access.org.id));
      }
      if (
        access.kyte &&
        isKyteEffectivelySuspended({
          moderationStatus: access.kyte.moderationStatus,
          orgSuspendedAt: access.org.suspendedAt,
        })
      ) {
        throw kyteSuspended(
          suspendedKyteMessage(
            await ctx.store.latestModerationReason(access.kyte.id),
            access.kyte.username,
          ),
        );
      }
    }

    return next({ ctx: { access } });
  });

export const admin = adminProcedure
  .use(rateLimit)
  .use(({ ctx, next }) => next({ ctx: { store: getStore(ctx), config: getConfig() } }))
  .use(({ ctx, next }) => {
    if (!ctx.config.adminEmails.has(ctx.user.email.trim().toLowerCase())) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access requires an allow-listed ADMIN_EMAILS address.",
      });
    }
    return next();
  });

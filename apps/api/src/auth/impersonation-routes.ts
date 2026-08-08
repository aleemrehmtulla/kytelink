import type { FastifyInstance, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import { getDb } from "@kytelink/db";
import { getConfig } from "../config";
import { recordAdminAction } from "../admin/admin-audit";
import { getRealStore } from "../store/instance";
import { getAuth } from "./auth";
import {
  clearImpersonationCookie,
  IMPERSONATION_TTL_MS,
  isAdminOrigin,
  newGrant,
  readGrant,
  setImpersonationCookie,
} from "./impersonation";

const startInput = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
  readOnly: z.boolean(),
});

interface Actor {
  id: string;
  email: string;
}

/**
 * Resolves the *real* signed-in account. This deliberately reads better-auth's
 * own session cookie, which is never rewritten by impersonation — the admin is
 * still themselves underneath, which is what makes "stop" a cookie delete
 * rather than a re-authentication.
 */
async function resolveAdmin(req: FastifyRequest): Promise<Actor | null> {
  const config = getConfig();
  const resolved = await getAuth().api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!resolved?.user) return null;
  const email = resolved.user.email.trim().toLowerCase();
  if (!config.adminEmails.has(email)) return null;
  const dbUser = await getDb().user.findUnique({
    where: { id: resolved.user.id },
    select: { id: true, email: true, role: true },
  });
  if (!dbUser || dbUser.role !== "ADMIN") return null;
  return { id: dbUser.id, email: dbUser.email };
}

export function registerImpersonationRoutes(app: FastifyInstance): void {
  app.post("/auth/impersonate/start", async (req, reply) => {
    const config = getConfig();
    // Starting a session is an admin-app-only action. A browser always sends
    // Origin on a cross-site POST, so this closes the door on any other page
    // riding the admin's cookie.
    if (req.headers.origin !== undefined && !isAdminOrigin(req, config)) {
      await reply.status(403).send({ error: "FORBIDDEN", message: "Wrong origin." });
      return;
    }

    const actor = await resolveAdmin(req);
    if (!actor) {
      await reply.status(403).send({ error: "FORBIDDEN", message: "Admin access required." });
      return;
    }

    const parsed = startInput.safeParse(req.body);
    if (!parsed.success) {
      await reply
        .status(400)
        .send({ error: "BAD_REQUEST", message: "A user and a reason of at least 3 characters are required." });
      return;
    }
    const input = parsed.data;

    if (input.userId === actor.id) {
      await reply
        .status(400)
        .send({ error: "BAD_REQUEST", message: "You're already signed in as yourself." });
      return;
    }

    const target = await getDb().user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, name: true, role: true },
    });
    if (!target) {
      await reply.status(404).send({ error: "NOT_FOUND", message: "User not found." });
      return;
    }
    if (target.role === "ADMIN" || config.adminEmails.has(target.email.trim().toLowerCase())) {
      await reply.status(403).send({
        error: "FORBIDDEN",
        message: "Platform admins can't be impersonated.",
      });
      return;
    }
    const grant = newGrant({
      adminUserId: actor.id,
      adminEmail: actor.email,
      userId: target.id,
      readOnly: input.readOnly,
    });

    await recordAdminAction(getRealStore(), actor, {
      action: "admin.user.impersonate.start",
      summary: `Started ${input.readOnly ? "a read-only" : "a full-access"} session as ${target.email}`,
      reason: input.reason,
      meta: {
        targetUserId: target.id,
        targetEmail: target.email,
        readOnly: input.readOnly,
        impersonationSessionId: grant.sessionId,
        expiresAt: new Date(grant.expiresAt).toISOString(),
      },
    });

    setImpersonationCookie(reply, grant);
    await reply.send({
      ok: true,
      // The signed-in home, not the web root: `/` is the marketing redirect for
      // a browser with no local session, and this tab deliberately has none.
      url: `${config.webBaseUrl}/home`,
      expiresAt: new Date(grant.expiresAt).toISOString(),
      readOnly: input.readOnly,
      ttlMinutes: Math.round(IMPERSONATION_TTL_MS / 60_000),
      user: { id: target.id, email: target.email, name: target.name },
    });
  });

  // Callable from either app and from an already-expired cookie: stopping must
  // always succeed, so a stuck session is never a support problem of its own.
  app.post("/auth/impersonate/stop", async (req, reply) => {
    const grant = readGrant(req);
    clearImpersonationCookie(reply);
    if (grant) {
      const target = await getDb().user.findUnique({
        where: { id: grant.userId },
        select: { email: true },
      });
      await recordAdminAction(
        getRealStore(),
        { id: grant.adminUserId, email: grant.adminEmail },
        {
          action: "admin.user.impersonate.stop",
          summary: `Ended the session as ${target?.email ?? grant.userId}`,
          meta: {
            targetUserId: grant.userId,
            targetEmail: target?.email ?? null,
            readOnly: grant.readOnly,
            impersonationSessionId: grant.sessionId,
          },
        },
      );
    }
    await reply.send({ ok: true });
  });

  app.get("/auth/impersonate/status", async (req, reply) => {
    const grant = readGrant(req);
    if (!grant) {
      await reply.send({ active: false });
      return;
    }
    // A grant outlives neither the admin's own session nor the target account —
    // report it inactive rather than showing a banner for a session that the
    // tRPC context is already refusing to honour.
    const actor = await resolveAdmin(req);
    if (!actor || actor.id !== grant.adminUserId) {
      await reply.send({ active: false });
      return;
    }
    const target = await getDb().user.findUnique({
      where: { id: grant.userId },
      select: { id: true, email: true, name: true },
    });
    if (!target) {
      await reply.send({ active: false });
      return;
    }
    await reply.send({
      active: true,
      readOnly: grant.readOnly,
      expiresAt: new Date(grant.expiresAt).toISOString(),
      adminEmail: grant.adminEmail,
      user: { id: target.id, email: target.email, name: target.name },
    });
  });
}

import { getClickhouse } from "@kytelink/clickhouse";
import { getDb } from "@kytelink/db";
import type { ImpersonationInfo, SessionInfo, TrpcContext } from "@kytelink/trpc";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";
import { getAuth } from "./auth/auth";
import { resolveImpersonation } from "./auth/impersonation";
import { getConfig } from "./config";
import { taggedLogger } from "./logger";
import { noteRequestActor } from "./log/request-log";
import { getRedis } from "./redis";
import { getRealStore } from "./store/instance";

const log = taggedLogger("auth");
const procedureLog = taggedLogger("trpc");

export async function createTrpcContext({ req }: { req: FastifyRequest }): Promise<TrpcContext> {
  const config = getConfig();
  let session: SessionInfo | null = null;
  let user: { id: string; email: string } | null = null;
  let impersonation: ImpersonationInfo | null = null;

  try {
    const resolved = await getAuth().api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (resolved?.user) {
      let dbUser = await getDb().user.findUnique({ where: { id: resolved.user.id } });
      const email = resolved.user.email.trim().toLowerCase();

      user = { id: resolved.user.id, email: resolved.user.email };
      // ADMIN_EMAILS grants platform ADMIN (documented in .env.example). The
      // promotion happens lazily here so it also covers accounts created
      // before the email was allow-listed. Removal from ADMIN_EMAILS revokes
      // access via the isAdmin conjunction below — no demotion write needed.
      if (dbUser && dbUser.role !== "ADMIN" && config.adminEmails.has(email)) {
        dbUser = await getDb().user.update({
          where: { id: dbUser.id },
          data: { role: "ADMIN" },
        });
        log.info({ email }, "promoted to platform ADMIN — this address is in ADMIN_EMAILS");
      }
      // A SUSPENDED account keeps a perfectly valid session — suspension is
      // read-only, not a lockout, so the person can still read their data and
      // find the reason and the appeal link. Enforcement is in the mutation
      // guards (trpc/procedures.ts), which read this status.
      session = {
        userId: resolved.user.id,
        email: resolved.user.email,
        isAdmin: dbUser?.role === "ADMIN" && config.adminEmails.has(email),
        status: dbUser?.status ?? "ACTIVE",
      };

      // From here on the request *is* the impersonated user — every procedure
      // sees their id, their orgs, their limits. ctx.impersonation is the only
      // trace, and it forces isAdmin off (see resolveImpersonation).
      const swap = await resolveImpersonation(req, session);
      if (swap) {
        impersonation = swap.info;
        session = swap.session;
        user = swap.user;
        log.debug(
          { adminUserId: swap.info.adminUserId, targetUserId: swap.user.id },
          "this request runs as an impersonated user — isAdmin is forced off",
        );
      }
      // Puts a name on this request's log line, so the log answers "who did
      // this?" without correlating ids by hand.
      noteRequestActor(req, impersonation ? `${impersonation.adminEmail} as ${user.email}` : user.email);
    }
  } catch (error) {
    log.warn(
      { err: error },
      "could not resolve a session — continuing as a signed-out request",
    );
  }

  return {
    session,
    user,
    impersonation,
    ip: req.ip,
    redis: getRedis(),
    db: getRealStore(),
    ch: getClickhouse(),
    log: procedureLog,
  };
}

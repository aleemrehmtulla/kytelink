import type { FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { getDb } from "@kytelink/db";
import { getConfig } from "../config";
import { getAuth } from "./auth";

export interface AdminActor {
  id: string;
  email: string;
}

/**
 * Resolves the *real* signed-in account. This deliberately reads better-auth's
 * own session cookie, which is never rewritten by impersonation — the admin is
 * still themselves underneath, so an impersonating admin keeps admin-only
 * routes and "stop" stays a cookie delete rather than a re-authentication.
 */
export async function resolveAdminActor(req: FastifyRequest): Promise<AdminActor | null> {
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

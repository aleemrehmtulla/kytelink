import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { ImpersonationInfo, SessionInfo } from "@kytelink/trpc";
import { getDb } from "@kytelink/db";
import type { ApiConfig } from "../config";
import { getConfig } from "../config";
import { authCookieScope } from "./cookie-scope";

export const IMPERSONATION_TTL_MS = 30 * 60 * 1000;

/**
 * Domain separator so the grant HMAC can never be confused with — or replayed
 * against — anything else signed with AUTH_SECRET.
 */
const GRANT_PREFIX = "kyte.impersonate.v1:";

export interface ImpersonationGrant {
  /** The admin who opened the session. The grant is only honoured for *their* session. */
  adminUserId: string;
  adminEmail: string;
  userId: string;
  readOnly: boolean;
  expiresAt: number;
  /** Correlates the start and stop audit rows. */
  sessionId: string;
}

export function impersonationCookieName(config: ApiConfig = getConfig()): string {
  return `${config.agentMode ? "kyte_agent" : "kyte"}.impersonation`;
}

function secret(): string {
  return process.env.AUTH_SECRET ?? "";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(`${GRANT_PREFIX}${payload}`).digest("base64url");
}

export function encodeGrant(grant: ImpersonationGrant): string {
  const payload = Buffer.from(JSON.stringify(grant), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeGrant(token: string | undefined, now: number = Date.now()): ImpersonationGrant | null {
  if (!token || !secret()) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = token.slice(0, separator);
  const provided = Buffer.from(token.slice(separator + 1), "utf8");
  const expected = Buffer.from(sign(payload), "utf8");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const grant = parsed as ImpersonationGrant;
    if (
      typeof grant.adminUserId !== "string" ||
      typeof grant.adminEmail !== "string" ||
      typeof grant.userId !== "string" ||
      typeof grant.readOnly !== "boolean" ||
      typeof grant.expiresAt !== "number" ||
      typeof grant.sessionId !== "string"
    ) {
      return null;
    }
    return grant.expiresAt > now ? grant : null;
  } catch {
    return null;
  }
}

export function newGrant(input: {
  adminUserId: string;
  adminEmail: string;
  userId: string;
  readOnly: boolean;
  now?: number;
}): ImpersonationGrant {
  return {
    adminUserId: input.adminUserId,
    adminEmail: input.adminEmail,
    userId: input.userId,
    readOnly: input.readOnly,
    expiresAt: (input.now ?? Date.now()) + IMPERSONATION_TTL_MS,
    sessionId: randomUUID(),
  };
}

export function setImpersonationCookie(reply: FastifyReply, grant: ImpersonationGrant): void {
  const config = getConfig();
  const scope = authCookieScope(config);
  reply.setCookie(impersonationCookieName(config), encodeGrant(grant), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: Math.floor(IMPERSONATION_TTL_MS / 1000),
    ...scope,
  });
}

export function clearImpersonationCookie(reply: FastifyReply): void {
  const config = getConfig();
  const scope = authCookieScope(config);
  reply.clearCookie(impersonationCookieName(config), { path: "/", ...scope });
}

export function readGrant(req: FastifyRequest): ImpersonationGrant | null {
  return decodeGrant(req.cookies[impersonationCookieName()]);
}

function originOf(req: FastifyRequest): string | null {
  const origin = req.headers.origin;
  return typeof origin === "string" && origin.length > 0 ? origin : null;
}

export function isAdminOrigin(req: FastifyRequest, config: ApiConfig): boolean {
  const origin = originOf(req);
  return origin !== null && config.adminOrigins.includes(origin);
}

/**
 * Impersonation is scoped to the product surface: the admin app keeps its own
 * full-strength admin identity in the very same browser, because the cookie is
 * only honoured for requests coming from a web origin. Without this an admin
 * who started a session would find the admin dashboard locked out of itself.
 */
function isImpersonatableOrigin(req: FastifyRequest, config: ApiConfig): boolean {
  const origin = originOf(req);
  return origin !== null && config.allowedOrigins.includes(origin);
}

export interface ImpersonationSwap {
  info: ImpersonationInfo;
  session: SessionInfo;
  user: { id: string; email: string };
}

/**
 * Turns a valid grant into the identity a request should run as. Every hop is
 * re-checked per request, so revoking access is just a matter of the admin
 * signing out or losing ADMIN_EMAILS — no stored impersonation session can
 * outlive either.
 */
export async function resolveImpersonation(
  req: FastifyRequest,
  session: SessionInfo,
): Promise<ImpersonationSwap | null> {
  const config = getConfig();
  if (!isImpersonatableOrigin(req, config)) return null;

  const grant = readGrant(req);
  if (!grant) return null;
  // The grant is bound to the admin session that minted it: a leaked cookie is
  // inert in anyone else's browser.
  if (grant.adminUserId !== session.userId || !session.isAdmin) return null;

  const target = await getDb().user.findUnique({
    where: { id: grant.userId },
    select: { id: true, email: true, status: true, role: true },
  });
  if (!target || target.role === "ADMIN") return null;

  return {
    info: {
      adminUserId: grant.adminUserId,
      adminEmail: grant.adminEmail,
      readOnly: grant.readOnly,
      expiresAt: new Date(grant.expiresAt).toISOString(),
    },
    session: { userId: target.id, email: target.email, isAdmin: false, status: target.status },
    user: { id: target.id, email: target.email },
  };
}

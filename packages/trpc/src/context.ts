import type { Clickhouse } from "@kytelink/clickhouse";
import type { UserStatus } from "@kytelink/schemas";

export interface SessionInfo {
  userId: string;
  email: string;
  isAdmin: boolean;
  // A SUSPENDED account signs in normally and keeps a valid session — the
  // status rides along so mutation guards can make it read-only instead.
  status: UserStatus;
}

export interface AuthedUser {
  id: string;
  email: string;
}

/**
 * Present only while an admin is viewing the product as another account. The
 * context's `session`/`user` are already the *impersonated* user by the time a
 * procedure runs — this is the record of who is really driving, so a mutation
 * can be refused (read-only grants) and `isAdmin` can never be true.
 */
export interface ImpersonationInfo {
  adminUserId: string;
  adminEmail: string;
  readOnly: boolean;
  expiresAt: string;
}

// Deliberately opaque so this package never depends on Prisma/ioredis/pino;
// apps/api narrows them to the concrete clients when it builds the context.
type DatabaseClient = unknown;
type RedisClient = unknown;
export type Logger = unknown;

export interface TrpcContext {
  session: SessionInfo | null;
  user: AuthedUser | null;
  impersonation?: ImpersonationInfo | null;
  ip: string;
  redis: RedisClient;
  db: DatabaseClient;
  ch: Clickhouse;
  log: Logger;
}

export interface AuthedTrpcContext extends TrpcContext {
  session: SessionInfo;
  user: AuthedUser;
}

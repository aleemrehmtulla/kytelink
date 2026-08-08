import type { AuditAction } from "@kytelink/schemas";
import type { Store } from "../store/store";

export interface AdminAuditActor {
  id: string;
  email: string;
}

export interface AdminAuditEntry {
  action: AuditAction;
  /** Human sentence without the reason — the reason is appended here, once. */
  summary: string;
  reason?: string;
  orgId?: string | null;
  kyteId?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * The single writer for every `admin.*` audit row. Every admin mutation funnels
 * through here so the actor, the reason, and the org/kyte scope can never be
 * recorded inconsistently between two call sites.
 */
export async function recordAdminAction(
  store: Store,
  actor: AdminAuditActor,
  entry: AdminAuditEntry,
): Promise<void> {
  const reason = entry.reason?.trim();
  await store.writeAdminAudit({
    action: entry.action,
    actorUserId: actor.id,
    summary: reason ? `${entry.summary} — ${reason}` : entry.summary,
    orgId: entry.orgId ?? null,
    kyteId: entry.kyteId ?? null,
    meta: {
      actorEmail: actor.email,
      ...(reason ? { reason } : {}),
      ...entry.meta,
    },
  });
}

/**
 * How a custom domain becomes live differs by deployment, so it sits behind a
 * seam (25-selfhost.md's capability model).
 *
 * - `vercel` — the hosted path. Registering the domain on the Vercel project is
 *   what makes the edge accept that Host header AND provision its certificate;
 *   DNS alone does nothing, because Vercel 404s any host not on the project.
 * - `proxy` — the self-host path. The operator's reverse proxy terminates TLS
 *   on demand (see SELF-HOSTING.md), so there is nothing to register: a DNS
 *   lookup against the expected records is the whole check.
 */
export type DomainConnectionState = "CONNECTED" | "PENDING" | "ERROR";

export interface DomainProvider {
  readonly kind: "vercel" | "proxy";
  /** Register the host so the edge will serve it. No-op where DNS is sufficient. */
  attach(host: string): Promise<void>;
  /** Release the host. Must be idempotent — the reaper calls it on already-gone domains. */
  detach(host: string): Promise<void>;
  status(host: string): Promise<DomainConnectionState>;
}

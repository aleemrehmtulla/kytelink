import type { Logger } from "pino";
import type { DomainConnectionState, DomainProvider } from "./provider";
import { isApex, wwwOf } from "./records";

const API_BASE = "https://api.vercel.com";
const REQUEST_TIMEOUT_MS = 10_000;

export interface VercelConfig {
  token: string;
  team: string;
  project: string;
}

interface VercelDomainConfig {
  misconfigured?: boolean;
  error?: { code?: string; message?: string };
}

async function call(
  config: VercelConfig,
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ status: number; json: unknown }> {
  const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}teamId=${encodeURIComponent(config.team)}`;
  const response = await fetch(url, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json: unknown = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

/**
 * Hosted path. Ports v1's `controllers/vercel.ts` with typed errors and the
 * apex/www pairing v1 did in its API route: adding a bare domain also adds
 * `www.`, so a visitor typing either lands somewhere real. Removal mirrors it.
 */
export function createVercelDomainProvider(
  config: VercelConfig,
  log: Pick<Logger, "warn" | "info">,
): DomainProvider {
  async function attachOne(host: string): Promise<void> {
    const { status, json } = await call(config, `/v10/projects/${config.project}/domains`, {
      method: "POST",
      body: { name: host },
    });
    // 409 means it is already on the project — the desired end state, so succeed.
    if (status === 409) return;
    if (status >= 400) {
      const detail = (json as VercelDomainConfig).error?.message ?? `HTTP ${status}`;
      throw new Error(`Vercel rejected domain ${host}: ${detail}`);
    }
  }

  async function detachOne(host: string): Promise<void> {
    const { status } = await call(
      config,
      `/v9/projects/${config.project}/domains/${encodeURIComponent(host)}`,
      { method: "DELETE" },
    );
    // 404 = already gone. Detach must be idempotent for the reaper.
    if (status >= 400 && status !== 404) {
      log.warn({ host, status }, "vercel refused to detach this domain — clean it up by hand");
    }
  }

  return {
    kind: "vercel",

    async attach(host) {
      await attachOne(host);
      if (isApex(host)) {
        try {
          await attachOne(wwwOf(host));
        } catch (error) {
          // The apex is what the user asked for and it succeeded; a www failure
          // (already claimed on another project, say) must not fail the add.
          log.warn(
            { host, www: wwwOf(host), err: error },
            "attached the apex but not its www — visitors on www will not reach this kyte",
          );
        }
      }
    },

    async detach(host) {
      await detachOne(host);
      if (isApex(host)) await detachOne(wwwOf(host));
    },

    async status(host): Promise<DomainConnectionState> {
      const { status, json } = await call(
        config,
        `/v6/domains/${encodeURIComponent(host)}/config`,
        { method: "GET" },
      );
      if (status >= 400) return "ERROR";
      const config_ = json as VercelDomainConfig;
      if (config_.error) return "ERROR";
      return config_.misconfigured === false ? "CONNECTED" : "PENDING";
    },
  };
}

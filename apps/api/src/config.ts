import {
  type Capabilities,
  computeCapabilities,
  parseBoolEnv,
} from "@kytelink/schemas";

const PROCESS_ROLES = ["server", "worker", "all"] as const;
type ProcessRole = (typeof PROCESS_ROLES)[number];

export interface ApiConfig {
  processRole: ProcessRole;
  agentMode: boolean;
  mockProviders: boolean;
  nodeEnv: string;
  capabilities: Capabilities;
  adminEmails: Set<string>;
  allowedOrigins: string[];
  adminOrigins: string[];
  landingOrigin: string | null;
  webBaseUrl: string;
  apiBaseUrl: string;
  internalApiSecret: string;
}

function parseProcessRole(value: string | undefined): ProcessRole {
  const normalized = (value ?? "all").trim().toLowerCase();
  return (PROCESS_ROLES as readonly string[]).includes(normalized)
    ? (normalized as ProcessRole)
    : "all";
}

const AGENT_ADMIN_EMAIL = "agent-admin@kytelink.dev";
// Agent mode (refused in production) runs on port+1000; dev on the base ports.
const AGENT_ADMIN_ORIGINS = ["http://localhost:4002", "http://localhost:3002"];

function parseAdminEmails(value: string | undefined, agentMode: boolean): Set<string> {
  const emails = new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
  if (agentMode) emails.add(AGENT_ADMIN_EMAIL);
  return emails;
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const webBaseUrl = env.WEB_BASE_URL ?? "http://localhost:3000";
  const apiBaseUrl = env.API_BASE_URL ?? "http://localhost:3003";
  const agentMode = parseBoolEnv(env.AGENT_MODE);
  const landingOrigin = originOf(env.LANDING_ZONE_URL);
  const webOrigin = originOf(webBaseUrl);
  // Dev default mirrors webBaseUrl/apiBaseUrl above; production must set
  // ADMIN_BASE_URL explicitly or admin-app CORS stays closed (a localhost
  // origin must never be allowed against a hosted API).
  const adminOrigin =
    originOf(env.ADMIN_BASE_URL) ?? (nodeEnv === "production" ? null : "http://localhost:3002");

  const allowedOrigins = [webOrigin].filter((origin): origin is string => origin !== null);
  const adminOrigins = [adminOrigin, ...(agentMode ? AGENT_ADMIN_ORIGINS : [])].filter(
    (origin): origin is string => origin !== null,
  );

  return {
    processRole: parseProcessRole(env.PROCESS_ROLE),
    agentMode,
    mockProviders: parseBoolEnv(env.AUTH_MOCK_PROVIDERS),
    nodeEnv,
    capabilities: computeCapabilities(env),
    adminEmails: parseAdminEmails(env.ADMIN_EMAILS, agentMode),
    allowedOrigins,
    adminOrigins,
    landingOrigin,
    webBaseUrl,
    apiBaseUrl,
    internalApiSecret: env.INTERNAL_API_SECRET ?? "",
  };
}

let cached: ApiConfig | null = null;

export function getConfig(): ApiConfig {
  cached ??= loadConfig();
  return cached;
}

export function setConfigForTest(config: ApiConfig): void {
  cached = config;
}

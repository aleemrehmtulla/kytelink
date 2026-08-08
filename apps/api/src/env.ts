import {
  type Capabilities,
  computeCapabilities,
  isAgentModeProductionConflict,
  pointsAtVercelEdge,
  requiredEnvSchema,
} from "@kytelink/schemas";
import { isKnownProvider } from "./domains";
import { taggedLogger } from "./logger";

const log = taggedLogger("boot");

/** What to set to turn each optional capability on, named on the boot line. */
const CAPABILITY_SWITCHES: Record<keyof Capabilities, string> = {
  analytics: "CLICKHOUSE_URL",
  uploads: "AWS_ENDPOINT_URL + AWS_S3_BUCKET",
  emailDelivery: "EMAIL_PROVIDER=resend|smtp",
  moderation: "MODERATION_PROVIDER=openai + OPENAI_API_KEY",
  oauthGoogle: "GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET",
  oauthGithub: "GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET",
  domains: "CUSTOM_DOMAIN_CNAME_TARGET, or DOMAIN_PROVIDER=vercel + VERCEL_TOKEN",
};

const REQUIRED_VAR_DOCS: Record<string, string> = {
  DATABASE_URL: "Postgres connection string — see SELF-HOSTING.md#postgres",
  REDIS_URL: "Redis connection string — see SELF-HOSTING.md#redis",
  AUTH_SECRET: "Random 32+ byte secret — generate with `openssl rand -hex 32`",
  INTERNAL_API_SECRET: "Shared HMAC secret for /internal/* routes between services",
  WEB_BASE_URL: "Public URL of apps/web, e.g. http://localhost:3000",
  API_BASE_URL: "Public URL of this API, e.g. http://localhost:3003",
  LANDING_ZONE_URL: "Public URL of apps/landing, e.g. http://localhost:3001",
};

export class EnvValidationError extends Error {}

/**
 * Explains the two domain configurations that are wrong rather than merely
 * absent, so the operator sees a cause instead of just "domains is off".
 */
function warnDomainMisconfiguration(env: NodeJS.ProcessEnv): void {
  if (!isKnownProvider(env.DOMAIN_PROVIDER)) {
    log.warn(
      `DOMAIN_PROVIDER="${env.DOMAIN_PROVIDER ?? ""}" is not recognised — falling back to 'proxy'. ` +
        "Valid values: 'proxy' (point DNS at your own edge) or 'vercel'.",
    );
  }

  if ((env.DOMAIN_PROVIDER ?? "").trim().toLowerCase() !== "vercel" && pointsAtVercelEdge(env)) {
    log.warn(
      "custom domains off — CUSTOM_DOMAIN_* points at Vercel's edge but DOMAIN_PROVIDER is not " +
        "'vercel', so DNS would verify against a host Vercel never registered. Set " +
        "DOMAIN_PROVIDER=vercel, or point CUSTOM_DOMAIN_* at your own edge.",
    );
  }
}

/**
 * Names every optional capability that is off *and* what to set to turn it on,
 * so the operator can act on the line instead of going looking for the answer.
 */
function warnMissingCapabilities(env: NodeJS.ProcessEnv): void {
  const capabilities = computeCapabilities(env);
  const off = (Object.keys(capabilities) as (keyof Capabilities)[]).filter(
    (group) => !capabilities[group],
  );
  if (off.length > 0) {
    const width = Math.max(...off.map((group) => group.length));
    const listed = off.map((group) => `  ${group.padEnd(width)}  set ${CAPABILITY_SWITCHES[group]}`);
    log.info(
      [
        `capabilities off: ${String(off.length)} of ${String(Object.keys(capabilities).length)}. ` +
          "Each degrades gracefully — see SELF-HOSTING.md.",
        ...listed,
      ].join("\n"),
    );
  }
  warnDomainMisconfiguration(env);
}

/**
 * Tiered validation: refuses boot on missing required vars or the
 * AGENT_MODE+production conflict, with a readable list of what's missing and
 * where to get it, then names the optional capability groups that are off
 * (each degrades gracefully — SELF-HOSTING.md has the env vars for each).
 */
export function assertBootableEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (isAgentModeProductionConflict(env)) {
    throw new EnvValidationError(
      "AGENT_MODE=true is not allowed when NODE_ENV=production. Agent mode seeds " +
        "dev-only accounts and login bypasses — see rewrite/24-agents.md.",
    );
  }

  const result = requiredEnvSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => {
      const key = issue.path.join(".");
      return `  - ${key}: ${REQUIRED_VAR_DOCS[key] ?? "required to boot"}`;
    });
    throw new EnvValidationError(
      `Cannot start apps/api — missing required environment variables:\n${missing.join("\n")}\n\nCopy .env.example to .env and fill these in.`,
    );
  }

  warnMissingCapabilities(env);
}

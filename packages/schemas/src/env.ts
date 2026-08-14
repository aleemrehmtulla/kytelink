import { z } from "zod";

export const requiredEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  INTERNAL_API_SECRET: z.string().min(1),
  WEB_BASE_URL: z.url(),
  API_BASE_URL: z.url(),
  LANDING_ZONE_URL: z.url(),
});

export const optionalEnvSchema = z.object({
  DIRECT_URL: z.string().optional(),
  ADMIN_EMAILS: z.string().optional(),
  CLICKHOUSE_URL: z.string().optional(),
  CLICKHOUSE_USER: z.string().optional(),
  CLICKHOUSE_PASSWORD: z.string().optional(),
  CLICKHOUSE_DATABASE: z.string().optional(),
  AWS_ENDPOINT_URL: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  NEXT_PUBLIC_CDN_URL: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  NEXT_PUBLIC_WEB_URL: z.string().optional(),
  NEXT_PUBLIC_LANDING_URL: z.string().optional(),
  NEXT_PUBLIC_AHREFS_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MODERATION_PROVIDER: z.enum(["none", "openai"]).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  MODERATION_MODEL: z.string().optional(),
  DOMAIN_PROVIDER: z.enum(["proxy", "vercel"]).optional(),
  VERCEL_TOKEN: z.string().optional(),
  VERCEL_TEAM: z.string().optional(),
  VERCEL_PROJECT: z.string().optional(),
  CUSTOM_DOMAIN_A_RECORD: z.string().optional(),
  CUSTOM_DOMAIN_CNAME_TARGET: z.string().optional(),
});

export type OptionalEnv = z.infer<typeof optionalEnvSchema>;

const TRUTHY_ENV_VALUES = new Set(["true", "1", "yes", "on"]);

export function parseBoolEnv(value: string | undefined): boolean {
  if (value === undefined) return false;
  return TRUTHY_ENV_VALUES.has(value.trim().toLowerCase());
}

export const devOnlyEnvSchema = z.object({
  AGENT_MODE: z.string().optional(),
  AUTH_MOCK_PROVIDERS: z.string().optional(),
});

export const capabilitiesSchema = z.object({
  analytics: z.boolean(),
  uploads: z.boolean(),
  emailDelivery: z.boolean(),
  moderation: z.boolean(),
  oauthGoogle: z.boolean(),
  oauthGithub: z.boolean(),
  domains: z.boolean(),
});

export type Capabilities = z.infer<typeof capabilitiesSchema>;

type CapabilityEnv = {
  CLICKHOUSE_URL?: string;
  AWS_ENDPOINT_URL?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_S3_BUCKET?: string;
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  MODERATION_PROVIDER?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  DOMAIN_PROVIDER?: string;
  VERCEL_TOKEN?: string;
  VERCEL_TEAM?: string;
  VERCEL_PROJECT?: string;
  CUSTOM_DOMAIN_A_RECORD?: string;
  CUSTOM_DOMAIN_CNAME_TARGET?: string;
};

function normalizeEnvValue(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

// Vercel's published edge targets. Pointing users here while NOT running the
// vercel provider is never valid: the DNS check would pass, the domain would be
// marked verified, and Vercel would still 404 it for not being registered on the
// project. Rather than let that state exist, it turns the capability off.
const VERCEL_EDGE_MARKERS = ["76.76.21.21", "vercel-dns.com", "vercel.app"];

export function pointsAtVercelEdge(env: {
  CUSTOM_DOMAIN_A_RECORD?: string;
  CUSTOM_DOMAIN_CNAME_TARGET?: string;
}): boolean {
  const targets =
    `${env.CUSTOM_DOMAIN_A_RECORD ?? ""} ${env.CUSTOM_DOMAIN_CNAME_TARGET ?? ""}`.toLowerCase();
  return VERCEL_EDGE_MARKERS.some((marker) => targets.includes(marker));
}

function present(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// A false capability means "automated/external mode unavailable, degraded
// fallback still works" (email -> console/mailpit, domains -> manual DNS) —
// consumers show the fallback UI, never hide the feature.
export function computeCapabilities(env: CapabilityEnv): Capabilities {
  const emailProvider = env.EMAIL_PROVIDER ?? "console";
  const emailDelivery =
    (emailProvider === "resend" && present(env.RESEND_API_KEY)) ||
    (emailProvider === "smtp" && present(env.SMTP_HOST));

  return {
    analytics: present(env.CLICKHOUSE_URL),
    uploads:
      present(env.AWS_ENDPOINT_URL) &&
      present(env.AWS_ACCESS_KEY_ID) &&
      present(env.AWS_SECRET_ACCESS_KEY) &&
      present(env.AWS_S3_BUCKET),
    emailDelivery,
    moderation: env.MODERATION_PROVIDER === "openai" && present(env.OPENAI_API_KEY),
    oauthGoogle: present(env.GOOGLE_CLIENT_ID) && present(env.GOOGLE_CLIENT_SECRET),
    oauthGithub: present(env.GITHUB_CLIENT_ID) && present(env.GITHUB_CLIENT_SECRET),
    // True when a custom domain can actually be ACTIVATED, which is what the UI
    // needs to know. Vercel mode needs full API credentials; proxy mode needs at
    // least one DNS target to tell users to point at (and to verify against).
    // Neither => the domain UI explains that custom domains are unconfigured
    // rather than handing out records that lead nowhere.
    domains:
      normalizeEnvValue(env.DOMAIN_PROVIDER) === "vercel"
        ? present(env.VERCEL_TOKEN) && present(env.VERCEL_TEAM) && present(env.VERCEL_PROJECT)
        : (present(env.CUSTOM_DOMAIN_A_RECORD) || present(env.CUSTOM_DOMAIN_CNAME_TARGET)) &&
          !pointsAtVercelEdge(env),
  };
}

export function isAgentModeProductionConflict(env: {
  AGENT_MODE?: string;
  NODE_ENV?: string;
}): boolean {
  return parseBoolEnv(env.AGENT_MODE) && normalizeEnvValue(env.NODE_ENV) === "production";
}

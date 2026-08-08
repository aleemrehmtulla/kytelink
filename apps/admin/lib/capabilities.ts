import { computeCapabilities, type Capabilities } from "@kytelink/schemas";

export function readServerCapabilities(): Capabilities {
  return computeCapabilities({
    CLICKHOUSE_URL: process.env.CLICKHOUSE_URL,
    AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    MODERATION_PROVIDER: process.env.MODERATION_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    DOMAIN_PROVIDER: process.env.DOMAIN_PROVIDER,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN,
    VERCEL_TEAM: process.env.VERCEL_TEAM,
    VERCEL_PROJECT: process.env.VERCEL_PROJECT,
  });
}

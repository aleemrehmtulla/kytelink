import { describe, expect, it } from "vitest";
import { computeCapabilities, optionalEnvSchema, requiredEnvSchema } from "./env";

describe("requiredEnvSchema", () => {
  it("rejects an empty env", () => {
    expect(requiredEnvSchema.safeParse({}).success).toBe(false);
  });

  it("requires AUTH_SECRET of at least 32 chars", () => {
    const base = {
      DATABASE_URL: "postgresql://x",
      REDIS_URL: "redis://x",
      INTERNAL_API_SECRET: "s",
      WEB_BASE_URL: "http://localhost:3000",
      API_BASE_URL: "http://localhost:3003",
      LANDING_ZONE_URL: "http://localhost:3001",
    };
    expect(requiredEnvSchema.safeParse({ ...base, AUTH_SECRET: "short" }).success).toBe(false);
    expect(
      requiredEnvSchema.safeParse({ ...base, AUTH_SECRET: "a".repeat(32) }).success,
    ).toBe(true);
  });
});

describe("optionalEnvSchema", () => {
  it("accepts the full ClickHouse connection quartet", () => {
    const result = optionalEnvSchema.safeParse({
      CLICKHOUSE_URL: "http://localhost:8123",
      CLICKHOUSE_USER: "default",
      CLICKHOUSE_PASSWORD: "kyte",
      CLICKHOUSE_DATABASE: "kyte",
    });
    expect(result.success).toBe(true);
  });
});

describe("computeCapabilities", () => {
  it("is all-off for an empty env", () => {
    expect(computeCapabilities({})).toEqual({
      analytics: false,
      uploads: false,
      emailDelivery: false,
      moderation: false,
      oauthGoogle: false,
      oauthGithub: false,
      domains: false,
    });
  });

  it("analytics turns on with CLICKHOUSE_URL", () => {
    expect(computeCapabilities({ CLICKHOUSE_URL: "http://localhost:8123" }).analytics).toBe(true);
  });

  it("uploads needs the full S3 quartet", () => {
    expect(
      computeCapabilities({
        AWS_ENDPOINT_URL: "http://localhost:9000",
        AWS_ACCESS_KEY_ID: "k",
        AWS_SECRET_ACCESS_KEY: "s",
      }).uploads,
    ).toBe(false);
    expect(
      computeCapabilities({
        AWS_ENDPOINT_URL: "http://localhost:9000",
        AWS_ACCESS_KEY_ID: "k",
        AWS_SECRET_ACCESS_KEY: "s",
        AWS_S3_BUCKET: "b",
      }).uploads,
    ).toBe(true);
  });

  it("emailDelivery is off for console and on for a configured provider", () => {
    expect(computeCapabilities({ EMAIL_PROVIDER: "console" }).emailDelivery).toBe(false);
    expect(computeCapabilities({ EMAIL_PROVIDER: "resend" }).emailDelivery).toBe(false);
    expect(
      computeCapabilities({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_x" }).emailDelivery,
    ).toBe(true);
    expect(
      computeCapabilities({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "localhost" }).emailDelivery,
    ).toBe(true);
  });

  it("moderation needs openai provider and a key", () => {
    expect(computeCapabilities({ MODERATION_PROVIDER: "openai" }).moderation).toBe(false);
    expect(
      computeCapabilities({ MODERATION_PROVIDER: "openai", OPENAI_API_KEY: "sk" }).moderation,
    ).toBe(true);
    expect(computeCapabilities({ OPENAI_API_KEY: "sk" }).moderation).toBe(false);
  });

  it("oauth toggles per provider pair", () => {
    expect(
      computeCapabilities({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "s" }).oauthGoogle,
    ).toBe(true);
    expect(computeCapabilities({ GOOGLE_CLIENT_ID: "id" }).oauthGoogle).toBe(false);
    expect(
      computeCapabilities({ GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "s" }).oauthGithub,
    ).toBe(true);
  });

  it("domains needs vercel provider plus token, team, and project", () => {
    expect(computeCapabilities({ DOMAIN_PROVIDER: "proxy" }).domains).toBe(false);
    // proxy mode is enabled by having somewhere to point users at
    expect(
      computeCapabilities({ DOMAIN_PROVIDER: "proxy", CUSTOM_DOMAIN_A_RECORD: "203.0.113.10" })
        .domains,
    ).toBe(true);
    // ...but never when those targets are Vercel's, which the proxy path cannot serve
    expect(
      computeCapabilities({ DOMAIN_PROVIDER: "proxy", CUSTOM_DOMAIN_A_RECORD: "76.76.21.21" })
        .domains,
    ).toBe(false);
    expect(
      computeCapabilities({
        DOMAIN_PROVIDER: "vercel",
        VERCEL_TOKEN: "t",
        VERCEL_TEAM: "team",
        VERCEL_PROJECT: "proj",
      }).domains,
    ).toBe(true);
    expect(
      computeCapabilities({ DOMAIN_PROVIDER: "vercel", VERCEL_TOKEN: "t" }).domains,
    ).toBe(false);
  });
});

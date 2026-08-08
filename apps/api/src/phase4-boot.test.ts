import { afterEach, describe, expect, it, vi } from "vitest";
import { computeCapabilities } from "@kytelink/schemas";
import { assertBootableEnv } from "./env";
import { logger } from "./logger";

const REQUIRED_ONLY: NodeJS.ProcessEnv = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  AUTH_SECRET: "x".repeat(64),
  INTERNAL_API_SECRET: "y".repeat(32),
  WEB_BASE_URL: "http://localhost:3000",
  API_BASE_URL: "http://localhost:3003",
  LANDING_ZONE_URL: "http://localhost:3001",
};

const CAPABILITY_GROUPS = [
  "analytics",
  "uploads",
  "emailDelivery",
  "moderation",
  "oauthGoogle",
  "oauthGithub",
  "domains",
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("boot names the missing optional capability groups on one line (SH2)", () => {
  it("lists all seven capability groups under a minimal required-only env", () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => logger);

    assertBootableEnv(REQUIRED_ONLY);

    const lines = info.mock.calls
      .map((call) => String(call[0]))
      .filter((m) => m.startsWith("capabilities off:"));
    expect(lines.length).toBe(1);
    for (const group of CAPABILITY_GROUPS) {
      expect(lines[0]).toContain(group);
    }
  });

  it("says nothing when every capability is on", () => {
    const info = vi.spyOn(logger, "info").mockImplementation(() => logger);

    assertBootableEnv({
      ...REQUIRED_ONLY,
      CLICKHOUSE_URL: "http://localhost:8123",
      AWS_ENDPOINT_URL: "http://localhost:9000",
      AWS_ACCESS_KEY_ID: "key",
      AWS_SECRET_ACCESS_KEY: "secret",
      AWS_S3_BUCKET: "bucket",
      EMAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_x",
      MODERATION_PROVIDER: "openai",
      OPENAI_API_KEY: "sk-x",
      GOOGLE_CLIENT_ID: "gid",
      GOOGLE_CLIENT_SECRET: "gsecret",
      GITHUB_CLIENT_ID: "hid",
      GITHUB_CLIENT_SECRET: "hsecret",
      DOMAIN_PROVIDER: "vercel",
      VERCEL_TOKEN: "tok",
      VERCEL_TEAM: "team",
      VERCEL_PROJECT: "proj",
    });

    expect(
      info.mock.calls.map((c) => String(c[0])).some((m) => m.startsWith("capabilities off:")),
    ).toBe(false);
  });
});

// The one domain misconfiguration that fails silently: DNS verification passes,
// so the UI says "Good to go", but Vercel 404s a host never registered on the
// project. Everything else in this area fails loudly or degrades visibly.
describe("boot warns when DNS targets point at Vercel without the vercel provider", () => {
  it("turns the domains capability OFF for that combination, not just warns", () => {
    vi.spyOn(logger, "warn").mockImplementation(() => logger);
    expect(
      computeCapabilities({
        DOMAIN_PROVIDER: "proxy",
        CUSTOM_DOMAIN_A_RECORD: "76.76.21.21",
      }).domains,
    ).toBe(false);
  });

  it("warns about an unrecognised provider value", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);
    assertBootableEnv({ ...REQUIRED_ONLY, DOMAIN_PROVIDER: "vercell" });
    expect(
      warn.mock.calls.map((c) => String(c[0])).some((m) => m.includes("is not recognised")),
    ).toBe(true);
  });

  it("warns for the Vercel A record under the proxy provider", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    assertBootableEnv({
      ...REQUIRED_ONLY,
      DOMAIN_PROVIDER: "proxy",
      CUSTOM_DOMAIN_A_RECORD: "76.76.21.21",
    });

    const messages = warn.mock.calls.map((call) => String(call[0]));
    expect(messages.some((m) => m.includes("DOMAIN_PROVIDER is not 'vercel'"))).toBe(true);
  });

  it("warns for a vercel-dns CNAME target too", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    assertBootableEnv({
      ...REQUIRED_ONLY,
      CUSTOM_DOMAIN_CNAME_TARGET: "cname.vercel-dns.com",
    });

    expect(
      warn.mock.calls.map((c) => String(c[0])).some((m) => m.includes("custom domains off")),
    ).toBe(true);
  });

  it("stays quiet when the vercel provider is actually in use", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    assertBootableEnv({
      ...REQUIRED_ONLY,
      DOMAIN_PROVIDER: "vercel",
      VERCEL_TOKEN: "tok",
      VERCEL_TEAM: "team",
      VERCEL_PROJECT: "proj",
      CUSTOM_DOMAIN_A_RECORD: "76.76.21.21",
    });

    expect(
      warn.mock.calls.map((c) => String(c[0])).some((m) => m.includes("custom domains off")),
    ).toBe(false);
  });

  it("stays quiet for a self-hoster pointing at their own edge", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => logger);

    assertBootableEnv({
      ...REQUIRED_ONLY,
      DOMAIN_PROVIDER: "proxy",
      CUSTOM_DOMAIN_A_RECORD: "203.0.113.10",
      CUSTOM_DOMAIN_CNAME_TARGET: "edge.example.com",
    });

    expect(
      warn.mock.calls.map((c) => String(c[0])).some((m) => m.includes("custom domains off")),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { assertBootableEnv, EnvValidationError } from "./env";
import { buildServer } from "./server";
import { loadConfig, setConfigForTest } from "./config";
import {
  INTERNAL_SIGNATURE_HEADER,
  INTERNAL_TIMESTAMP_HEADER,
  signInternalRequest,
} from "./internal/hmac";

const REQUIRED_ENV = {
  DATABASE_URL: "postgresql://kyte:kyte@localhost:5432/kyte",
  REDIS_URL: "redis://localhost:6379",
  AUTH_SECRET: "test-secret-000000000000000000000000",
  INTERNAL_API_SECRET: "test-internal-secret",
  WEB_BASE_URL: "http://localhost:3000",
  API_BASE_URL: "http://localhost:3003",
  LANDING_ZONE_URL: "http://localhost:3001",
};

describe("apps/api boot smoke", () => {
  it("refuses to boot when required env vars are missing", () => {
    expect(() => assertBootableEnv({})).toThrow(EnvValidationError);
  });

  it("refuses to boot when AGENT_MODE=true in production", () => {
    expect(() =>
      assertBootableEnv({ ...REQUIRED_ENV, AGENT_MODE: "true", NODE_ENV: "production" }),
    ).toThrow(EnvValidationError);
  });

  it("refuses to boot when NODE_ENV is capitalized (Production)", () => {
    expect(() =>
      assertBootableEnv({ ...REQUIRED_ENV, AGENT_MODE: "true", NODE_ENV: "Production" }),
    ).toThrow(EnvValidationError);
  });

  it("refuses to boot when AGENT_MODE=1", () => {
    expect(() =>
      assertBootableEnv({ ...REQUIRED_ENV, AGENT_MODE: "1", NODE_ENV: "production" }),
    ).toThrow(EnvValidationError);
  });

  it("refuses to boot when AGENT_MODE=TRUE (uppercase)", () => {
    expect(() =>
      assertBootableEnv({ ...REQUIRED_ENV, AGENT_MODE: "TRUE", NODE_ENV: "production" }),
    ).toThrow(EnvValidationError);
  });

  it("refuses to boot when AGENT_MODE and NODE_ENV have surrounding whitespace", () => {
    expect(() =>
      assertBootableEnv({ ...REQUIRED_ENV, AGENT_MODE: " true ", NODE_ENV: " production " }),
    ).toThrow(EnvValidationError);
  });

  it("boots when AGENT_MODE=false in production", () => {
    expect(() =>
      assertBootableEnv({ ...REQUIRED_ENV, AGENT_MODE: "false", NODE_ENV: "production" }),
    ).not.toThrow();
  });

  it("boots when AGENT_MODE is unset in production", () => {
    expect(() => assertBootableEnv({ ...REQUIRED_ENV, NODE_ENV: "production" })).not.toThrow();
  });

  it("boots when required env vars are present", () => {
    expect(() => assertBootableEnv(REQUIRED_ENV)).not.toThrow();
  });

  it("builds a fastify instance with the health route", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, app: "api" });
    await app.close();
  });

  it("serves /healthz and /readyz", async () => {
    const app = await buildServer();
    expect((await app.inject({ method: "GET", url: "/healthz" })).statusCode).toBe(200);
    const ready = await app.inject({ method: "GET", url: "/readyz" });
    expect([200, 503]).toContain(ready.statusCode);
    expect(ready.json()).toMatchObject({ checks: expect.any(Object) });
    await app.close();
  });

  it("always answers beacons with 202", async () => {
    const app = await buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/t/page",
      headers: { "content-type": "text/plain" },
      payload: "{}",
    });
    expect(response.statusCode).toBe(202);
    await app.close();
  });
});

describe("internal HMAC gate", () => {
  const SECRET = "internal-hmac-test-secret";

  it("rejects unsigned internal requests with 401", async () => {
    setConfigForTest(loadConfig({ ...process.env, INTERNAL_API_SECRET: SECRET }));
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/internal/profiles/agent" });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("rejects a tampered signature with 401", async () => {
    setConfigForTest(loadConfig({ ...process.env, INTERNAL_API_SECRET: SECRET }));
    const app = await buildServer();
    const timestamp = String(Date.now());
    const response = await app.inject({
      method: "GET",
      url: "/internal/profiles/agent",
      headers: {
        [INTERNAL_TIMESTAMP_HEADER]: timestamp,
        [INTERNAL_SIGNATURE_HEADER]: "deadbeef",
      },
    });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("accepts a correctly signed internal request (past the HMAC gate)", async () => {
    setConfigForTest(loadConfig({ ...process.env, INTERNAL_API_SECRET: SECRET }));
    const app = await buildServer();
    const timestamp = String(Date.now());
    const signature = signInternalRequest(SECRET, "GET", "/internal/profiles/agent", timestamp, "");
    const response = await app.inject({
      method: "GET",
      url: "/internal/profiles/agent",
      headers: {
        [INTERNAL_TIMESTAMP_HEADER]: timestamp,
        [INTERNAL_SIGNATURE_HEADER]: signature,
      },
    });
    expect(response.statusCode).not.toBe(401);
    await app.close();
  });
});

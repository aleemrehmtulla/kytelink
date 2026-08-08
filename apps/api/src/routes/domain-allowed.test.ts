import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildServer } from "../server";
import { loadConfig, setConfigForTest } from "../config";
import { getRedis } from "../redis";

const SECRET = "domain-allowed-internal-secret";

import type * as InternalData from "../internal/data";

const allowed = vi.hoisted(() => vi.fn(async (_host: string) => false));
vi.mock("../internal/data", async (importActual) => ({
  ...(await importActual<typeof InternalData>()),
  isDomainAllowed: allowed,
}));

beforeEach(async () => {
  setConfigForTest(loadConfig({ ...process.env, INTERNAL_API_SECRET: SECRET }));
  allowed.mockReset();
  const redis = getRedis();
  const keys = await redis.keys("rl:domain-allowed*");
  if (keys.length > 0) await redis.del(...keys);
});

describe("GET /internal/domains/allowed (Caddy on-demand TLS gate)", () => {
  it("returns 200 for a verified custom domain", async () => {
    allowed.mockResolvedValue(true);
    const app = await buildServer();
    const response = await app.inject({
      method: "GET",
      url: "/internal/domains/allowed?domain=links.example.com",
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  // The whole point of the gate: an unknown host must NOT get a certificate.
  it("returns 404 for a host nobody has registered", async () => {
    allowed.mockResolvedValue(false);
    const app = await buildServer();
    const response = await app.inject({
      method: "GET",
      url: "/internal/domains/allowed?domain=attacker.example.net",
    });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("rejects a call with no domain rather than defaulting to allow", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/internal/domains/allowed" });
    expect(response.statusCode).toBe(400);
    expect(allowed).not.toHaveBeenCalled();
    await app.close();
  });

  // Caddy cannot sign an HMAC, so this route sits outside the internal guard.
  // That is deliberate, and this pins it: no signature headers, still 200.
  it("does not require the internal HMAC signature", async () => {
    allowed.mockResolvedValue(true);
    const app = await buildServer();
    const response = await app.inject({
      method: "GET",
      url: "/internal/domains/allowed?domain=links.example.com",
    });
    expect(response.statusCode).not.toBe(401);
    await app.close();
  });

  it("lowercases the host before looking it up", async () => {
    allowed.mockResolvedValue(true);
    const app = await buildServer();
    await app.inject({ method: "GET", url: "/internal/domains/allowed?domain=LINKS.Example.COM" });
    expect(allowed).toHaveBeenCalledWith("links.example.com");
    await app.close();
  });
});

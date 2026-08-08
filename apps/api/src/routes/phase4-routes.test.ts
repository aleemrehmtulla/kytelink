import { beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMIT_CLASSES } from "@kytelink/schemas";
import { buildServer } from "../server";
import { loadConfig, setConfigForTest } from "../config";
import { getRedis } from "../redis";
import {
  INTERNAL_SIGNATURE_HEADER,
  INTERNAL_TIMESTAMP_HEADER,
  signInternalRequest,
} from "../internal/hmac";

const SECRET = "phase4-internal-secret";

async function flush(pattern: string): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}

beforeEach(() => {
  setConfigForTest(loadConfig({ ...process.env, INTERNAL_API_SECRET: SECRET }));
});

describe("POST /report (S2)", () => {
  beforeEach(async () => {
    await flush("rl:report:*");
  });

  it("returns a neutral 202 for a well-formed report", async () => {
    const app = await buildServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/report",
        headers: { "content-type": "application/json" },
        payload: { usernameOrUrl: "https://kytelink.com/agent", reason: "spam" },
      });
      expect(res.statusCode).toBe(202);
    } finally {
      await app.close();
    }
  });

  it("returns the same 202 whether or not the username exists (no enumeration)", async () => {
    const app = await buildServer();
    try {
      const exists = await app.inject({
        method: "POST",
        url: "/report",
        headers: { "content-type": "application/json" },
        payload: { usernameOrUrl: "agent", reason: "impersonation" },
      });
      const missing = await app.inject({
        method: "POST",
        url: "/report",
        headers: { "content-type": "application/json" },
        payload: { usernameOrUrl: "definitely-not-a-real-handle-zzz", reason: "impersonation" },
      });
      expect(exists.statusCode).toBe(202);
      expect(missing.statusCode).toBe(202);
    } finally {
      await app.close();
    }
  });

  it("rejects a malformed report body with 400", async () => {
    const app = await buildServer();
    try {
      const res = await app.inject({
        method: "POST",
        url: "/report",
        headers: { "content-type": "application/json" },
        payload: { usernameOrUrl: "agent" },
      });
      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("returns 429 with Retry-After once the per-ip report cap is exceeded (L1)", async () => {
    const app = await buildServer();
    try {
      const reportRule = RATE_LIMIT_CLASSES.report[0];
      if (!reportRule) throw new Error("report rule missing");
      let last = 0;
      let retryAfter: string | undefined;
      for (let i = 0; i < reportRule.limit + 2; i += 1) {
        const res = await app.inject({
          method: "POST",
          url: "/report",
          headers: { "content-type": "application/json" },
          payload: { usernameOrUrl: "agent", reason: "spam" },
        });
        last = res.statusCode;
        retryAfter = res.headers["retry-after"] as string | undefined;
      }
      expect(last).toBe(429);
      expect(retryAfter).toBeDefined();
    } finally {
      await app.close();
    }
  });
});

describe("POST /internal/previews/:token rate limit (S6)", () => {
  beforeEach(async () => {
    await flush("rl:preview-verify:*");
  });

  it("429s after the verify limit from one ip, past the HMAC gate", async () => {
    const verifyRule = RATE_LIMIT_CLASSES["preview-verify"][0]!;
    const app = await buildServer();
    const body = JSON.stringify({ passcode: "000000" });
    try {
      let last = 0;
      let retryAfter: string | undefined;
      for (let i = 0; i < verifyRule.limit + 1; i += 1) {
        const timestamp = String(Date.now());
        const path = "/internal/previews/sometoken";
        const signature = signInternalRequest(SECRET, "POST", path, timestamp, body);
        const res = await app.inject({
          method: "POST",
          url: path,
          headers: {
            "content-type": "application/json",
            [INTERNAL_TIMESTAMP_HEADER]: timestamp,
            [INTERNAL_SIGNATURE_HEADER]: signature,
          },
          payload: body,
        });
        last = res.statusCode;
        retryAfter = res.headers["retry-after"] as string | undefined;
      }
      expect(last).toBe(429);
      expect(retryAfter).toBeDefined();
    } finally {
      await app.close();
    }
  });
});

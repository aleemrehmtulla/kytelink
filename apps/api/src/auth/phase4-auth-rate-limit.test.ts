import { beforeEach, describe, expect, it } from "vitest";
import { RATE_LIMIT_CLASSES } from "@kytelink/schemas";
import { buildServer } from "../server";
import { loadConfig, setConfigForTest } from "../config";
import { getRedis } from "../redis";

async function flush(pattern: string): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}

beforeEach(async () => {
  setConfigForTest(loadConfig({ ...process.env }));
  await flush("rl:otp-send:*");
});

describe("/auth/* OTP send rate limiting (S1)", () => {
  it("429s after the per-email otp-send cap and sets Retry-After", async () => {
    const app = await buildServer();
    const email = `ratelimit-${Date.now()}@example.com`;
    try {
      const emailRule = RATE_LIMIT_CLASSES["otp-send"].find((rule) => rule.subject === "email");
      if (!emailRule) throw new Error("otp-send email rule missing");
      const statuses: number[] = [];
      let retryAfter: string | undefined;
      // The send after the per-email cap must be blocked by the preHandler.
      for (let i = 0; i < emailRule.limit + 1; i += 1) {
        const res = await app.inject({
          method: "POST",
          url: "/auth/email-otp/send-verification-otp",
          headers: { "content-type": "application/json" },
          payload: { email, type: "sign-in" },
        });
        statuses.push(res.statusCode);
        retryAfter = res.headers["retry-after"] as string | undefined;
      }
      expect(statuses[emailRule.limit]).toBe(429);
      expect(retryAfter).toBeDefined();
    } finally {
      await app.close();
    }
  });
});

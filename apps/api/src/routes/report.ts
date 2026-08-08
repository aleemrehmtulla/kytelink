import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDb } from "@kytelink/db";
import { getRedis } from "../redis";
import {
  enforceRateLimit,
  isRedisLike,
  RedisRateLimiter,
  retryAfterOf,
} from "../trpc/rate-limit";

const reportBody = z.object({
  usernameOrUrl: z.string().trim().min(1).max(2048),
  reason: z.string().trim().min(1).max(200),
  details: z.string().trim().max(2000).optional(),
});

// Accepts a bare username, an @handle, or a full profile URL, and reduces it to
// the candidate username. Never throws — reporting is best-effort intake.
function extractUsername(usernameOrUrl: string): string {
  let value = usernameOrUrl.trim();
  if (/^https?:\/\//i.test(value) || value.includes("/")) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      const segments = url.pathname.split("/").filter((s) => s.length > 0);
      value = segments[0] ?? url.hostname.split(".")[0] ?? "";
    } catch {
      value = value.split("/").filter((s) => s.length > 0)[0] ?? value;
    }
  }
  return value.replace(/^@+/, "").trim().toLowerCase();
}

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function registerReportRoute(app: FastifyInstance): void {
  app.post("/report", async (req, reply) => {
    const redis = getRedis();
    if (isRedisLike(redis)) {
      try {
        await enforceRateLimit(
          new RedisRateLimiter(redis),
          "report",
          { ip: req.ip },
          { failOpen: true },
        );
      } catch (error) {
        const retryAfter = retryAfterOf(error);
        if (retryAfter !== null) {
          reply.header("retry-after", String(retryAfter));
          await reply.status(429).send({ error: "TOO_MANY_REQUESTS" });
          return;
        }
        throw error;
      }
    }

    const parsed = reportBody.safeParse(req.body);
    if (!parsed.success) {
      await reply.status(400).send({ error: "BAD_REQUEST" });
      return;
    }

    const username = extractUsername(parsed.data.usernameOrUrl);
    try {
      // The kyteId lookup is internal only; the response is identical whether or
      // not the username resolves, so a report never confirms a handle exists.
      const kyte = username
        ? await getDb().publishedKyte.findUnique({ where: { username } })
        : null;
      await getDb().abuseReport.create({
        data: {
          username,
          kyteId: kyte?.kyteId ?? null,
          reason: parsed.data.reason,
          details: parsed.data.details ?? null,
          ipHash: hashIp(req.ip),
        },
      });
    } catch (error) {
      req.log.warn({ tag: "report", err: error }, "could not save this abuse report — the reporter saw a success page anyway");
    }

    await reply.status(202).send({ ok: true });
  });
}

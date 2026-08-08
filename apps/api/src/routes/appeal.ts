import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { getDb } from "@kytelink/db";
import { appealSubmissionSchema } from "@kytelink/schemas";
import { getRedis } from "../redis";
import {
  enforceRateLimit,
  isRedisLike,
  RedisRateLimiter,
  retryAfterOf,
} from "../trpc/rate-limit";

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function registerAppealRoute(app: FastifyInstance): void {
  app.post("/appeal", async (req, reply) => {
    const redis = getRedis();
    if (isRedisLike(redis)) {
      try {
        await enforceRateLimit(
          new RedisRateLimiter(redis),
          "appeal",
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

    const parsed = appealSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      await reply.status(400).send({ error: "BAD_REQUEST" });
      return;
    }

    try {
      await getDb().appeal.create({
        data: {
          kind: parsed.data.kind,
          handle: parsed.data.handle.replace(/^@+/, "").trim(),
          email: parsed.data.email.trim().toLowerCase(),
          message: parsed.data.message,
          ipHash: hashIp(req.ip),
        },
      });
    } catch (error) {
      req.log.warn({ tag: "appeal", err: error }, "could not save this appeal — the user saw a success page anyway");
    }

    // Identical response whether or not the handle exists, whether or not it is
    // actually suspended, and even if the write failed — an appeal form must
    // never become an oracle for who has been actioned.
    await reply.status(202).send({ ok: true });
  });
}

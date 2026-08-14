import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { previewPasscodeSchema } from "@kytelink/schemas";
import { getConfig } from "../config";
import { getRedis } from "../redis";
import {
  enforceRateLimit,
  isRedisLike,
  RedisRateLimiter,
  retryAfterOf,
} from "../trpc/rate-limit";
import {
  INTERNAL_SIGNATURE_HEADER,
  INTERNAL_TIMESTAMP_HEADER,
  verifyInternalRequest,
} from "../internal/hmac";
import {
  isDomainAllowed,
  resolveDomain,
  resolvePreview,
  resolveProfile,
} from "../internal/data";

interface RawBodyRequest extends FastifyRequest {
  rawBody?: string;
}

function headerValue(req: FastifyRequest, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function guard(req: FastifyRequest, reply: FastifyReply): boolean {
  const config = getConfig();
  const result = verifyInternalRequest(
    config.internalApiSecret,
    req.method,
    req.url.split("?")[0] ?? req.url,
    {
      signature: headerValue(req, INTERNAL_SIGNATURE_HEADER),
      timestamp: headerValue(req, INTERNAL_TIMESTAMP_HEADER),
    },
    (req as RawBodyRequest).rawBody ?? "",
  );
  if (!result.ok) {
    void reply.status(401).send({ error: "UNAUTHORIZED", reason: result.reason });
    return false;
  }
  return true;
}

const previewBody = z.object({ passcode: previewPasscodeSchema });

export function registerInternalRoutes(app: FastifyInstance): void {
  /**
   * On-demand TLS gate for a self-hosted reverse proxy (Caddy's `ask`). Caddy
   * calls this before issuing a certificate for an unknown host; without the
   * gate anyone could point a domain at the server and mint certificates until
   * the ACME rate limit is hit.
   *
   * Unauthenticated by necessity — Caddy cannot produce an HMAC signature — so
   * it is deliberately the narrowest endpoint in the codebase: it takes a host,
   * returns 200 or 404, and leaks nothing about who owns what. Bind it to the
   * internal network; it is not meant to be publicly reachable.
   */
  app.get<{ Querystring: { domain?: string } }>(
    "/internal/domains/allowed",
    async (req, reply) => {
      const host = req.query.domain?.trim().toLowerCase();
      if (!host) {
        await reply.status(400).send({ error: "BAD_REQUEST" });
        return;
      }
      const redis = getRedis();
      if (isRedisLike(redis)) {
        try {
          await enforceRateLimit(new RedisRateLimiter(redis), "domain-allowed", { ip: req.ip }, {
            failOpen: true,
          });
        } catch (error) {
          if (retryAfterOf(error) !== null) {
            await reply.status(429).send({ error: "TOO_MANY_REQUESTS" });
            return;
          }
          throw error;
        }
      }
      if (!(await isDomainAllowed(host))) {
        await reply.status(404).send({ error: "NOT_FOUND" });
        return;
      }
      await reply.status(200).send({ ok: true });
    },
  );

  void app.register(async (scope) => {
    scope.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
      (req as RawBodyRequest).rawBody = typeof body === "string" ? body : "";
      try {
        done(null, body ? JSON.parse(body as string) : {});
      } catch (error) {
        done(error as Error);
      }
    });

    scope.get<{ Params: { username: string } }>(
      "/internal/profiles/:username",
      async (req, reply) => {
        if (!guard(req, reply)) return;
        const profile = await resolveProfile(req.params.username.trim().toLowerCase());
        if (!profile) {
          await reply.status(404).send({ error: "NOT_FOUND" });
          return;
        }
        await reply.status(200).send(profile);
      },
    );

    scope.get<{ Params: { host: string } }>("/internal/domains/:host", async (req, reply) => {
      if (!guard(req, reply)) return;
      const username = await resolveDomain(req.params.host);
      await reply.status(200).send({ username });
    });

    scope.post<{ Params: { token: string } }>("/internal/previews/:token", async (req, reply) => {
      if (!guard(req, reply)) return;
      const redis = getRedis();
      if (isRedisLike(redis)) {
        try {
          await enforceRateLimit(
            new RedisRateLimiter(redis),
            "preview-verify",
            { ip: `token:${req.params.token}` },
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
      const parsed = previewBody.safeParse(req.body);
      if (!parsed.success) {
        await reply.status(400).send({ error: "BAD_REQUEST" });
        return;
      }
      const result = await resolvePreview(req.params.token, parsed.data.passcode);
      if (!result.ok) {
        await reply.status(403).send({ error: "FORBIDDEN" });
        return;
      }
      await reply.status(200).send({ content: result.content, username: result.username ?? null });
    });
  });
}

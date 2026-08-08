import { STATUS_CODES } from "node:http";
import Fastify, {
  type FastifyBaseLogger,
  type FastifyError,
  type FastifyInstance,
  type FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import type { TRPCError } from "@trpc/server";
import type { RateLimitClass } from "@kytelink/schemas";
import { appRouter } from "./routers/index";
import { logger, quietLogController } from "./logger";
import { describeTrpcError, noteRequestFailure, registerRequestLog } from "./log/request-log";
import { getConfig } from "./config";
import { getAuth } from "./auth/auth";
import { registerDevLogin } from "./auth/dev-login";
import { registerImpersonationRoutes } from "./auth/impersonation-routes";
import { createTrpcContext } from "./context";
import { getRedis } from "./redis";
import {
  enforceRateLimit,
  isRedisLike,
  RedisRateLimiter,
  retryAfterOf,
} from "./trpc/rate-limit";
import { registerBeaconRoutes } from "./routes/beacons";
import { registerHealthRoute } from "./routes/health";
import { registerInternalRoutes } from "./routes/internal";
import { registerAppealRoute } from "./routes/appeal";
import { registerReportRoute } from "./routes/report";

function authRateClassFor(path: string): RateLimitClass | null {
  if (path.endsWith("/email-otp/send-verification-otp")) return "otp-send";
  if (path.endsWith("/sign-in/email-otp") || path.endsWith("/email-otp/verify-email")) {
    return "otp-verify";
  }
  if (
    path.includes("/sign-in/social") ||
    path.includes("/sign-in/oauth2") ||
    path.includes("/callback/") ||
    path.includes("/oauth2/")
  ) {
    return "oauth";
  }
  return null;
}

function emailFromBody(body: unknown): string | undefined {
  if (body && typeof body === "object" && "email" in body) {
    const email = (body as { email: unknown }).email;
    if (typeof email === "string" && email.trim().length > 0) return email.trim().toLowerCase();
  }
  return undefined;
}

async function enforceAuthRateLimit(req: FastifyRequest): Promise<void> {
  const path = req.url.split("?")[0] ?? req.url;
  const className = authRateClassFor(path);
  if (!className) return;
  const redis = getRedis();
  if (!isRedisLike(redis)) return;
  await enforceRateLimit(
    new RedisRateLimiter(redis),
    className,
    { ip: req.ip, email: emailFromBody(req.body) },
    { failOpen: true },
  );
}

function corsOriginFor(allowed: Set<string>) {
  return (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void): void => {
    if (!origin) {
      cb(null, true);
      return;
    }
    cb(null, allowed.has(origin));
  };
}

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger as FastifyBaseLogger,
    logController: quietLogController,
    routerOptions: { maxParamLength: 5000 },
  });
  const config = getConfig();

  registerRequestLog(app);

  const trpcOrigins = new Set([...config.allowedOrigins, ...config.adminOrigins]);
  const beaconOrigins = new Set(
    [...config.allowedOrigins, config.landingOrigin].filter((o): o is string => Boolean(o)),
  );

  // Client mistakes (empty JSON body, malformed payloads) become the reason on
  // the request's own log line rather than a second line with a stack dump.
  // 5xx aren't logged here — quietLogController forwards their completion with
  // the full error object, and logging both would double up. The reply is a
  // plain object mirroring fastify's standard error shape: send(error) would
  // re-enter fastify's fallback error pipeline and log the stack a second time.
  app.setErrorHandler((error: FastifyError, req, reply) => {
    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    noteRequestFailure(req, `${error.code ?? error.name}: ${error.message}`);
    void reply.status(status).send({
      statusCode: status,
      code: error.code,
      error: STATUS_CODES[status] ?? "Error",
      message: status >= 500 ? "Internal Server Error" : error.message,
    });
  });

  await app.register(cookie);
  await app.register(cors, {
    origin: corsOriginFor(trpcOrigins),
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
  });

  app.addHook("onRequest", async (req, reply) => {
    if (
      req.url.startsWith("/report") ||
      req.url.startsWith("/appeal") ||
      req.url.startsWith("/t/event")
    ) {
      const origin = req.headers.origin;
      if (origin && beaconOrigins.has(origin)) {
        reply.header("access-control-allow-origin", origin);
        reply.header("access-control-allow-credentials", "true");
        // The landing zone is a beacon origin but not a trpc origin, so
        // @fastify/cors declines its preflight and it falls through to a 404.
        // A JSON POST from /report or /appeal is preflighted, so answer it here.
        if (req.method === "OPTIONS") {
          reply.header("access-control-allow-methods", "POST, OPTIONS");
          reply.header("access-control-allow-headers", "content-type");
          await reply.status(204).send();
        }
      }
    }
  });

  registerHealthRoute(app);
  registerBeaconRoutes(app);
  registerInternalRoutes(app);
  registerReportRoute(app);
  registerAppealRoute(app);
  registerDevLogin(app);
  registerImpersonationRoutes(app);

  const auth = getAuth();
  app.route({
    method: ["GET", "POST"],
    url: "/auth/*",
    async preHandler(req, reply) {
      try {
        await enforceAuthRateLimit(req);
      } catch (error) {
        const retryAfter = retryAfterOf(error);
        if (retryAfter !== null) {
          reply.header("retry-after", String(retryAfter));
          await reply.status(429).send({ error: "TOO_MANY_REQUESTS" });
          return reply;
        }
        throw error;
      }
    },
    async handler(req, reply) {
      const url = new URL(req.url, `${req.protocol}://${req.headers.host ?? "localhost"}`);
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        const lower = key.toLowerCase();
        if (lower === "content-length" || lower === "transfer-encoding" || lower === "connection") {
          continue;
        }
        if (typeof value === "string") headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(","));
      }
      const hasBody = req.method !== "GET" && req.body !== undefined && req.body !== null;
      const serialized = hasBody ? JSON.stringify(req.body) : undefined;
      if (serialized !== undefined) headers.set("content-type", "application/json");
      const request = new Request(url.toString(), {
        method: req.method,
        headers,
        body: serialized,
      });
      const response = await auth.handler(request);
      reply.status(response.status);
      for (const cookie of response.headers.getSetCookie()) reply.header("set-cookie", cookie);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
      });
      const text = await response.text();
      await reply.send(text.length > 0 ? text : null);
    },
  });

  await app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    trpcOptions: {
      router: appRouter,
      createContext: createTrpcContext,
      // tRPC answers its own errors, so without this a rejected procedure would
      // reach the log as a bare status code with no code, field, or reason.
      onError({ error, req }: { error: TRPCError; req: FastifyRequest }) {
        noteRequestFailure(req, describeTrpcError(error));
      },
      responseMeta({ errors }: { errors: readonly TRPCError[] }) {
        for (const error of errors) {
          const retryAfter = retryAfterOf(error) ?? retryAfterOf(error.cause);
          if (retryAfter !== null) {
            return { status: 429, headers: { "retry-after": String(retryAfter) } };
          }
        }
        return {};
      },
    },
  });

  return app;
}

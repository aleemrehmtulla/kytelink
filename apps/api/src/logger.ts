import pino, { type Logger } from "pino";
import { LogController, type FastifyReply, type FastifyRequest } from "fastify";
import { createPrettyStream, shouldPrettyPrint, SILENCED } from "./log/pretty";

export const prettyLogging = shouldPrettyPrint();

/**
 * One logger instance for the whole process, handed to fastify as
 * `loggerInstance` so app logs and request logs share a single stream and stay
 * in chronological order.
 */
export const logger: Logger = prettyLogging
  ? pino({ level: process.env.LOG_LEVEL ?? "info" }, createPrettyStream())
  : pino({ level: process.env.LOG_LEVEL ?? "info" });

/**
 * Every line names the subsystem it came from, so a running log can be scanned
 * (or grepped) by area: `boot`, `auth`, `trpc`, `http`, `domains`, `analytics`,
 * `moderation`, `workers`, `email`, `sitemap`, `redis`.
 */
export function taggedLogger(tag: string): Logger {
  return logger.child({ tag });
}

/**
 * Fastify's own "listening at" line is replaced by the boot banner in dev, and
 * a resolver's return value is always logged — so hand it a message the pretty
 * stream drops. Production keeps the normal structured line.
 */
export function listenTextResolver(address: string): string {
  return prettyLogging ? SILENCED : `listening on ${address}`;
}

/**
 * Drops fastify's built-in per-request chatter — the "incoming request" /
 * "request completed" pair and the 404 line — in favour of the single
 * request line emitted by log/request-log.ts, which knows about tRPC
 * procedures and the signed-in user. 5xx completions still come through here
 * so the error object and stack are never lost.
 */
class QuietLogController extends LogController {
  override incomingRequest(): void {}

  override routeNotFound(): void {}

  override requestCompleted(
    error: Error | null,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    if (error && reply.statusCode >= 500) super.requestCompleted(error, request, reply);
  }
}

export const quietLogController = new QuietLogController();

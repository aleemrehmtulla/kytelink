import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { logger } from "../logger";

// Not a tagged child: the tag varies per request (trpc / auth / beacon / …)
// and binding one on the child would emit a second, shadowed `tag` key.
const log = logger;

/**
 * Liveness and readiness probes are hit on a timer by every orchestrator, so
 * they are demoted to debug rather than drowning the log a dev is reading.
 */
const PROBE_PATHS = new Set(["/health", "/healthz", "/readyz"]);

interface RequestNote {
  actor?: string;
  failure?: string;
}

// Keyed by the fastify request so a note can be recorded from anywhere that
// sees it (the tRPC context, the tRPC error hook) without decorating the
// request type across module boundaries.
const notes = new WeakMap<FastifyRequest, RequestNote>();

function noteFor(req: FastifyRequest): RequestNote {
  let note = notes.get(req);
  if (!note) {
    note = {};
    notes.set(req, note);
  }
  return note;
}

/** Names the human behind the request so a log line answers "who did this?". */
export function noteRequestActor(req: FastifyRequest, actor: string): void {
  noteFor(req).actor = actor;
}

/**
 * tRPC answers its own errors, so fastify never sees them and a bare `400`
 * would be all a dev got. This records the code and reason for the line.
 */
export function noteRequestFailure(req: FastifyRequest, failure: string): void {
  const note = noteFor(req);
  note.failure ??= failure;
}

const MAX_REASON = 90;

interface ZodIssueLike {
  path?: (string | number)[];
  message?: string;
}

/**
 * A zod rejection arrives as a TRPCError whose message is the whole issue
 * array serialized — unreadable inline. The first issue is what a dev needs:
 * which field, and why.
 */
function firstZodIssue(cause: unknown): string | null {
  if (cause === null || typeof cause !== "object" || !("issues" in cause)) return null;
  const issues = (cause as { issues: unknown }).issues;
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const issue = issues[0] as ZodIssueLike;
  const field = (issue.path ?? []).join(".");
  const more = issues.length > 1 ? ` (+${String(issues.length - 1)} more)` : "";
  return `${field ? `${field}: ` : ""}${issue.message ?? "invalid"}${more}`;
}

export function describeTrpcError(error: { code: string; message: string; cause?: unknown }): string {
  const reason = firstZodIssue(error.cause) ?? error.message.replace(/\s+/g, " ").trim();
  if (reason.length === 0) return error.code;
  const clipped =
    reason.length > MAX_REASON ? `${reason.slice(0, MAX_REASON - 1)}…` : reason;
  return `${error.code}  ${clipped}`;
}

/** `/trpc/kyte.list,account.me?batch=1` is one HTTP call and two procedures. */
function trpcTarget(path: string): string {
  const procedures = path.slice("/trpc/".length).split(",").filter(Boolean);
  if (procedures.length <= 2) return procedures.join(", ");
  return `${procedures.slice(0, 2).join(", ")} +${String(procedures.length - 2)}`;
}

interface Classified {
  tag: string;
  target: string;
}

function classify(path: string): Classified {
  if (path.startsWith("/trpc/")) return { tag: "trpc", target: trpcTarget(path) };
  if (path.startsWith("/auth/")) return { tag: "auth", target: path.slice("/auth/".length) };
  if (path.startsWith("/t/")) return { tag: "beacon", target: path.slice("/t/".length) };
  if (path.startsWith("/internal/")) {
    return { tag: "internal", target: path.slice("/internal/".length) };
  }
  return { tag: "http", target: path };
}

function levelFor(status: number, isProbe: boolean): "debug" | "info" | "warn" | "error" {
  if (isProbe && status < 400) return "debug";
  if (status >= 500) return "error";
  if (status >= 400) return "warn";
  return "info";
}

export function registerRequestLog(app: FastifyInstance): void {
  app.addHook("onResponse", async (req: FastifyRequest, reply: FastifyReply) => {
    const path = req.url.split("?")[0] ?? req.url;
    const isProbe = PROBE_PATHS.has(path);
    const status = reply.statusCode;
    const { tag, target } = classify(path);
    const note = notes.get(req) ?? {};

    log[levelFor(status, isProbe)](
      {
        tag,
        kind: "request",
        method: req.method,
        status,
        ms: Math.round(reply.elapsedTime),
        target,
        actor: note.actor,
        note: note.failure,
      },
      `${req.method} ${path} ${String(status)}`,
    );
  });
}

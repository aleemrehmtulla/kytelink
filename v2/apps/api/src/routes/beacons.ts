import type { FastifyInstance, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { getAuth } from "../auth/auth";
import { ingestBeacon } from "../seams/analytics-seam";

// Product-event attribution comes from the session, never from the beacon body —
// otherwise any visitor can post events as any user. Only /t/event pays for this
// lookup; /t/page and /t/link fire on every profile visit and are anonymous by
// design, so they must not take a session round-trip on the hot path.
async function sessionUserIdFor(req: FastifyRequest): Promise<string | undefined> {
  try {
    const resolved = await getAuth().api.getSession({ headers: fromNodeHeaders(req.headers) });
    return resolved?.user?.id;
  } catch {
    return undefined;
  }
}

function parseBeacon(body: unknown): unknown {
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body ?? null;
}

function envelopeFor(req: FastifyRequest): {
  ip: string;
  userAgent?: string;
  headers: { "cf-ipcountry"?: string | string[]; "x-vercel-ip-country"?: string | string[] };
  body: unknown;
} {
  const userAgent = req.headers["user-agent"];
  return {
    ip: req.ip,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    headers: {
      "cf-ipcountry": req.headers["cf-ipcountry"],
      "x-vercel-ip-country": req.headers["x-vercel-ip-country"],
    },
    body: parseBeacon(req.body),
  };
}

/**
 * Preflight-free beacon endpoints. Always 202, never 5xx/block. Builds the
 * request envelope (ip/user-agent/geo headers + parsed body) that
 * AnalyticsSeam.ingestBeacon needs for server-side enrichment. sendBeacon posts
 * text/plain, so a text/plain parser is attached.
 */
export function registerBeaconRoutes(app: FastifyInstance): void {
  app.addContentTypeParser("text/plain", { parseAs: "string" }, (_req, body, done) =>
    done(null, body),
  );

  const kinds = { "/t/page": "page", "/t/link": "link", "/t/event": "event" } as const;

  for (const [path, kind] of Object.entries(kinds)) {
    app.post(path, async (req, reply) => {
      try {
        const sessionUserId = kind === "event" ? await sessionUserIdFor(req) : undefined;
        ingestBeacon(kind, { ...envelopeFor(req), sessionUserId });
      } catch {
        // beacons never fail the caller
      }
      await reply.status(202).send();
    });
  }

  app.post("/t/*", async (_req, reply) => {
    await reply.status(202).send();
  });
}

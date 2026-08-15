import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { resolveAdminActor } from "../auth/admin-actor";
import { buildLqipKey, quarantineKeyFor } from "../assets/keys";
import { getObjectWithMeta, isUploadsConfigured, type ObjectWithMeta } from "../assets/s3-client";

const querySchema = z.object({
  key: z.string().min(3).max(512),
  lqip: z.string().optional(),
});

// Canonical Asset.key shape: u/{kyteId}/{folder}/{file}. Anything else — q/
// keys, raw/ staging keys, traversal attempts — is refused; the q/ fallback
// below is the only way quarantined bytes leave the bucket.
const LIVE_KEY_PATTERN = /^u\/[\w-]+\/[\w./-]+$/;

async function readLiveOrQuarantined(liveKey: string): Promise<ObjectWithMeta | null> {
  try {
    return await getObjectWithMeta(liveKey);
  } catch {
    try {
      return await getObjectWithMeta(quarantineKeyFor(liveKey));
    } catch {
      return null;
    }
  }
}

/**
 * Admin-only asset reads. Suspending a kyte physically moves its objects to
 * the publicly-blocked q/ prefix while Asset.key stays canonical, so plain CDN
 * URLs 404 for exactly the pages an admin most needs to see. This route serves
 * the bytes wherever they currently live — u/ first, then q/ — behind the same
 * admin check as the impersonation routes.
 */
export function registerAdminAssetRoutes(app: FastifyInstance): void {
  app.get("/admin/assets/file", async (req, reply) => {
    const actor = await resolveAdminActor(req);
    if (!actor) {
      await reply.status(403).send({ error: "FORBIDDEN", message: "Admin access required." });
      return;
    }

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success || !LIVE_KEY_PATTERN.test(parsed.data.key) || parsed.data.key.includes("..")) {
      await reply.status(400).send({ error: "BAD_REQUEST", message: "Not a valid asset key." });
      return;
    }

    if (!isUploadsConfigured()) {
      await reply.status(404).send({ error: "NOT_FOUND", message: "Uploads are not configured." });
      return;
    }

    const key = parsed.data.lqip ? buildLqipKey(parsed.data.key) : parsed.data.key;
    const object = await readLiveOrQuarantined(key);
    if (!object) {
      await reply.status(404).send({ error: "NOT_FOUND", message: "No such object." });
      return;
    }

    // Keys are content-addressed (fresh ulid per upload, og by content hash),
    // so the bytes behind a key never change — only their u/-vs-q/ home does.
    await reply
      .header("content-type", object.contentType ?? "application/octet-stream")
      .header("cache-control", "private, max-age=31536000, immutable")
      .header("x-content-type-options", "nosniff")
      .send(Buffer.from(object.body));
  });
}

import type { FastifyInstance } from "fastify";
import { listDirectory } from "../internal/data";

/**
 * Public listing behind kytelink.com/discover. Unauthenticated on purpose: it
 * serves the sitemap's own URL set plus each page's public display name and
 * avatar — nothing that is not already on the profile it links to — and the
 * landing app that renders it has no internal-HMAC wiring to sign with.
 */
export function registerDirectoryRoute(app: FastifyInstance): void {
  app.get<{ Params: { page: string } }>("/directory/:page", async (req, reply) => {
    const page = /^[1-9]\d*$/.test(req.params.page)
      ? Number.parseInt(req.params.page, 10)
      : Number.NaN;
    if (!Number.isSafeInteger(page)) {
      await reply.status(400).send({ error: "BAD_REQUEST" });
      return;
    }
    reply.header("cache-control", "public, s-maxage=300, stale-while-revalidate=3600");
    await reply.status(200).send(await listDirectory(page));
  });
}

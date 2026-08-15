import type { NextApiRequest, NextApiResponse } from "next";
import { emptyUrlsetXml, fetchSitemapObject, minimalSitemapXml } from "../../../lib/sitemap";

const XML_CONTENT_TYPE = "application/xml; charset=utf-8";

// Serves /sitemap.xml (the index) and /sitemap-N.xml (the URL shards). The api
// sitemap worker writes both to the asset bucket; this route reads them back and
// serves a minimal valid document if the worker has not run yet. Never 500s.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const fileParam = req.query.file;
  const isShard = typeof fileParam === "string" && /^sitemap-\d+\.xml$/.test(fileParam);
  const objectName = isShard ? fileParam : "sitemap.xml";

  const stored = await fetchSitemapObject(objectName);
  const xml = stored ?? (isShard ? emptyUrlsetXml() : minimalSitemapXml());

  // A fallback body gets a short TTL: caching a degraded (empty) sitemap for an
  // hour is how a single slow bucket read turns into "0 discovered URLs" in
  // Search Console for the rest of that hour.
  const cacheControl = stored
    ? "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    : "public, max-age=0, s-maxage=60";

  res.setHeader("Content-Type", XML_CONTENT_TYPE);
  res.setHeader("Cache-Control", cacheControl);
  res.status(200).send(xml);
}

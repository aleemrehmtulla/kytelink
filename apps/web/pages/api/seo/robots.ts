import type { NextApiRequest, NextApiResponse } from "next";
import { publicWebUrl } from "../../../lib/env";

// Serves /robots.txt for the web zone (editor + public profiles). Public profile
// pages are indexable; the authenticated app surface is disallowed. Points crawlers
// at the sitemap (16-seo.md).
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const base = publicWebUrl().replace(/\/+$/, "");
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /edit",
    "Disallow: /account",
    "Disallow: /invites",
    "Disallow: /onboarding",
    "Disallow: /p/",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
  res.status(200).send(body);
}

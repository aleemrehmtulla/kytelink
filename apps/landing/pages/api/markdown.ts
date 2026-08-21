import type { NextApiRequest, NextApiResponse } from "next";
import { MARKDOWN_CONTENT_TYPE } from "@kytelink/schemas/markdown-negotiation";
import {
  buildNotFoundMarkdown,
  buildPageMarkdown,
} from "../../lib/markdown/build-page-markdown";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = typeof req.query.path === "string" ? req.query.path : "/";
  res.setHeader("Content-Type", MARKDOWN_CONTENT_TYPE);
  res.setHeader("Vary", "Accept");
  const markdown = buildPageMarkdown(path);
  if (markdown) {
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
    res.status(200).send(markdown);
    return;
  }
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
  res.status(404).send(buildNotFoundMarkdown(path));
}

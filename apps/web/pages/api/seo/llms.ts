import type { NextApiRequest, NextApiResponse } from "next";
import { buildLlmsTxt } from "../../../lib/llms";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
  res.status(200).send(buildLlmsTxt());
}

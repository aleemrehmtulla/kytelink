import type { NextApiRequest, NextApiResponse } from "next";
import { PRIMARY_HOSTS } from "../../../lib/host-routing";
import { buildRobotsTxt } from "../../../lib/robots";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const isPrimaryHost = PRIMARY_HOSTS.has(req.headers.host ?? "");
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600");
  res.status(200).send(buildRobotsTxt({ isPrimaryHost }));
}

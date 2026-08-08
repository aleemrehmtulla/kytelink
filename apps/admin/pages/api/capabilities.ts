import type { NextApiRequest, NextApiResponse } from "next";
import { readServerCapabilities } from "../../lib/capabilities";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json(readServerCapabilities());
}

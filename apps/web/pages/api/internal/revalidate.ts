import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";

const MAX_SKEW_MS = 5 * 60 * 1000;

function verify(rawBody: string, signature: string, timestamp: string, secret: string): boolean {
  const age = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_SKEW_MS) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  const secret = process.env.INTERNAL_API_SECRET;
  const signature = req.headers["x-signature"];
  const timestamp = req.headers["x-timestamp"];
  if (!secret || typeof signature !== "string" || typeof timestamp !== "string") {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const rawBody = JSON.stringify(req.body ?? {});
  if (!verify(rawBody, signature, timestamp, secret)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const paths = Array.isArray(req.body?.paths) ? (req.body.paths as unknown[]) : [];
  const revalidated: string[] = [];
  for (const path of paths) {
    if (typeof path !== "string") continue;
    try {
      await res.revalidate(path);
      revalidated.push(path);
    } catch {
      // a single bad path must not fail the batch
    }
  }

  res.status(200).json({ revalidated });
}

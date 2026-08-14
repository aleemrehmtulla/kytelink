import type { NextApiRequest, NextApiResponse } from "next";
import {
  INTERNAL_SIGNATURE_HEADER,
  INTERNAL_TIMESTAMP_HEADER,
  verifyInternalSignature,
} from "../../../lib/api/internal-hmac";

const MAX_SKEW_MS = 5 * 60 * 1000;

// The signature covers the bytes the API actually sent, so the body must not be
// parsed and re-serialized before it is verified.
export const config = { api: { bodyParser: false } };

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function pathsOf(rawBody: string): string[] {
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (typeof parsed !== "object" || parsed === null) return [];
    const paths = (parsed as { paths?: unknown }).paths;
    return Array.isArray(paths) ? paths.filter((path): path is string => typeof path === "string") : [];
  } catch {
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }

  const signature = req.headers[INTERNAL_SIGNATURE_HEADER];
  const timestamp = req.headers[INTERNAL_TIMESTAMP_HEADER];
  const rawBody = await readRawBody(req);
  const verified = await verifyInternalSignature(
    "POST",
    "/api/internal/revalidate",
    {
      signature: typeof signature === "string" ? signature : undefined,
      timestamp: typeof timestamp === "string" ? timestamp : undefined,
    },
    rawBody,
    MAX_SKEW_MS,
  );
  if (!verified) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const revalidated: string[] = [];
  for (const path of pathsOf(rawBody)) {
    try {
      await res.revalidate(path);
      revalidated.push(path);
    } catch {
      // a single bad path must not fail the batch
    }
  }

  res.status(200).json({ revalidated });
}

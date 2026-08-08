import { Worker } from "bullmq";
import { getConfig } from "../config";
import {
  INTERNAL_SIGNATURE_HEADER,
  INTERNAL_TIMESTAMP_HEADER,
  signInternalRequest,
} from "../internal/hmac";
import { getRedis } from "../redis";
import { adminAlert } from "./admin-alert";
import type { RevalidateJob } from "./queues";

const REVALIDATE_CONCURRENCY = 5;

export function startRevalidateWorker(): Worker {
  const config = getConfig();
  const worker = new Worker<RevalidateJob>(
    "revalidate",
    async (job) => {
      const body = JSON.stringify({ paths: job.data.paths, reason: job.data.reason });
      const timestamp = Date.now().toString();
      const path = "/api/internal/revalidate";
      const signature = signInternalRequest(config.internalApiSecret, "POST", path, timestamp, body);
      const response = await fetch(`${config.webBaseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [INTERNAL_TIMESTAMP_HEADER]: timestamp,
          [INTERNAL_SIGNATURE_HEADER]: signature,
        },
        body,
      });
      if (!response.ok) {
        throw new Error(`revalidate target returned ${response.status}`);
      }
    },
    { connection: getRedis(), concurrency: REVALIDATE_CONCURRENCY },
  );

  worker.on("failed", (job, error) => {
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      void adminAlert("revalidate_dead_letter", `Revalidate job ${job.id} exhausted retries`, {
        paths: job.data.paths,
        error: error.message,
      });
    }
  });

  return worker;
}

import { getDb } from "@kytelink/db";
import { taggedLogger } from "../logger";

const log = taggedLogger("workers");

/**
 * The ONLY admin-notification path (doc 06): writes an AdminAlert row, surfaced
 * in the admin app. Never sends email. Named adminAlert (not `alert`) to avoid
 * the browser global collision.
 */
export async function adminAlert(
  kind: string,
  message: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await getDb().adminAlert.create({
      data: { kind, message, meta: meta ? JSON.parse(JSON.stringify(meta)) : undefined },
    });
  } catch (error) {
    log.error({ err: error, kind }, "could not record an admin alert — it will not show in the admin app");
  }
}

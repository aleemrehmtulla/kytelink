import {
  hostsIncludeRedirectTarget,
  isSelfRedirect,
  type ProfileContent,
} from "@kytelink/schemas";
import { TRPCError } from "@trpc/server";
import type { Store } from "../store/store";

// Runs on every path that captures a publishable snapshot (publish, schedule
// create/update); scheduled publishes fire the captured snapshot, so the worker
// itself needs no guard. A domain added after capture is healed at serve time
// in internal/data.ts.
export async function assertRedirectDoesNotLoop(
  store: Store,
  kyte: { id: string; username: string | null },
  content: ProfileContent,
): Promise<void> {
  const { shouldRedirect, redirectUrl } = content;
  if (!shouldRedirect || !redirectUrl) return;
  if (kyte.username && isSelfRedirect({ redirectUrl, username: kyte.username })) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Redirect points at this kyte's own profile, which would loop forever.",
    });
  }
  const domains = await store.listDomains(kyte.id);
  if (hostsIncludeRedirectTarget(domains.map((d) => d.host), redirectUrl)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Redirect points at this kyte's own custom domain, which would loop forever.",
    });
  }
}

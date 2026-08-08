// Phase-5 pre-launch moderation seed-sweep demo (18-migration.md script 04,
// 10-moderation.md), not part of the automated suite (`.manual.ts`). Drives the
// REAL sweep (runSeedSweep + reviewKyte + runDeterministicChecks, all imported
// from apps/api) over a set of migrated-style published kytes plus one planted
// known-spam profile, using the fake in-memory moderation store so the run is
// self-contained. It shows the spam wave launching ALREADY SUSPENDED: the sweep
// reviews every published kyte before DNS flips, the deterministic pre-check
// suspends the phishing profile (writing a ModerationReview with its tripped
// signals so launch-day admin filtering works) and enqueues its asset
// quarantine, while clean profiles are approved.
//
// Run (from tools/seed/): npx tsx src/legacy-backfill/demo-seed-sweep.manual.ts
import { createFakeModerationStore } from "@kytelink/api/src/moderation/fake-store";
import { createNoneProvider } from "@kytelink/api/src/moderation/provider-none";
import { runSeedSweep } from "@kytelink/api/src/moderation/seed-sweep";
import type { ModerationKyteSnapshot } from "@kytelink/api/src/moderation/types";

// Logger type taken from the sweep's own signature (pino isn't a tools/seed dep).
type SweepLogger = Parameters<typeof runSeedSweep>[2];

// A silent no-op logger — this demo prints its own report, not pino lines.
function silentLogger(): SweepLogger {
  const noop = (): void => {};
  const base: Record<string, unknown> = {};
  for (const level of ["trace", "debug", "info", "warn", "error", "fatal", "silent"]) base[level] = noop;
  base.child = () => silentLogger();
  base.level = "silent";
  return base as unknown as SweepLogger;
}

function snapshot(partial: Partial<ModerationKyteSnapshot> & { kyteId: string }): ModerationKyteSnapshot {
  return {
    orgId: `org_${partial.kyteId}`,
    username: partial.kyteId,
    displayName: null,
    description: null,
    links: [],
    icons: [],
    avatarAssetId: null,
    avatarUrl: null,
    redirectUrl: null,
    ownerEmailDomain: null,
    publishSeq: 1,
    moderationStatus: "APPROVED",
    contentHash: null,
    ...partial,
  };
}

const SEED: ModerationKyteSnapshot[] = [
  snapshot({ kyteId: "googlefull", displayName: "Google Full", links: [{ title: "GitHub", url: "https://github.com/aleem" }] }),
  snapshot({ kyteId: "githubfull", displayName: "Github Full", links: [{ title: "Portfolio", url: "https://githubfull.io" }] }),
  snapshot({ kyteId: "founder", displayName: "Founder", description: "The Kytelink founder." }),
  // Planted known-spam profile: brand-impersonation display name + a link on the
  // URL blocklist. This is the spam wave the founder wants dark at launch.
  snapshot({
    kyteId: "metamask_phish",
    username: "metamask-support",
    displayName: "MetaMask Support",
    description: "Verify your wallet to unlock rewards",
    links: [{ title: "Verify wallet", url: "https://grabify.link/steal" }],
    ownerEmailDomain: "gmail.com",
  }),
];

async function main(): Promise<void> {
  const store = createFakeModerationStore(SEED);
  const provider = createNoneProvider();
  const log = silentLogger();

  const result = await runSeedSweep(store, provider, log);
  process.stdout.write(`sweep result: ${JSON.stringify(result)}\n`);

  const phish = store.kytes.get("metamask_phish");
  const clean = store.kytes.get("googlefull");
  const review = [...store.reviews].reverse().find((r) => r.kyteId === "metamask_phish");

  process.stdout.write(`planted phishing profile status: ${phish?.moderationStatus}\n`);
  process.stdout.write(`clean profile status: ${clean?.moderationStatus}\n`);
  process.stdout.write(`phishing review: verdict=${review?.verdict} provider=${review?.provider} categories=[${review?.categories.join(",")}]\n`);
  process.stdout.write(`phishing review signals: ${JSON.stringify(review?.signals)}\n`);
  process.stdout.write(`assets enqueued for quarantine: [${[...store.quarantinedKyteIds].join(",")}]\n`);
  process.stdout.write(`suspended-owner emails queued: ${store.suspendedEmailCalls.length}, revalidations: ${store.revalidateCalls.length}\n`);

  const ok =
    result.suspended === 1 &&
    result.approved === SEED.length - 1 &&
    phish?.moderationStatus === "SUSPENDED" &&
    clean?.moderationStatus === "APPROVED" &&
    review?.verdict === "SUSPEND" &&
    store.quarantinedKyteIds.has("metamask_phish");
  if (!ok) throw new Error("seed sweep did not suspend the planted spam profile as expected");
  process.stdout.write(
    "PASS: pre-launch seed sweep suspended the known-spam profile (deterministic brand+blocklist hit), " +
      "wrote a ModerationReview with signals, and enqueued its asset quarantine — spam launches dark; clean profiles approved.\n",
  );
}

main().catch((error) => {
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});

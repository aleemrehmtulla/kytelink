import {
  createPrismaModerationStore,
  createProviderFromEnv,
  runSeedSweep,
} from "../moderation";
import { taggedLogger } from "../logger";

const log = taggedLogger("moderation");

// Pre-launch moderation seed sweep (18-migration.md script 04, 10-moderation.md).
// Reviews EVERY seeded published kyte before DNS flips so the known spam wave
// launches already suspended: deterministic checks first (free — brand keywords,
// punycode/lookalike hosts, URL blocklists, sketchy TLDs, free-mail impersonation),
// then the configured AI provider over the published content ("not too aggressive"
// — ambiguous/low-confidence approves). Each verdict writes a normal ModerationReview
// with its tripped signals (so launch-day admin filtering works immediately) and a
// suspending verdict enqueues the asset-quarantine move. Idempotent/resumable via the
// per-kyte content-hash review cache.
//
// Run against the ALREADY-SEEDED target DB (the same DATABASE_URL + REDIS_URL +
// MODERATION_PROVIDER/OPENAI_API_KEY the API uses). Safe to run repeatedly and to
// re-run at cutover for rows that changed during the warm-up window.
//   pnpm --filter @kytelink/api seed-sweep
async function main(): Promise<void> {
  const store = createPrismaModerationStore(log);
  const provider = createProviderFromEnv();
  log.info({ provider: provider.name }, "pre-launch moderation seed sweep starting");
  const result = await runSeedSweep(store, provider, log);
  process.stdout.write(
    `seed sweep complete: reviewed=${result.reviewed} suspended=${result.suspended} ` +
      `approved=${result.approved} skipped=${result.skipped}\n`,
  );
  process.stdout.write(
    "Review the suspended count in the admin app's suspended view (signal filters) before flipping DNS.\n",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
    process.exit(1);
  });

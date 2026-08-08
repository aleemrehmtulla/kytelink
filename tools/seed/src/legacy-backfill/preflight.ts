import Redis from "ioredis";
import { S3AssetStore } from "./real-seams";
import { LegacySource } from "./legacy-source";
import { createTargetClient } from "./target-client";
import { describeDatabase, type BackfillConfig } from "./config";
import { Checkpoint } from "./checkpoint";
import { isLegacyAssetUrl, LEGACY_ASSET_HOSTS } from "./mapping";
import { scanTestData } from "./test-data";
import type { LegacySnapshot } from "./legacy-source";

export type PreflightSeverity = "blocker" | "launch" | "info";

export type PreflightCheck = {
  name: string;
  severity: PreflightSeverity;
  pass: boolean;
  detail: string;
};

export type PreflightReport = {
  pass: boolean;
  checks: PreflightCheck[];
};

const PLACEHOLDER_SECRET_MARKERS = ["dev-only", "change-me", "changeme", "replace-me", "xxxx"];

function isPlaceholderSecret(value: string | undefined): boolean {
  if (!value) return true;
  const lowered = value.toLowerCase();
  return PLACEHOLDER_SECRET_MARKERS.some((marker) => lowered.includes(marker));
}

function isLocalUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return value.toLowerCase().includes("localhost");
  }
}

function check(
  name: string,
  severity: PreflightSeverity,
  pass: boolean,
  detail: string,
): PreflightCheck {
  return { name, severity, pass, detail };
}

async function checkTarget(config: BackfillConfig, resumable: boolean): Promise<PreflightCheck[]> {
  const checks: PreflightCheck[] = [];
  const db = createTargetClient(config.targetUrl);
  try {
    try {
      const applied = await db.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
      );
      const migrationCount = Number(applied[0]?.count ?? 0);
      checks.push(
        check(
          "target-schema",
          "blocker",
          migrationCount > 0,
          migrationCount > 0
            ? `${String(migrationCount)} prisma migrations applied to ${describeDatabase(config.targetUrl)}`
            : "no prisma migrations applied — run the `schema` step first",
        ),
      );
    } catch (error) {
      checks.push(
        check(
          "target-schema",
          "blocker",
          false,
          `cannot read _prisma_migrations on ${describeDatabase(config.targetUrl)} — run the \`schema\` step ` +
            `first, or check the connection string (${String(error)})`,
        ),
      );
      return checks;
    }

    const [users, orgs, kytes, published, domains, assets, accounts] = await Promise.all([
      db.user.count(),
      db.organization.count(),
      db.kyte.count(),
      db.publishedKyte.count(),
      db.domain.count(),
      db.asset.count(),
      db.account.count(),
    ]);
    const total = users + orgs + kytes + published + domains + assets + accounts;
    checks.push(
      check(
        "target-contents",
        "info",
        true,
        `users=${String(users)} orgs=${String(orgs)} kytes=${String(kytes)} published=${String(published)} ` +
          `domains=${String(domains)} assets=${String(assets)} accounts=${String(accounts)} (total ${String(total)})`,
      ),
    );

    // A non-empty target is expected on a re-run or the cutover delta (there is
    // a checkpoint from the earlier run). A non-empty target with no checkpoint
    // means rows arrived from somewhere this migration does not know about —
    // staging smoke tests, a manual signup — and `verify`'s exact count checks
    // will fail on them at the launch gate.
    checks.push(
      check(
        "target-fresh",
        "launch",
        total === 0 || resumable,
        total === 0
          ? "target is empty"
          : resumable
            ? `target holds ${String(total)} rows from an earlier backfill run (checkpoint present) — a re-run is idempotent`
            : `target holds ${String(total)} rows but there is no backfill checkpoint. Anything not copied from v1 will ` +
              "make `verify`'s count checks fail. Confirm where these came from before seeding.",
      ),
    );

    const scan = await scanTestData(db);
    checks.push(
      check(
        "no-test-data",
        "blocker",
        scan.total === 0,
        scan.total === 0
          ? "no sample-seed or agent-mode rows in the target"
          : `found ${String(scan.total)} seeded test rows — users=[${scan.users.map((u) => u.email).join(", ")}] ` +
            `orgs=[${scan.organizations.map((o) => o.id).join(", ")}] kytes=[${scan.kytes.map((k) => k.username ?? k.id).join(", ")}]. ` +
            "Run `purge-test-data --yes` before seeding production.",
      ),
    );
  } catch (error) {
    checks.push(
      check("target-reachable", "blocker", false, `cannot query the target database: ${String(error)}`),
    );
  } finally {
    await db.$disconnect();
  }
  return checks;
}

function imageUrlsIn(snapshot: LegacySnapshot): string[] {
  const urls: string[] = [];
  for (const row of [...snapshot.prods, ...snapshot.drafts]) {
    if (row.pfp) urls.push(row.pfp);
    if (!Array.isArray(row.links)) continue;
    for (const link of row.links) {
      if (typeof link !== "object" || link === null) continue;
      const emoji = (link as { emoji?: unknown }).emoji;
      if (typeof emoji === "string" && /^https?:\/\//i.test(emoji)) urls.push(emoji);
    }
  }
  return urls;
}

// Only hosts on LEGACY_ASSET_HOSTS are downloaded and re-uploaded; anything else
// is left pointing at wherever it lives today. If v1 has images on a host nobody
// remembered, this is the last moment to notice — after cutover those profiles
// depend on a service that is being switched off.
function checkAssetHosts(snapshot: LegacySnapshot): PreflightCheck {
  const unknown = new Map<string, number>();
  for (const url of imageUrlsIn(snapshot)) {
    if (isLegacyAssetUrl(url)) continue;
    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      host = "<unparseable>";
    }
    unknown.set(host, (unknown.get(host) ?? 0) + 1);
  }
  const listed = [...unknown.entries()].sort((a, b) => b[1] - a[1]);
  return check(
    "asset-hosts",
    "launch",
    listed.length === 0,
    listed.length === 0
      ? `every legacy image is on a migrated host (${LEGACY_ASSET_HOSTS.join(", ")})`
      : `images on hosts the migration does not copy: ${listed.map(([host, count]) => `${host} (${String(count)})`).join(", ")}. ` +
        `They stay pointing at those hosts after cutover — add them to LEGACY_ASSET_HOSTS in mapping.ts to migrate them.`,
  );
}

async function checkSource(config: BackfillConfig): Promise<PreflightCheck[]> {
  const checks: PreflightCheck[] = [];
  const source = new LegacySource(config.legacyReadonlyUrl);
  try {
    await source.assertReadOnly();
    checks.push(
      check(
        "source-read-only",
        "blocker",
        true,
        `probe INSERT rejected on ${describeDatabase(config.legacyReadonlyUrl)} — the v1 connection cannot write`,
      ),
    );
    const counts = await source.counts();
    checks.push(
      check(
        "source-contents",
        "info",
        true,
        Object.entries(counts)
          .map(([table, value]) => `${table}=${String(value)}`)
          .join(" "),
      ),
    );
    checks.push(
      check(
        "source-not-empty",
        "blocker",
        (counts.User ?? 0) > 0,
        (counts.User ?? 0) > 0 ? "v1 User table has rows" : "v1 User table is empty — wrong connection string?",
      ),
    );
    checks.push(checkAssetHosts(await source.read()));
  } catch (error) {
    checks.push(check("source-read-only", "blocker", false, `v1 source check failed: ${String(error)}`));
  } finally {
    await source.close();
  }
  return checks;
}

async function checkRedis(env: NodeJS.ProcessEnv): Promise<PreflightCheck> {
  const url = env.REDIS_URL;
  if (!url) return check("redis", "blocker", false, "REDIS_URL is unset — the beacon set cannot be built");
  const redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
  try {
    await redis.connect();
    const pong = await redis.ping();
    return check("redis", "blocker", pong === "PONG", `PING -> ${pong}`);
  } catch (error) {
    return check("redis", "blocker", false, `cannot reach Redis: ${String(error)}`);
  } finally {
    redis.disconnect();
  }
}

// A real round trip rather than a credential shape check: the migration's whole
// asset phase is PutObject, and a bucket that only fails on the first write
// wastes hours of downloads.
async function checkBucket(env: NodeJS.ProcessEnv): Promise<PreflightCheck> {
  const bucket = env.AWS_S3_BUCKET;
  const endpoint = env.AWS_ENDPOINT_URL;
  const accessKeyId = env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    return check(
      "bucket",
      "blocker",
      false,
      "AWS_S3_BUCKET / AWS_ENDPOINT_URL / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY must all be set",
    );
  }
  const store = new S3AssetStore({
    endpoint,
    region: env.AWS_REGION ?? "auto",
    accessKeyId,
    secretAccessKey,
    bucket,
  });
  const key = "_preflight/backfill-probe.webp";
  try {
    await store.put(key, new Uint8Array([0x52, 0x49, 0x46, 0x46]), "image/webp");
    const head = await store.head(key);
    if (!head) return check("bucket", "blocker", false, `PutObject succeeded but HeadObject found nothing at ${key}`);
    return check("bucket", "blocker", true, `put+head+delete round trip on ${bucket} (${String(head.size)} bytes)`);
  } catch (error) {
    return check("bucket", "blocker", false, `bucket round trip failed: ${String(error)}`);
  } finally {
    await store.delete(key).catch(() => undefined);
  }
}

async function checkClickhouse(env: NodeJS.ProcessEnv): Promise<PreflightCheck> {
  const url = env.CLICKHOUSE_URL;
  if (!url) return check("clickhouse", "launch", false, "CLICKHOUSE_URL unset — analytics stay off");
  const target = new URL("/?query=SELECT%201", url);
  try {
    const response = await fetch(target, {
      headers: {
        "x-clickhouse-user": env.CLICKHOUSE_USER ?? "default",
        "x-clickhouse-key": env.CLICKHOUSE_PASSWORD ?? "",
      },
      signal: AbortSignal.timeout(10_000),
    });
    return check("clickhouse", "launch", response.ok, `SELECT 1 -> HTTP ${String(response.status)}`);
  } catch (error) {
    return check("clickhouse", "launch", false, `cannot reach ClickHouse: ${String(error)}`);
  }
}

async function checkCdn(env: NodeJS.ProcessEnv): Promise<PreflightCheck> {
  const base = env.NEXT_PUBLIC_CDN_URL;
  if (!base) return check("cdn", "blocker", false, "NEXT_PUBLIC_CDN_URL is unset");
  try {
    const response = await fetch(base, { method: "HEAD", signal: AbortSignal.timeout(10_000) });
    // Any HTTP answer proves DNS + TLS + a bucket binding; a bare bucket root
    // legitimately answers 403/404.
    return check("cdn", "launch", response.status < 500, `HEAD ${base} -> HTTP ${String(response.status)}`);
  } catch (error) {
    return check("cdn", "launch", false, `${base} is not resolving: ${String(error)}`);
  }
}

function checkLaunchEnv(env: NodeJS.ProcessEnv): PreflightCheck[] {
  const checks: PreflightCheck[] = [];

  checks.push(
    check(
      "admin-emails",
      "blocker",
      (env.ADMIN_EMAILS ?? "").trim().length > 0,
      env.ADMIN_EMAILS
        ? `platform admins: ${env.ADMIN_EMAILS}`
        : "ADMIN_EMAILS is empty — nobody would be able to reach the admin app after cutover",
    ),
  );

  checks.push(
    check(
      "agent-mode-off",
      "blocker",
      (env.AGENT_MODE ?? "false").toLowerCase() !== "true",
      env.AGENT_MODE === "true"
        ? "AGENT_MODE=true seeds dev accounts and a login bypass — apps/api refuses to boot with it in production"
        : "AGENT_MODE is off",
    ),
  );

  const secretIssues = (["AUTH_SECRET", "INTERNAL_API_SECRET"] as const).filter((key) =>
    isPlaceholderSecret(env[key]),
  );
  checks.push(
    check(
      "auth-secrets",
      "launch",
      secretIssues.length === 0,
      secretIssues.length === 0
        ? "AUTH_SECRET and INTERNAL_API_SECRET are real values"
        : `${secretIssues.join(", ")} still hold the placeholder value — anyone with the repo can forge sessions. ` +
          "Regenerate with `openssl rand -hex 32`.",
    ),
  );

  const localUrls = (["WEB_BASE_URL", "API_BASE_URL", "LANDING_ZONE_URL", "ADMIN_BASE_URL", "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_WEB_URL", "NEXT_PUBLIC_LANDING_URL"] as const).filter(
    (key) => isLocalUrl(env[key]),
  );
  checks.push(
    check(
      "public-urls",
      "launch",
      localUrls.length === 0,
      localUrls.length === 0
        ? "every base URL points at a public host"
        : `still localhost: ${localUrls.join(", ")} — cookies, CORS and OAuth callbacks will not work in production`,
    ),
  );

  const emailProvider = env.EMAIL_PROVIDER ?? "console";
  const emailOk =
    (emailProvider === "resend" && (env.RESEND_API_KEY ?? "").length > 0) ||
    (emailProvider === "smtp" && (env.SMTP_HOST ?? "").length > 0 && !isLocalUrl(`http://${env.SMTP_HOST ?? ""}`));
  checks.push(
    check(
      "email-delivery",
      "launch",
      emailOk,
      emailOk
        ? `email provider ${emailProvider} configured`
        : `EMAIL_PROVIDER=${emailProvider} with SMTP_HOST=${env.SMTP_HOST ?? "<unset>"} — login codes would go to a ` +
          "local mailpit nobody can read. Set EMAIL_PROVIDER=resend + RESEND_API_KEY, or a real SMTP host.",
    ),
  );

  const moderationOn = env.MODERATION_PROVIDER === "openai" && (env.OPENAI_API_KEY ?? "").length > 0;
  checks.push(
    check(
      "moderation",
      "launch",
      moderationOn,
      moderationOn ? "openai moderation configured for the seed sweep" : "seed sweep would run deterministic checks only",
    ),
  );

  const domainProvider = (env.DOMAIN_PROVIDER ?? "proxy").toLowerCase();
  const domainsOk =
    domainProvider === "vercel"
      ? Boolean(env.VERCEL_TOKEN && env.VERCEL_TEAM && env.VERCEL_PROJECT)
      : Boolean(env.CUSTOM_DOMAIN_A_RECORD ?? env.CUSTOM_DOMAIN_CNAME_TARGET);
  checks.push(
    check(
      "custom-domains",
      "launch",
      domainsOk,
      domainsOk
        ? `domain provider ${domainProvider} configured`
        : `DOMAIN_PROVIDER=${domainProvider} with no targets/credentials. Migrated v1 domains import as verified ` +
          "and the reaper releases them 48h later — configure this before seeding.",
    ),
  );

  checks.push(
    check(
      "state-dir",
      "launch",
      Boolean(env.BACKFILL_STATE_DIR),
      env.BACKFILL_STATE_DIR
        ? `checkpoints in ${env.BACKFILL_STATE_DIR}`
        : "BACKFILL_STATE_DIR is unset — checkpoints land in ./.backfill-state relative to the cwd, so the delta run " +
          "must be started from the same directory as the warm-up run",
    ),
  );

  return checks;
}

export async function runPreflight(
  config: BackfillConfig,
  env: NodeJS.ProcessEnv,
): Promise<PreflightReport> {
  const checkpoint = new Checkpoint(config.checkpointDir);
  const previousHashes = await checkpoint.readJson<Record<string, string>>("source-hash", {});
  const resumable = Object.keys(previousHashes).length > 0;

  const [target, source, redis, bucket, clickhouse, cdn] = await Promise.all([
    checkTarget(config, resumable),
    checkSource(config),
    checkRedis(env),
    checkBucket(env),
    checkClickhouse(env),
    checkCdn(env),
  ]);

  const checks = [...checkLaunchEnv(env), ...target, ...source, redis, bucket, clickhouse, cdn];
  return { pass: checks.every((entry) => entry.severity !== "blocker" || entry.pass), checks };
}

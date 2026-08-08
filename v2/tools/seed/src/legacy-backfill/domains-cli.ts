import { Client } from "pg";
import { createVercelDomainProvider } from "@kytelink/api/src/domains/vercel-provider";
import type { DomainConnectionState } from "@kytelink/api/src/domains/provider";
import { loadEnvFile, resolveEnvFilePath } from "./env-file";
import { loadConfig, BackfillConfigError } from "./config";
import { createTargetClient } from "./target-client";
import { Checkpoint } from "./checkpoint";

export const REAPED_DOMAINS_CHECKPOINT = "reaped-domains";


const CONCURRENCY = 8;
const VERCEL_API = "https://api.vercel.com";

function log(message: string): void {
  process.stdout.write(`[domains] ${message}\n`);
}

const quietLogger = {
  warn: (...args: unknown[]) =>
    log(`warn: ${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}`),
  info: () => {},
};

interface VercelConfig {
  token: string;
  team: string;
  project: string;
}

function readVercelConfig(env: NodeJS.ProcessEnv): VercelConfig {
  const token = env.VERCEL_TOKEN?.trim();
  const team = env.VERCEL_TEAM?.trim();
  const project = env.VERCEL_PROJECT?.trim();
  if (!token || !team || !project) {
    throw new BackfillConfigError(
      "custom domain sync needs VERCEL_TOKEN, VERCEL_TEAM and VERCEL_PROJECT in the env file.",
    );
  }
  return { token, team, project };
}

function buildProtectedSet(env: NodeJS.ProcessEnv): Set<string> {
  const protectedHosts = new Set<string>();
  for (const key of ["WEB_HOSTNAME", "LANDING_HOSTNAME", "ADMIN_HOSTNAME", "API_HOSTNAME"]) {
    const value = env[key]?.trim().toLowerCase();
    if (value) protectedHosts.add(value);
  }
  for (const key of ["WEB_BASE_URL", "LANDING_ZONE_URL", "ADMIN_BASE_URL", "API_BASE_URL", "NEXT_PUBLIC_CDN_URL"]) {
    const raw = env[key]?.trim();
    if (!raw) continue;
    try {
      protectedHosts.add(new URL(raw).hostname.toLowerCase());
    } catch {
      /* not a url — ignore */
    }
  }
  return protectedHosts;
}

function isPlatformHost(host: string, protectedHosts: ReadonlySet<string>): boolean {
  const lowered = host.toLowerCase();
  if (protectedHosts.has(lowered)) return true;
  if (lowered === "kytelink.com" || lowered.endsWith(".kytelink.com")) return true;
  if (lowered.endsWith(".vercel.app")) return true;
  return false;
}

async function listVercelDomains(config: VercelConfig): Promise<string[]> {
  const hosts: string[] = [];
  let since: number | undefined;
  for (;;) {
    const url =
      `${VERCEL_API}/v9/projects/${encodeURIComponent(config.project)}/domains` +
      `?teamId=${encodeURIComponent(config.team)}&limit=100${since ? `&until=${String(since)}` : ""}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`Vercel domain list failed: HTTP ${String(response.status)} ${await response.text()}`);
    }
    const body = (await response.json()) as {
      domains?: { name: string }[];
      pagination?: { next?: number | null };
    };
    for (const entry of body.domains ?? []) hosts.push(entry.name.toLowerCase());
    const next = body.pagination?.next;
    if (!next) break;
    since = next;
  }
  return [...new Set(hosts)];
}

async function pooled<T, R>(items: T[], worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        const item = items[index];
        if (item === undefined) break;
        results[index] = await worker(item);
      }
    }),
  );
  return results;
}

async function readLegacyDomains(url: string): Promise<Map<string, string>> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    const rows = (await client.query<{ domain: string; userId: string }>(
      'SELECT domain, "userId" FROM "Domains"',
    )).rows;
    await client.query("ROLLBACK");
    return new Map(rows.map((row) => [row.domain.trim().toLowerCase(), row.userId]));
  } finally {
    await client.end();
  }
}

function apexOf(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : host;
}

type Row = {
  host: string;
  onVercel: boolean;
  legacyOwner: string | null;
  dbOwner: string | null;
  state: DomainConnectionState | null;
};

async function main(): Promise<void> {
  const envFilePath = resolveEnvFilePath(process.argv, process.env);
  if (envFilePath) loadEnvFile(envFilePath);

  const apply = process.argv.includes("--yes");
  const reap = process.argv.includes("--reap");
  const config = loadConfig(process.env);
  const vercel = readVercelConfig(process.env);
  const provider = createVercelDomainProvider(vercel, quietLogger);
  const protectedHosts = buildProtectedSet(process.env);
  const db = createTargetClient(config.targetUrl);

  try {
    const [vercelHosts, legacyOwners, dbRows] = await Promise.all([
      listVercelDomains(vercel),
      readLegacyDomains(config.legacyReadonlyUrl),
      db.domain.findMany({ select: { domain: true, kyteId: true } }),
    ]);
    const dbOwners = new Map(dbRows.map((row) => [row.domain.toLowerCase(), row.kyteId]));

    log(`vercel project "${vercel.project}": ${String(vercelHosts.length)} domains attached`);
    log(`v1 Domains table: ${String(legacyOwners.size)} custom domains`);
    log(`v2 Domain table:  ${String(dbOwners.size)} rows`);

    const checkpoint = new Checkpoint(config.checkpointDir);
    const reaped = await checkpoint.loadSet(REAPED_DOMAINS_CHECKPOINT);
    if (reaped.size > 0) log(`previously reaped (stay deleted): ${String(reaped.size)}`);

    const universe = new Set<string>([...vercelHosts, ...legacyOwners.keys(), ...dbOwners.keys()]);
    const candidates = [...universe]
      .filter((host) => !isPlatformHost(host, protectedHosts))
      .filter((host) => !reaped.has(host) || vercelHosts.includes(host))
      .sort();
    const skipped = [...universe].filter((host) => isPlatformHost(host, protectedHosts)).sort();
    if (skipped.length > 0) log(`protected (never touched): ${skipped.join(", ")}`);

    const rows = await pooled<string, Row>(candidates, async (host) => {
      const onVercel = vercelHosts.includes(host);
      let state: DomainConnectionState | null = null;
      if (onVercel) {
        try {
          state = await provider.status(host);
        } catch {
          state = "ERROR";
        }
      }
      return {
        host,
        onVercel,
        legacyOwner: legacyOwners.get(host) ?? null,
        dbOwner: dbOwners.get(host) ?? null,
        state,
      };
    });

    const legacyApexes = new Set([...legacyOwners.keys()].map(apexOf));
    const isKnown = (row: Row) => row.legacyOwner !== null || legacyApexes.has(apexOf(row.host));

    const needsAttach = rows.filter((r) => isKnown(r) && !r.onVercel);
    const wrongOwner = rows.filter(
      (r) => r.legacyOwner !== null && r.dbOwner !== null && r.legacyOwner !== r.dbOwner,
    );
    const missingDbRow = rows.filter((r) => r.legacyOwner !== null && r.dbOwner === null);
    const connected = rows.filter((r) => r.onVercel && r.state === "CONNECTED");
    const phantomDns = rows.filter((r) => r.onVercel && r.state === "PENDING" && isKnown(r));
    const orphans = rows.filter((r) => r.onVercel && !isKnown(r) && r.state === "PENDING");
    const liveOrphans = rows.filter((r) => r.onVercel && !isKnown(r) && r.state === "CONNECTED");
    const inconclusive = rows.filter((r) => r.onVercel && r.state === "ERROR");

    log("");
    log(`CONNECTED   ${String(connected.length)}  live, DNS points at this project`);
    log(`ATTACH      ${String(needsAttach.length)}  in v1 but not on the project — dark until attached`);
    log(`PHANTOM     ${String(phantomDns.length)}  attached but DNS not pointing here`);
    log(`ORPHAN      ${String(orphans.length)}  on the project, unknown to v1, DNS not pointing here`);
    log(`LIVE ORPHAN ${String(liveOrphans.length)}  unknown to v1 but SERVING — never reaped, review by hand`);
    log(`WRONG OWNER ${String(wrongOwner.length)}  v2 row maps to a different kyte than v1 says`);
    log(`NO DB ROW   ${String(missingDbRow.length)}  in v1 but no v2 Domain row`);
    log(`INCONCLUSIVE ${String(inconclusive.length)} could not determine — never touched`);
    log("");
    for (const r of needsAttach) log(`  attach    ${r.host}`);
    for (const r of phantomDns) log(`  phantom   ${r.host}  (owner ${r.legacyOwner ?? "?"})`);
    for (const r of orphans) log(`  orphan    ${r.host}  state=${r.state ?? "?"}`);
    for (const r of liveOrphans) log(`  LIVE      ${r.host}  serving now — kept`);
    for (const r of wrongOwner) log(`  MISMATCH  ${r.host}  v1=${r.legacyOwner ?? "?"} v2=${r.dbOwner ?? "?"}`);
    for (const r of missingDbRow) log(`  no-db-row ${r.host}  v1 owner ${r.legacyOwner ?? "?"}`);
    for (const r of inconclusive) log(`  unknown   ${r.host}`);

    if (!apply) {
      log("");
      log("DRY RUN — nothing changed. Re-run with --yes to attach, and --reap to also delete.");
      return;
    }

    for (const row of missingDbRow) {
      const owner = row.legacyOwner;
      if (!owner) continue;
      await db.domain.upsert({
        where: { domain: row.host },
        create: { domain: row.host, kyteId: owner, verified: true, lastVerifiedAt: new Date() },
        update: { kyteId: owner },
      });
      log(`  created db row ${row.host} -> ${owner}`);
    }
    for (const row of wrongOwner) {
      const owner = row.legacyOwner;
      if (!owner) continue;
      await db.domain.update({ where: { domain: row.host }, data: { kyteId: owner } });
      log(`  reassigned ${row.host} -> ${owner} (v1 is authoritative)`);
    }

    await pooled(needsAttach, async (row) => {
      try {
        await provider.attach(row.host);
        log(`  attached  ${row.host}`);
      } catch (error) {
        log(`  FAILED to attach ${row.host}: ${String(error)}`);
      }
    });

    if (!reap) {
      log("");
      log(`done. ${String(phantomDns.length + orphans.length)} deletable domains left alone — pass --reap to remove them.`);
      return;
    }

    const doomed = [...phantomDns, ...orphans].filter(
      (row) => row.state === "PENDING" && !isPlatformHost(row.host, protectedHosts),
    );
    if (doomed.length === 0) {
      log("nothing to reap");
      return;
    }
    log("");
    log(`reaping ${String(doomed.length)} domains whose DNS does not point here…`);
    let reapedCount = 0;
    for (const row of doomed) {
      await provider.detach(row.host);
      await db.domain.delete({ where: { domain: row.host } }).catch(() => undefined);
      await checkpoint.mark(REAPED_DOMAINS_CHECKPOINT, row.host);
      reapedCount += 1;
      log(`  reaped ${row.host}`);
    }
    log(`reaped ${String(reapedCount)}; ${String(connected.length + liveOrphans.length)} live domains untouched`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  if (error instanceof BackfillConfigError) {
    process.stderr.write(`\n✗ ${error.message}\n\n`);
    process.exit(1);
  }
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});

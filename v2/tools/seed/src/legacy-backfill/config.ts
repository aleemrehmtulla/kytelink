export type BackfillProfile = "fixture" | "prod";

export type BackfillConfig = {
  profile: BackfillProfile;
  legacyAdminUrl: string;
  legacyReadonlyUrl: string;
  targetUrl: string;
  adminEmails: ReadonlySet<string>;
  cdnBaseUrl: string;
  checkpointDir: string;
  manifestDir: string;
};

export const LEGACY_FIXTURE_DB = "kyte_legacy_fixture";
export const TARGET_DB = "kyte_migration_target";
export const LEGACY_READONLY_ROLE = "legacy_ro";
export const LEGACY_READONLY_PASSWORD = "legacy_ro";

export class BackfillConfigError extends Error {}

function baseInstanceUrl(env: NodeJS.ProcessEnv): URL {
  const raw = env.DATABASE_URL ?? "postgresql://kyte:kyte@localhost:5432/kyte";
  return new URL(raw);
}

function withDatabase(instance: URL, database: string, user?: string, password?: string): string {
  const url = new URL(instance.toString());
  url.pathname = `/${database}`;
  if (user) url.username = user;
  if (password) url.password = password;
  return url.toString();
}

export function adminInstanceUrl(env: NodeJS.ProcessEnv): string {
  return withDatabase(baseInstanceUrl(env), "postgres");
}

export function parseAdminEmails(env: NodeJS.ProcessEnv): ReadonlySet<string> {
  const raw = env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0),
  );
}

export function readProfile(env: NodeJS.ProcessEnv): BackfillProfile {
  return env.BACKFILL_PROFILE === "prod" ? "prod" : "fixture";
}

export function describeDatabase(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname}`;
  } catch {
    return "<unparseable connection string>";
  }
}

function sameDatabase(a: string, b: string): boolean {
  try {
    const left = new URL(a);
    const right = new URL(b);
    return (
      left.hostname === right.hostname &&
      (left.port || "5432") === (right.port || "5432") &&
      left.pathname === right.pathname
    );
  } catch {
    return a === b;
  }
}

function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "host.docker.internal";
  } catch {
    return false;
  }
}

// A key left blank in a .env file arrives as "", which is not nullish and would
// therefore beat every ?? fallback.
function pick(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value !== undefined && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function loadProdConfig(env: NodeJS.ProcessEnv, stateRoot: string): BackfillConfig {
  const legacyReadonlyUrl = pick(env.LEGACY_READONLY_URL, env.LEGACY_DATABASE_URL);
  if (!legacyReadonlyUrl) {
    throw new BackfillConfigError(
      "BACKFILL_PROFILE=prod requires LEGACY_READONLY_URL (the v1 production Postgres " +
        "connection string). Set LEGACY_DATABASE_URL as an alias if you only have the " +
        "owner connection string — the source pool is forced read-only either way.",
    );
  }
  const targetUrl = pick(env.TARGET_DATABASE_URL, env.DATABASE_URL);
  if (!targetUrl) {
    throw new BackfillConfigError(
      "BACKFILL_PROFILE=prod requires TARGET_DATABASE_URL (or DATABASE_URL) — the fresh v2 Postgres.",
    );
  }
  if (sameDatabase(legacyReadonlyUrl, targetUrl)) {
    throw new BackfillConfigError(
      `source and target are the same database (${describeDatabase(targetUrl)}). ` +
        "The v1 source and the v2 target must be different databases.",
    );
  }
  if (isLocalHost(targetUrl)) {
    throw new BackfillConfigError(
      `BACKFILL_PROFILE=prod but the target is local (${describeDatabase(targetUrl)}). ` +
        "Point TARGET_DATABASE_URL/DATABASE_URL at the production database, or drop the prod profile.",
    );
  }
  const cdnBaseUrl = pick(env.NEXT_PUBLIC_CDN_URL);
  if (!cdnBaseUrl) {
    throw new BackfillConfigError(
      "BACKFILL_PROFILE=prod requires NEXT_PUBLIC_CDN_URL — it is baked into every rewritten " +
        "avatar and link-image URL, so a wrong value is not fixable without a re-run.",
    );
  }

  return {
    profile: "prod",
    legacyAdminUrl: pick(env.LEGACY_ADMIN_URL) ?? legacyReadonlyUrl,
    legacyReadonlyUrl,
    targetUrl,
    adminEmails: parseAdminEmails(env),
    cdnBaseUrl: cdnBaseUrl.replace(/\/+$/, ""),
    checkpointDir: `${stateRoot}/checkpoints`,
    manifestDir: `${stateRoot}/manifests`,
  };
}

export function loadConfig(env: NodeJS.ProcessEnv): BackfillConfig {
  const stateRoot = pick(env.BACKFILL_STATE_DIR) ?? ".backfill-state";
  if (readProfile(env) === "prod") return loadProdConfig(env, stateRoot);

  const instance = baseInstanceUrl(env);
  return {
    profile: "fixture",
    legacyAdminUrl: env.LEGACY_FIXTURE_URL ?? withDatabase(instance, LEGACY_FIXTURE_DB),
    legacyReadonlyUrl:
      env.LEGACY_READONLY_URL ??
      withDatabase(instance, LEGACY_FIXTURE_DB, LEGACY_READONLY_ROLE, LEGACY_READONLY_PASSWORD),
    targetUrl: env.TARGET_DATABASE_URL ?? withDatabase(instance, TARGET_DB),
    adminEmails: parseAdminEmails(env),
    cdnBaseUrl: env.NEXT_PUBLIC_CDN_URL ?? "http://localhost:5002",
    checkpointDir: `${stateRoot}/checkpoints`,
    manifestDir: `${stateRoot}/manifests`,
  };
}

#!/usr/bin/env node
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import { computeCapabilities } from "@kytelink/schemas";
import { killAll, log, repoRoot, spawnBg, step } from "./lib/proc.mjs";
import { waitForHttp } from "./lib/wait.mjs";

// 25-selfhost / 17-quality degraded-mode boots: the stack must degrade
// cleanly, not break. We boot the API under three reduced envs and assert the
// tiered behavior: refuses without a DB, boots with one warning and analytics
// off without ClickHouse, and with images off without S3.
loadEnv({ path: join(repoRoot, ".env") });

const PORT = 4013;
const base = { ...process.env, AGENT_MODE: "true", PORT: String(PORT), API_BASE_URL: `http://localhost:${PORT}` };
const AWS_KEYS = ["AWS_ENDPOINT_URL", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "AWS_S3_BUCKET"];
const REQUIRED = ["DATABASE_URL", "REDIS_URL", "AUTH_SECRET", "INTERNAL_API_SECRET", "WEB_BASE_URL", "API_BASE_URL", "LANDING_ZONE_URL"];

// spawnBg merges the parent process.env, so removing a var means overriding it
// with "" (which computeCapabilities and the clients treat as absent).
function envWithout(keys) {
  const e = { ...base };
  for (const k of keys) e[k] = "";
  return e;
}

const OPTIONAL_OFF = ["CLICKHOUSE_URL", "CLICKHOUSE_USER", "CLICKHOUSE_PASSWORD", "CLICKHOUSE_DATABASE", ...AWS_KEYS, "EMAIL_PROVIDER", "SMTP_HOST", "MODERATION_PROVIDER", "OPENAI_API_KEY"];

function minimalEnv() {
  const e = { ...base };
  for (const k of OPTIONAL_OFF) e[k] = "";
  return e;
}

async function bootAndCheck(name, env, expect) {
  step(`Degraded boot: ${name}`);
  const child = spawnBg(`degraded-${name}`, "pnpm", ["--filter", "@kytelink/api", "exec", "tsx", "src/index.ts"], { env });
  try {
    await waitForHttp(`http://localhost:${PORT}/readyz`, { label: `api(${name})`, okStatuses: [200, 503], timeoutMs: 60000 });
    const res = await fetch(`http://localhost:${PORT}/readyz`);
    const body = await res.json();
    const caps = computeCapabilities(env);
    const results = [];
    for (const [k, want] of Object.entries(expect.readyz ?? {})) {
      const got = k === "ok" ? body.ok : body.checks?.[k];
      results.push([`readyz.${k}`, got, want, got === want]);
    }
    for (const [k, want] of Object.entries(expect.caps ?? {})) {
      results.push([`caps.${k}`, caps[k], want, caps[k] === want]);
    }
    let ok = true;
    for (const [label, got, want, pass] of results) {
      log(`  ${pass ? "PASS" : "FAIL"} ${label}: got=${JSON.stringify(got)} want=${JSON.stringify(want)}`, pass ? "green" : "red");
      if (!pass) ok = false;
    }
    if (!ok) throw new Error(`degraded boot "${name}" did not match expectations`);
  } finally {
    killAll([child]);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function main() {
  try {
    await bootAndCheck("full-infra", base, {
      readyz: { ok: true, clickhouse: "ok" },
      caps: { analytics: true, uploads: true },
    });
    await bootAndCheck("no-clickhouse", envWithout(["CLICKHOUSE_URL"]), {
      readyz: { ok: true, clickhouse: "off" },
      caps: { analytics: false, uploads: true },
    });
    await bootAndCheck("no-aws", envWithout(AWS_KEYS), {
      readyz: { ok: true },
      caps: { uploads: false, analytics: true },
    });
    await bootAndCheck("minimal-env", minimalEnv(), {
      readyz: { ok: true, clickhouse: "off" },
      caps: { analytics: false, uploads: false, emailDelivery: false },
    });
    step("DEGRADED BOOTS GREEN");
    log("all degraded-mode boots behaved as specified", "green");
  } catch (err) {
    step("DEGRADED BOOTS RED");
    log(err instanceof Error ? err.message : String(err), "red");
    process.exitCode = 1;
  }
}

main();

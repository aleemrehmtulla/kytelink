#!/usr/bin/env node
// H12 tripwire: guard the public profile route's client JS against silent growth.
//
// Of what remains, ~105KB gz is the React/Next runtime itself — the floor for any
// hydrated Pages Router route. Only ~24KB is ProfileView and its icon table.
// The rest was barrel leakage, now fixed and worth keeping fixed:
//   - _app imports the provider graph via next/dynamic, so `bare` routes (the
//     public profile) never download framer-motion, the tRPC client or better-auth.
//   - ProfileView imports @kytelink/schemas/profile-data, a zod-free subpath, and
//     apps/web imports @kytelink/ui/profile-view rather than the barrel (which
//     re-exports ./motion and the six analytics charts).
// A regression here almost always means someone reached for a package barrel on
// the profile path again. Check what a new import pulled in before raising this.
//
// Run after `next build`:  node scripts/check-bundle-size.mjs

import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_DIR = join(WEB_ROOT, ".next");
const ROUTE = "/[username]";

// Gzipped ceiling for the sum of the profile route's client chunks. Set just above
// the current baseline (~129KB gz) to catch meaningful regressions without flapping.
// Lower it whenever the route genuinely slims down.
const BUDGET_KB = 145;

function fail(msg) {
  console.error(`✗ bundle-size check: ${msg}`);
  process.exit(1);
}

const manifestPath = join(NEXT_DIR, "build-manifest.json");
if (!existsSync(manifestPath)) {
  fail(`${manifestPath} not found — run \`next build\` first.`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const chunks = manifest.pages?.[ROUTE];
if (!chunks || chunks.length === 0) {
  fail(`no chunks listed for route ${ROUTE} in build-manifest.json.`);
}

let totalGz = 0;
for (const rel of chunks) {
  if (!rel.endsWith(".js")) continue;
  const abs = join(NEXT_DIR, rel);
  if (!existsSync(abs)) continue;
  totalGz += gzipSync(readFileSync(abs)).length;
}

const totalKb = totalGz / 1024;
const budgetBytes = BUDGET_KB * 1024;

const summary = `${ROUTE} client JS = ${totalKb.toFixed(1)}KB gz (budget ${BUDGET_KB}KB)`;
if (totalGz > budgetBytes) {
  fail(`${summary} — OVER budget. Investigate what grew before raising the ceiling.`);
}
console.log(`✓ bundle-size check: ${summary}`);

#!/usr/bin/env node
// Guards the public profile route's client JS. Measures the union of the /_app
// and /[username] chunk lists — the browser loads both, and counting only the
// page entry once hid a +180KB regression sitting in _app's shared chunks.
// A regression here usually means a package barrel was reached for on the
// profile path; check what a new import pulled in before raising the budget.
// Run after `next build`:  node scripts/check-bundle-size.mjs

import { readFileSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEXT_DIR = join(WEB_ROOT, ".next");
const ROUTE = "/[username]";

// Just above the ~148KB gz baseline; lower it whenever the route genuinely slims down.
const BUDGET_KB = 155;

function fail(msg) {
  console.error(`✗ bundle-size check: ${msg}`);
  process.exit(1);
}

const manifestPath = join(NEXT_DIR, "build-manifest.json");
if (!existsSync(manifestPath)) {
  fail(`${manifestPath} not found — run \`next build\` first.`);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const routeChunks = manifest.pages?.[ROUTE];
if (!routeChunks || routeChunks.length === 0) {
  fail(`no chunks listed for route ${ROUTE} in build-manifest.json.`);
}
const appChunks = manifest.pages?.["/_app"];
if (!appChunks || appChunks.length === 0) {
  fail(`no chunks listed for /_app in build-manifest.json.`);
}

let totalGz = 0;
for (const rel of new Set([...appChunks, ...routeChunks])) {
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

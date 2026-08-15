#!/usr/bin/env node
// A `notFound`/error from an ISR or SSR function renders the 404/500 inside
// that function's own serverless bundle, assembled from its .nft.json trace.
// Turbopack builds ignore outputFileTracingIncludes and its tracer does not
// pick up fs hints, so without this the deployed functions lack the custom
// error pages and Next serves its built-in "404: This page could not be found".
// Run after `next build`: appends the error pages to every page trace.

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", ".next", "server", "pages");
const ERROR_PAGES = ["404.html", "500.html"].map((name) => join(PAGES_DIR, name));

for (const errorPage of ERROR_PAGES) {
  if (!existsSync(errorPage)) {
    console.error(`✗ trace patch: ${errorPage} missing — did next build run?`);
    process.exit(1);
  }
}

function nftFilesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return nftFilesUnder(full);
    return name.endsWith(".js.nft.json") ? [full] : [];
  });
}

let patched = 0;
for (const nftPath of nftFilesUnder(PAGES_DIR)) {
  const manifest = JSON.parse(readFileSync(nftPath, "utf8"));
  const dir = dirname(nftPath);
  const additions = ERROR_PAGES.map((page) => relative(dir, page).replaceAll("\\", "/")).filter(
    (rel) => !manifest.files.includes(rel),
  );
  if (additions.length === 0) continue;
  manifest.files.push(...additions);
  writeFileSync(nftPath, JSON.stringify(manifest));
  patched += 1;
}

console.log(`✓ trace patch: custom 404/500 added to ${patched} page function traces`);

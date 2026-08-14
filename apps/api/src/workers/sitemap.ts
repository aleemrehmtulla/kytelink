import { Worker, type Job } from "bullmq";
import { STATIC_SITEMAP_PATHS } from "@kytelink/schemas";
import { getDb, type PrismaClient } from "@kytelink/db";
import { getConfig } from "../config";
import { taggedLogger } from "../logger";
import { getRedis } from "../redis";
import { isUploadsConfigured, putObject } from "../assets/s3-client";
import { listableKyteWhere } from "../internal/data";
import { getQueue } from "./queues";

const log = taggedLogger("sitemap");

const SITEMAP_QUEUE_NAME = "sitemap";
const MAX_URLS_PER_FILE = 50_000;
const SITEMAP_TTL_SEC = 26 * 60 * 60;
const SITEMAP_BUCKET_PREFIX = "sitemaps/";

export interface GeneratedSitemap {
  index: string;
  files: { name: string; xml: string }[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlsetXml(locs: string[]): string {
  const body = locs.map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

function sitemapIndexXml(fileLocs: string[]): string {
  const body = fileLocs.map((loc) => `  <sitemap><loc>${escapeXml(loc)}</loc></sitemap>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

/**
 * Builds a sitemap index plus one URL file per 50k URLs (16-seo.md) from the
 * static marketing pages followed by the published+APPROVED profile URLs.
 */
export function generateSitemap(
  usernames: string[],
  staticPaths: readonly string[],
  baseUrl: string,
): GeneratedSitemap {
  const base = baseUrl.replace(/\/+$/, "");
  const locs = [
    ...staticPaths.map((p) => `${base}${p.startsWith("/") ? p : `/${p}`}`),
    ...usernames.map((u) => `${base}/${encodeURIComponent(u)}`),
  ];

  const files: { name: string; xml: string }[] = [];
  for (let i = 0; i < locs.length; i += MAX_URLS_PER_FILE) {
    files.push({ name: `sitemap-${files.length}.xml`, xml: urlsetXml(locs.slice(i, i + MAX_URLS_PER_FILE)) });
  }
  if (files.length === 0) files.push({ name: "sitemap-0.xml", xml: urlsetXml([]) });

  const index = sitemapIndexXml(files.map((f) => `${base}/${f.name}`));
  return { index, files };
}

export interface SitemapJobResult {
  urlCount: number;
  fileCount: number;
  storedInBucket: boolean;
}

/**
 * Nightly job: regenerates the sitemap from published kytes that are not
 * effectively suspended (their own status and their org's), plus the
 * static marketing pages, stores it in the asset bucket when uploads are on,
 * and always mirrors it into Redis so a self-host without S3 can serve it via
 * a route (16-seo.md).
 */
export async function runSitemapJob(
  db: PrismaClient = getDb(),
  baseUrl: string = process.env.SITEMAP_BASE_URL ?? getConfig().webBaseUrl,
): Promise<SitemapJobResult> {
  const published = await db.publishedKyte.findMany({
    where: listableKyteWhere(),
    select: { username: true },
    orderBy: { username: "asc" },
  });
  const usernames = published
    .map((p) => p.username)
    .filter((u): u is string => u !== null);

  const sitemap = generateSitemap(usernames, STATIC_SITEMAP_PATHS, baseUrl);
  const redis = getRedis();

  await redis.set("sitemap:index", sitemap.index, "EX", SITEMAP_TTL_SEC);
  for (const file of sitemap.files) {
    await redis.set(`sitemap:file:${file.name}`, file.xml, "EX", SITEMAP_TTL_SEC);
  }

  let storedInBucket = false;
  if (getConfig().capabilities.uploads && isUploadsConfigured()) {
    await putObject(`${SITEMAP_BUCKET_PREFIX}sitemap.xml`, Buffer.from(sitemap.index), "application/xml");
    for (const file of sitemap.files) {
      await putObject(`${SITEMAP_BUCKET_PREFIX}${file.name}`, Buffer.from(file.xml), "application/xml");
    }
    storedInBucket = true;
  }

  const urlCount = STATIC_SITEMAP_PATHS.length + usernames.length;
  log.info(
    { urlCount, fileCount: sitemap.files.length, storedInBucket },
    "sitemap generated",
  );
  return { urlCount, fileCount: sitemap.files.length, storedInBucket };
}

export function createSitemapWorker(): Worker {
  const worker = new Worker(
    SITEMAP_QUEUE_NAME,
    (_job: Job) => runSitemapJob(),
    { connection: getRedis(), concurrency: 1 },
  );
  return worker;
}

export async function scheduleSitemap(): Promise<void> {
  await getQueue(SITEMAP_QUEUE_NAME).add(
    "nightly",
    {},
    { repeat: { pattern: "0 3 * * *" }, jobId: "sitemap-nightly" },
  );
}

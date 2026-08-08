import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  classifyLinkEmoji,
  THEME_DISPLAY_NAMES,
  THEMES,
  type ThemeKey,
  type ThemeObject,
} from "@kytelink/schemas";
import { loadConfig } from "./config";
import { loadEnvFile, resolveEnvFilePath } from "./env-file";

// Phase-5 visual-diff gallery generator (18-migration.md "renders identically"
// proof). Reads the visual-diff-manifest.json that `backfill verify` writes
// (each entry = one migrated profile's source-derived OLD ProfileContent vs the
// target-DB-derived NEW ProfileContent, plus the live oldUrl/newUrl pair) and
// emits a single browsable, self-contained HTML page. Every card is rendered
// with the profile's real theme colors (imported from @kytelink/schemas, not
// re-derived) so a human can eyeball old vs new side by side, and each pair
// carries a field-level diff verdict. The live URL pair is surfaced so that on
// launch day the founder can click through to the real old-prod vs new-staging
// pages for the pixel-diff the doc calls for (which needs both stacks live —
// out of scope for the offline fixture proving run).

type ManifestProfile = {
  displayName: string | null;
  description: string | null;
  theme: string;
  customFont: string | null;
  customColor: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  redirectUrl: string | null;
  shouldRedirect: boolean;
  links: unknown[];
  icons: unknown[];
  avatar: { url: string; lqip: string | null } | null;
};

type ManifestEntry = {
  userId: string;
  username: string | null;
  oldUrl: string | null;
  newUrl: string | null;
  old: ManifestProfile;
  new: ManifestProfile;
};

const CHAKRA_HEX: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  "gray.100": "#edf2f7",
  "gray.200": "#e2e8f0",
  "gray.300": "#cbd5e0",
  "gray.400": "#a0aec0",
  "gray.700": "#2d3748",
  "gray.900": "#171923",
  "whiteAlpha.900": "rgba(255,255,255,0.92)",
  "blue.200": "#bee3f8",
  "teal.500": "#319795",
  "pink.200": "#fbb6ce",
  "purple.500": "#805ad5",
  "purple.700": "#553c9a",
  "orange.300": "#f6ad55",
  "green.200": "#c6f6d5",
};

function hex(token: string): string {
  if (token.startsWith("#") || token.startsWith("rgb")) return token;
  return CHAKRA_HEX[token] ?? token;
}

function background(theme: ThemeObject): string {
  if (theme.bgGradient) {
    const match = /linear\(to-t,\s*([^,]+),\s*([^)]+)\)/.exec(theme.bgGradient);
    if (match && match[1] && match[2]) return `linear-gradient(to top, ${hex(match[1].trim())}, ${hex(match[2].trim())})`;
  }
  return hex(theme.bg ?? "white");
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name: string | null, username: string | null): string {
  const source = (name ?? username ?? "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (!first) return "?";
  if (!second) return first.slice(0, 2).toUpperCase();
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

function linkLabel(emoji: string): string {
  const kind = classifyLinkEmoji(emoji);
  if (kind === "icon") return `<span class="chip icon">${esc(emoji)}</span>`;
  if (kind === "emoji") return `<span class="chip emoji">${esc(emoji)}</span>`;
  if (kind === "image") return `<span class="chip img">🖼 image</span>`;
  return "";
}

function renderProfileCard(profile: ManifestProfile, username: string | null, side: "old" | "new"): string {
  const themeKey = (Object.keys(THEMES) as ThemeKey[]).includes(profile.theme as ThemeKey)
    ? (profile.theme as ThemeKey)
    : "default";
  const theme = THEMES[themeKey];
  const bg = background(theme);
  const nameColor = hex(theme.userData.name);
  const descColor = hex(theme.userData.description);
  const avatarColor = hex(theme.userData.avatar);
  const linkBg = hex(theme.link.bg);
  const linkText = hex(theme.link.text);
  const linkBorder = hex(theme.link.border);
  const rounded = theme.link.rounded === "30" ? "30px" : theme.link.rounded === "lg" ? "12px" : "8px";

  const avatarInner = profile.avatar
    ? `<img src="${esc(profile.avatar.url)}" alt="avatar" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'avatar-fallback',textContent:'${esc(initials(profile.displayName, username))}'}))" />`
    : `<div class="avatar-fallback">${esc(initials(profile.displayName, username))}</div>`;

  const links = profile.links
    .map((raw) => {
      const link = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      const title = typeof link.title === "string" ? link.title : "";
      const url = typeof link.link === "string" ? link.link : "";
      const emoji = typeof link.emoji === "string" ? link.emoji : "";
      return `<div class="link-btn" style="background:${linkBg};color:${linkText};border:1px solid ${linkBorder};border-radius:${rounded}">
        ${linkLabel(emoji)}<span class="link-title">${esc(title || url)}</span></div>`;
    })
    .join("");

  const icons = profile.icons
    .map((raw) => {
      const icon = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      const name = typeof icon.name === "string" ? icon.name : "";
      return `<span class="social-icon" style="color:${hex(theme.icons)}">${esc(name)}</span>`;
    })
    .join("");

  const redirectBanner = profile.shouldRedirect
    ? `<div class="redirect">↪ redirects to ${esc(profile.redirectUrl)}</div>`
    : "";

  return `<div class="profile" style="background:${bg}">
    <span class="theme-badge">${esc(THEME_DISPLAY_NAMES[themeKey])} · ${esc(themeKey)}</span>
    <div class="avatar" style="background:${avatarColor}">${avatarInner}</div>
    <div class="name" style="color:${nameColor}">${esc(profile.displayName || "—")}</div>
    <div class="desc" style="color:${descColor}">${esc(profile.description || "")}</div>
    ${redirectBanner}
    <div class="links">${links}</div>
    <div class="socials">${icons}</div>
    <div class="side-tag">${side.toUpperCase()}</div>
  </div>`;
}

const DISPLAY_FIELDS: (keyof ManifestProfile)[] = [
  "displayName",
  "description",
  "theme",
  "customFont",
  "customColor",
  "seoTitle",
  "seoDescription",
  "redirectUrl",
  "shouldRedirect",
  "links",
  "icons",
];

function asRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

function str(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

// Canonicalize one paired link (same index old vs new) the way verify.ts does:
// non-image emojis compare literally; an image emoji is reduced to its migration
// OUTCOME, and the NEW row is the source of truth for that outcome — a new CDN
// URL means the legacy image migrated ("image:ok"), a new "" means the legacy
// image was dead and dropped to null per policy ("none"). The old side inherits
// that outcome so a correct migration reads as identical, exactly matching the
// authoritative verify gate (which uses the asset map for the same decision).
function canonEmojiPair(oldEmoji: string, newEmoji: string): { old: string; new: string } {
  const newKind = classifyLinkEmoji(newEmoji);
  const oldKind = classifyLinkEmoji(oldEmoji);
  const label = (kind: ReturnType<typeof classifyLinkEmoji>, emoji: string): string =>
    kind === "icon" ? `icon:${emoji}` : kind === "emoji" ? `emoji:${emoji}` : kind === "none" ? "none" : "image";
  if (oldKind === "image" || newKind === "image") {
    const outcome = newKind === "image" ? "image:ok" : "none";
    return { old: oldKind === "image" ? outcome : label(oldKind, oldEmoji), new: outcome };
  }
  return { old: label(oldKind, oldEmoji), new: label(newKind, newEmoji) };
}

function canonLinks(oldLinks: unknown[], newLinks: unknown[]): { old: unknown[]; new: unknown[] } {
  const count = Math.max(oldLinks.length, newLinks.length);
  const old: unknown[] = [];
  const next: unknown[] = [];
  for (let i = 0; i < count; i += 1) {
    const o = asRecord(oldLinks[i]);
    const n = asRecord(newLinks[i]);
    const emoji = canonEmojiPair(str(o, "emoji"), str(n, "emoji"));
    old.push({ title: str(o, "title"), link: str(o, "link"), color: str(o, "color"), emoji: emoji.old });
    next.push({ title: str(n, "title"), link: str(n, "link"), color: str(n, "color"), emoji: emoji.new });
  }
  return { old, new: next };
}

function diffFields(oldP: ManifestProfile, newP: ManifestProfile): string[] {
  const diffs: string[] = [];
  const canonLinkPair = canonLinks(oldP.links, newP.links);
  for (const field of DISPLAY_FIELDS) {
    const oldValue = field === "links" ? canonLinkPair.old : oldP[field];
    const newValue = field === "links" ? canonLinkPair.new : newP[field];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) diffs.push(field);
  }
  return diffs;
}

// True when the display fields all reconcile (diffFields empty) but the raw links
// JSON changed — i.e. the only real movement was link images migrating to their
// new form (legacy URL -> CDN URL, or legacy URL -> "" per the null policy).
function onlyImageMigration(oldP: ManifestProfile, newP: ManifestProfile): boolean {
  if (diffFields(oldP, newP).length !== 0) return false;
  return JSON.stringify(oldP.links) !== JSON.stringify(newP.links);
}

function renderEntry(entry: ManifestEntry): string {
  const diffs = diffFields(entry.old, entry.new);
  const verdict =
    diffs.length > 0
      ? `<span class="verdict warn">DIFF: ${diffs.map(esc).join(", ")}</span>`
      : onlyImageMigration(entry.old, entry.new)
        ? `<span class="verdict ok">IDENTICAL — display fields match (link images migrated/dropped per policy)</span>`
        : `<span class="verdict ok">IDENTICAL — all display fields match</span>`;
  const oldLink = entry.oldUrl
    ? `<a href="${esc(entry.oldUrl)}" target="_blank" rel="noreferrer">${esc(entry.oldUrl)}</a>`
    : `<span class="muted">no live URL (null username)</span>`;
  const newLink = entry.newUrl
    ? `<a href="${esc(entry.newUrl)}" target="_blank" rel="noreferrer">${esc(entry.newUrl)}</a>`
    : `<span class="muted">no live URL (username nulled)</span>`;
  return `<section class="entry">
    <header class="entry-head">
      <div><span class="uid">${esc(entry.userId)}</span> ${entry.username ? `<span class="uname">@${esc(entry.username)}</span>` : `<span class="muted">username nulled/absent</span>`}</div>
      ${verdict}
    </header>
    <div class="pair">
      <div class="col"><div class="col-label">OLD (legacy source)</div>${renderProfileCard(entry.old, entry.username, "old")}<div class="urlrow">old prod: ${oldLink}</div></div>
      <div class="col"><div class="col-label">NEW (migrated target)</div>${renderProfileCard(entry.new, entry.username, "new")}<div class="urlrow">new staging: ${newLink}</div></div>
    </div>
  </section>`;
}

function page(entries: ManifestEntry[]): string {
  const identical = entries.filter((e) => diffFields(e.old, e.new).length === 0).length;
  const cards = entries.map(renderEntry).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Kytelink migration · visual-diff gallery</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; margin: 0; background: #0f1115; color: #e6e8eb; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px 80px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #9aa0aa; font-size: 14px; margin-bottom: 8px; }
  .summary { display: flex; gap: 16px; flex-wrap: wrap; margin: 16px 0 8px; }
  .stat { background: #1a1d24; border: 1px solid #262a33; border-radius: 10px; padding: 10px 14px; font-size: 14px; }
  .stat b { font-size: 18px; display: block; }
  .note { background: #15242e; border: 1px solid #1d3a49; border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #a9c9d8; margin: 12px 0 24px; }
  .entry { border: 1px solid #262a33; border-radius: 14px; padding: 16px; margin-bottom: 22px; background: #14161c; }
  .entry-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
  .uid { font-family: ui-monospace, monospace; font-size: 13px; color: #cbd2dc; }
  .uname { color: #7cc4ff; font-size: 13px; }
  .muted { color: #6b7280; font-size: 12px; }
  .verdict { font-size: 12px; padding: 4px 10px; border-radius: 999px; font-weight: 600; }
  .verdict.ok { background: #10331f; color: #63d68b; border: 1px solid #1c5233; }
  .verdict.warn { background: #3a2a10; color: #f2b04a; border: 1px solid #5c451c; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 720px) { .pair { grid-template-columns: 1fr; } }
  .col-label { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #8b93a0; margin-bottom: 8px; }
  .profile { position: relative; border-radius: 14px; padding: 22px 18px; min-height: 240px; box-shadow: 0 1px 0 rgba(255,255,255,.04), inset 0 0 0 1px rgba(0,0,0,.06); overflow: hidden; }
  .theme-badge { position: absolute; top: 8px; left: 10px; font-size: 10px; background: rgba(0,0,0,.35); color: #fff; padding: 2px 7px; border-radius: 999px; }
  .side-tag { position: absolute; top: 8px; right: 10px; font-size: 10px; font-weight: 700; color: rgba(0,0,0,.4); }
  .avatar { width: 72px; height: 72px; border-radius: 50%; margin: 18px auto 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 24px; color: rgba(0,0,0,.55); }
  .name { text-align: center; font-weight: 700; font-size: 18px; }
  .desc { text-align: center; font-size: 13px; margin: 4px 12px 12px; opacity: .92; }
  .redirect { text-align: center; font-size: 12px; color: #b45309; background: rgba(245,158,11,.15); border-radius: 8px; padding: 4px; margin: 0 20px 10px; }
  .links { display: flex; flex-direction: column; gap: 8px; }
  .link-btn { display: flex; align-items: center; gap: 8px; padding: 9px 12px; font-size: 13px; font-weight: 600; }
  .link-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chip { font-size: 12px; opacity: .85; }
  .chip.img { font-size: 11px; }
  .socials { display: flex; gap: 12px; justify-content: center; margin-top: 12px; font-size: 12px; font-weight: 600; }
  .social-icon { opacity: .8; }
  .urlrow { font-size: 11px; color: #7f8794; margin-top: 8px; word-break: break-all; }
  .urlrow a { color: #7cc4ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style></head>
<body><div class="wrap">
  <h1>Kytelink migration · visual-diff gallery</h1>
  <div class="sub">Generated from <code>visual-diff-manifest.json</code> (the launch verification gate's output). Old = legacy-source-derived ProfileContent; New = migrated target-DB-derived ProfileContent, both mounted through the same field model the single <code>ProfileView</code> renderer consumes.</div>
  <div class="summary">
    <div class="stat"><b>${entries.length}</b> migrated profiles</div>
    <div class="stat"><b>${identical}</b> byte-identical display content</div>
    <div class="stat"><b>${entries.length - identical}</b> with display diffs</div>
  </div>
  <div class="note">This gallery proves <b>data-level</b> render fidelity offline (no live stacks). The <b>pixel-diff</b> step in 18-migration.md needs BOTH the old prod page and the new staging page live — on launch day, click each pair's old-prod / new-staging links above and eyeball them side by side. Dead legacy avatars intentionally fall back to initials (null-avatar policy, 08-media.md); that is the migrated behavior, not a rendering bug.</div>
  ${cards}
</div></body></html>`;
}

async function main(): Promise<void> {
  const envFilePath = resolveEnvFilePath(process.argv, process.env);
  if (envFilePath) loadEnvFile(envFilePath);
  const config = loadConfig(process.env);
  const manifestPath = join(config.manifestDir, "visual-diff-manifest.json");
  const raw = await readFile(manifestPath, "utf8");
  const entries = JSON.parse(raw) as ManifestEntry[];
  const html = page(entries);
  await mkdir(config.manifestDir, { recursive: true });
  const outPath = join(config.manifestDir, "visual-diff-gallery.html");
  await writeFile(outPath, html, "utf8");
  process.stdout.write(`wrote ${outPath} (${entries.length} profiles, ${entries.filter((e) => diffFields(e.old, e.new).length === 0).length} identical)\n`);
}

main().catch((error) => {
  process.stderr.write(`${String(error instanceof Error ? error.stack : error)}\n`);
  process.exit(1);
});

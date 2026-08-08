import { createHash } from "node:crypto";
import {
  COLOR_KEYS,
  FONT_KEYS,
  MAX_DESCRIPTION_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_LINK_TITLE_LENGTH,
  MAX_PROFILE_ICONS,
  MAX_PROFILE_LINKS,
  MAX_SEO_DESCRIPTION_LENGTH,
  MAX_SEO_TITLE_LENGTH,
  THEME_KEYS,
  emptyProfileContent,
  iconSchema,
  linkEmojiSchema,
  linkSchema,
  normalizeUsername,
  safeCssColorSchema,
  profileContentSchema,
  safeWebUrlSchema,
  validateUsername,
  type ColorKey,
  type FontKey,
  type ProfileContent,
  type ThemeKey,
} from "@kytelink/schemas";
import type {
  LegacyAccountRow,
  LegacyKyteRow,
  LegacyUserRow,
} from "./legacy-fixture-data";

export type PlatformRole = "USER" | "ADMIN";

export const LEGACY_ASSET_HOSTS = [
  "imagedelivery.net",
  "supabase.co",
  "cloudfront.net",
  "i.ibb.co",
] as const;

export function isLegacyAssetUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return LEGACY_ASSET_HOSTS.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

const THEME_SET = new Set<string>(THEME_KEYS);
const FONT_SET = new Set<string>(FONT_KEYS);
const COLOR_SET = new Set<string>(COLOR_KEYS);

export function coerceTheme(raw: string | null | undefined): { value: ThemeKey; coerced: boolean } {
  if (raw && THEME_SET.has(raw)) return { value: raw as ThemeKey, coerced: false };
  return { value: "default", coerced: raw !== null && raw !== undefined && raw !== "default" };
}

export function coerceFont(raw: string | null | undefined): { value: FontKey | null; coerced: boolean } {
  if (!raw || raw === "default") return { value: null, coerced: false };
  if (FONT_SET.has(raw)) return { value: raw as FontKey, coerced: false };
  return { value: null, coerced: true };
}

export function coerceColor(raw: string | null | undefined): { value: ColorKey | null; coerced: boolean } {
  if (!raw || raw === "default") return { value: null, coerced: false };
  if (COLOR_SET.has(raw)) return { value: raw as ColorKey, coerced: false };
  return { value: null, coerced: true };
}

export function truncateField(
  value: string | null | undefined,
  max: number,
): { value: string | null; coerced: boolean } {
  if (value === null || value === undefined) return { value: null, coerced: false };
  if (value.length <= max) return { value, coerced: false };
  let cut = value.slice(0, max);
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return { value: cut, coerced: true };
}

export function coerceRedirectUrl(
  raw: string | null | undefined,
): { value: string | null; coerced: boolean } {
  if (!raw) return { value: null, coerced: false };
  const parsed = safeWebUrlSchema.safeParse(raw);
  if (parsed.success) return { value: parsed.data, coerced: false };
  return { value: null, coerced: true };
}

const KNOWN_LINK_KEYS = new Set(["title", "link", "emoji", "color"]);
const KNOWN_ICON_KEYS = new Set(["name", "url"]);

const LEGACY_CHAKRA_HEX: Record<string, string> = {
  "gray.500": "#718096",
  "red.500": "#E53E3E",
  "orange.500": "#DD6B20",
  "yellow.500": "#D69E2E",
  "green.500": "#38A169",
  "teal.500": "#319795",
  "blue.500": "#3182CE",
  "cyan.500": "#00B5D8",
  "purple.500": "#805AD5",
  "pink.500": "#D53F8C",
};

function normalizeLink(
  record: Record<string, unknown>,
  userId: string,
  coercions: string[],
): Record<string, unknown> {
  const next = { ...record };

  if (typeof next.color === "string") {
    const hex = LEGACY_CHAKRA_HEX[next.color.trim()];
    if (hex) {
      next.color = hex;
      coercions.push(`link.color:${String(record.color)}->${hex}(${userId})`);
    }
  }

  for (const key of ["emoji", "color"] as const) {
    const value = next[key];
    if (typeof value !== "string") continue;
    if (value.trim().length === 0) {
      delete next[key];
      continue;
    }
    const schema = key === "emoji" ? linkEmojiSchema : safeCssColorSchema;
    if (!schema.safeParse(value).success) {
      delete next[key];
      coercions.push(`link.${key}:invalid->dropped(${userId})`);
    }
  }

  if (typeof next.title === "string") {
    const truncated = truncateField(next.title, MAX_LINK_TITLE_LENGTH);
    if (truncated.coerced) coercions.push(`link.title:truncated(${userId})`);
    next.title = truncated.value?.trim() ?? "";
  }
  if (typeof next.title !== "string" || next.title.length === 0) {
    const fallback = hostOf(next.link);
    if (fallback) {
      next.title = fallback;
      coercions.push(`link.title:empty->host(${userId})`);
    }
  }

  return next;
}

function hostOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).hostname || null;
  } catch {
    return null;
  }
}

export type QuarantineEntry = {
  userId: string;
  field: "links" | "icons";
  index: number;
  raw: unknown;
  reason: string;
};

export type CoercedContent = {
  content: ProfileContent;
  storedLinks: unknown[];
  storedIcons: unknown[];
  coercions: string[];
  quarantine: QuarantineEntry[];
};

function extractExtras(record: Record<string, unknown>, known: Set<string>): Record<string, unknown> | undefined {
  const extras: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    if (!known.has(key)) extras[key] = record[key];
  }
  return Object.keys(extras).length > 0 ? extras : undefined;
}

function coerceLinks(userId: string, raw: unknown): {
  links: ProfileContent["links"];
  stored: unknown[];
  quarantine: QuarantineEntry[];
  coercions: string[];
} {
  const links: ProfileContent["links"] = [];
  const stored: unknown[] = [];
  const quarantine: QuarantineEntry[] = [];
  const coercions: string[] = [];
  if (!Array.isArray(raw)) return { links, stored, quarantine, coercions };

  raw.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      quarantine.push({ userId, field: "links", index, raw: entry, reason: "not_an_object" });
      return;
    }
    const record = normalizeLink(entry as Record<string, unknown>, userId, coercions);
    const parsed = linkSchema.safeParse(record);
    if (!parsed.success) {
      quarantine.push({ userId, field: "links", index, raw: entry, reason: parsed.error.issues[0]?.message ?? "invalid" });
      return;
    }
    if (links.length >= MAX_PROFILE_LINKS) {
      quarantine.push({ userId, field: "links", index, raw: entry, reason: "over_link_cap" });
      return;
    }
    links.push(parsed.data);
    const extras = extractExtras(record, KNOWN_LINK_KEYS);
    stored.push(extras ? { ...parsed.data, legacy: extras } : parsed.data);
  });

  return { links, stored, quarantine, coercions };
}

function coerceIcons(userId: string, raw: unknown): {
  icons: ProfileContent["icons"];
  stored: unknown[];
  quarantine: QuarantineEntry[];
} {
  const icons: ProfileContent["icons"] = [];
  const stored: unknown[] = [];
  const quarantine: QuarantineEntry[] = [];
  if (!Array.isArray(raw)) return { icons, stored, quarantine };

  raw.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      quarantine.push({ userId, field: "icons", index, raw: entry, reason: "not_an_object" });
      return;
    }
    const record = entry as Record<string, unknown>;
    const parsed = iconSchema.safeParse(record);
    if (!parsed.success) {
      quarantine.push({ userId, field: "icons", index, raw: entry, reason: parsed.error.issues[0]?.message ?? "invalid" });
      return;
    }
    if (icons.length >= MAX_PROFILE_ICONS) {
      quarantine.push({ userId, field: "icons", index, raw: entry, reason: "over_icon_cap" });
      return;
    }
    icons.push(parsed.data);
    const extras = extractExtras(record, KNOWN_ICON_KEYS);
    stored.push(extras ? { ...parsed.data, legacy: extras } : parsed.data);
  });

  return { icons, stored, quarantine };
}

export function mapKyteContent(row: LegacyKyteRow): CoercedContent {
  const coercions: string[] = [];
  const theme = coerceTheme(row.theme);
  if (theme.coerced) coercions.push(`theme:${String(row.theme)}->default`);
  const font = coerceFont(row.customFont);
  if (font.coerced) coercions.push(`customFont:${String(row.customFont)}->null`);
  const color = coerceColor(row.customColor);
  if (color.coerced) coercions.push(`customColor:${String(row.customColor)}->null`);

  const linkResult = coerceLinks(row.userId, row.links);
  coercions.push(...linkResult.coercions);
  const iconResult = coerceIcons(row.userId, row.icons);

  const displayName = truncateField(row.name, MAX_DISPLAY_NAME_LENGTH);
  if (displayName.coerced) coercions.push(`displayName:truncated(${row.name?.length}->${MAX_DISPLAY_NAME_LENGTH})`);
  const description = truncateField(row.description, MAX_DESCRIPTION_LENGTH);
  if (description.coerced) coercions.push(`description:truncated(${row.description?.length}->${MAX_DESCRIPTION_LENGTH})`);
  const seoTitle = truncateField(row.seoTitle, MAX_SEO_TITLE_LENGTH);
  if (seoTitle.coerced) coercions.push(`seoTitle:truncated(${row.seoTitle?.length}->${MAX_SEO_TITLE_LENGTH})`);
  const seoDescription = truncateField(row.seoDescription, MAX_SEO_DESCRIPTION_LENGTH);
  if (seoDescription.coerced) coercions.push(`seoDescription:truncated(${row.seoDescription?.length}->${MAX_SEO_DESCRIPTION_LENGTH})`);
  const redirectUrl = coerceRedirectUrl(row.redirectLink);
  if (redirectUrl.coerced) coercions.push(`redirectUrl:invalid->null`);

  const content = profileContentSchema.parse({
    ...emptyProfileContent(),
    displayName: displayName.value,
    description: description.value,
    theme: theme.value,
    customFont: font.value,
    customColor: color.value,
    seoTitle: seoTitle.value,
    seoDescription: seoDescription.value,
    redirectUrl: redirectUrl.value,
    shouldRedirect: Boolean(row.shouldRedirect) && redirectUrl.value !== null,
    links: linkResult.links,
    icons: iconResult.icons,
    avatar: row.pfp ? { url: row.pfp, lqip: row.blurpfp ?? null } : null,
  });

  return {
    content,
    storedLinks: linkResult.stored,
    storedIcons: iconResult.stored,
    coercions,
    quarantine: [...linkResult.quarantine, ...iconResult.quarantine],
  };
}

export type NewUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: PlatformRole;
  emailVerified: true;
};

export type UserPlan = {
  migrate: NewUser[];
  quarantine: { userId: string; reason: string }[];
};

export function planUsers(users: LegacyUserRow[], adminEmails: ReadonlySet<string>): UserPlan {
  const migrate: NewUser[] = [];
  const quarantine: { userId: string; reason: string }[] = [];
  const seenEmails = new Set<string>();

  for (const user of users) {
    if (!user.email) {
      quarantine.push({ userId: user.id, reason: "null_email" });
      continue;
    }
    const email = user.email.trim().toLowerCase();
    if (seenEmails.has(email)) {
      quarantine.push({ userId: user.id, reason: `duplicate_email:${email}` });
      continue;
    }
    seenEmails.add(email);
    migrate.push({
      id: user.id,
      email,
      name: user.name ?? null,
      image: user.image ?? null,
      role: adminEmails.has(email) ? "ADMIN" : "USER",
      emailVerified: true,
    });
  }

  return { migrate, quarantine };
}

const OAUTH_PROVIDERS = new Set(["google", "github"]);

export type NewAccount = {
  id: string;
  userId: string;
  providerId: string;
  accountId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  scope: string | null;
};

export function mapAccount(account: LegacyAccountRow): NewAccount | null {
  if (!OAUTH_PROVIDERS.has(account.provider)) return null;
  return {
    id: account.id,
    userId: account.userId,
    providerId: account.provider,
    accountId: account.providerAccountId,
    accessToken: account.access_token,
    refreshToken: account.refresh_token,
    idToken: account.id_token,
    accessTokenExpiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
    scope: account.scope,
  };
}

export type UsernameCollision = { normalized: string; userIds: string[] };

export type UsernamePlan = {
  assignments: Map<string, string | null>;
  collisions: UsernameCollision[];
  nulled: { userId: string; original: string; reason: string }[];
};

export function planUsernames(kytes: { userId: string; username: string | null }[]): UsernamePlan {
  const byNormalized = new Map<string, { userId: string; original: string }[]>();
  const assignments = new Map<string, string | null>();
  const nulled: { userId: string; original: string; reason: string }[] = [];

  for (const kyte of kytes) {
    if (!kyte.username) {
      assignments.set(kyte.userId, null);
      continue;
    }
    const normalized = normalizeUsername(kyte.username);
    const group = byNormalized.get(normalized) ?? [];
    group.push({ userId: kyte.userId, original: kyte.username });
    byNormalized.set(normalized, group);
  }

  const collisions: UsernameCollision[] = [];
  for (const [normalized, group] of byNormalized) {
    if (group.length > 1) {
      collisions.push({ normalized, userIds: group.map((entry) => entry.userId) });
      for (const entry of group) {
        assignments.set(entry.userId, null);
        nulled.push({ userId: entry.userId, original: entry.original, reason: "case_collision" });
      }
      continue;
    }
    const only = group[0];
    if (!only) continue;
    const validation = validateUsername(normalized);
    if (!validation.ok) {
      assignments.set(only.userId, null);
      nulled.push({ userId: only.userId, original: only.original, reason: `invalid:${validation.reason}` });
      continue;
    }
    assignments.set(only.userId, validation.username);
  }

  return { assignments, collisions, nulled };
}

export function personalOrgName(
  userName: string | null,
  username: string | null,
  email: string,
): string {
  const trimmedName = userName?.trim();
  if (trimmedName) return trimmedName;
  if (username) return username;
  const local = email.split("@")[0];
  if (local && local.length > 0) return local;
  return "My Kytelink";
}

export function personalOrgId(userId: string): string {
  return `orgp_${userId}`;
}

function kyteHashInput(row: LegacyKyteRow | null): unknown {
  if (!row) return null;
  return {
    username: row.username,
    banned: row.banned ?? null,
    name: row.name,
    description: row.description,
    pfp: row.pfp,
    blurpfp: row.blurpfp,
    theme: row.theme,
    customFont: row.customFont,
    customColor: row.customColor,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    links: row.links,
    icons: row.icons,
    redirectLink: row.redirectLink,
    shouldRedirect: row.shouldRedirect,
  };
}

export function sourceMigrationHash(
  user: { name: string | null; email: string; image: string | null },
  draft: LegacyKyteRow | null,
  prod: LegacyKyteRow | null,
): string {
  const canonical = JSON.stringify({
    user: { name: user.name, email: user.email, image: user.image },
    draft: kyteHashInput(draft),
    prod: kyteHashInput(prod),
  });
  return createHash("sha256").update(canonical).digest("hex");
}


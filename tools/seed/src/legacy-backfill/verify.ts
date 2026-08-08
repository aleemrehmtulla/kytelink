import type { PrismaClient } from "@kytelink/db";
import {
  classifyLinkEmoji,
  emptyProfileContent,
  profileContentSchema,
  type ProfileContent,
} from "@kytelink/schemas";
import type { Checkpoint } from "./checkpoint";
import type { LegacySnapshot } from "./legacy-source";
import type { AssetRecord } from "./backfill";

export interface AssetHeadSource {
  head(key: string): { size: number } | undefined | Promise<{ size: number } | undefined>;
}

export interface BeaconCardinalitySource {
  size(): Promise<number>;
}
import {
  isLegacyAssetUrl,
  mapAccount,
  mapKyteContent,
  planUsernames,
  planUsers,
  type CoercedContent,
} from "./mapping";
import type { LegacyKyteRow } from "./legacy-fixture-data";

export type VerificationCheck = { name: string; pass: boolean; detail: string };

export type VerificationReport = {
  pass: boolean;
  checks: VerificationCheck[];
  counts: Record<string, { old: number; expected: number; actual: number; pass: boolean }>;
  checksumMismatches: string[];
  avatarFailures: string[];
  assets: { verified: number; failedList: number; missingRows: string[]; sizeMismatches: string[] };
  manifestEntries: number;
};

type DisplayFields = {
  displayName: string | null;
  description: string | null;
  theme: string;
  customFont: string | null;
  customColor: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  redirectUrl: string | null;
  shouldRedirect: boolean;
  links: unknown;
  icons: unknown;
  moderationStatus: string | null;
};

function canonicalEmoji(
  emoji: string,
  side: "old" | "new",
  cdnBaseUrl: string,
  assetMap: Record<string, AssetRecord>,
  kyteId: string,
): string {
  const kind = classifyLinkEmoji(emoji);
  if (kind === "icon") return `icon:${emoji}`;
  if (kind === "emoji") return `emoji:${emoji}`;
  if (kind === "none") return "none";
  if (side === "new") {
    if (emoji.startsWith(cdnBaseUrl)) return "image:migrated";
    return `image:${emoji}`;
  }
  if (isLegacyAssetUrl(emoji)) {
    // A dead/failed legacy image is dropped to no-prefix (08-media.md null policy),
    // which the new row renders as an empty emoji — canonicalize both to "none".
    return assetMap[`${kyteId}::${emoji}`]?.status === "ok" ? "image:migrated" : "none";
  }
  return `image:${emoji}`;
}

function canonicalDisplay(
  fields: DisplayFields,
  side: "old" | "new",
  cdnBaseUrl: string,
  assetMap: Record<string, AssetRecord>,
  kyteId: string,
): string {
  const links = Array.isArray(fields.links)
    ? fields.links.map((link) => {
        const record = typeof link === "object" && link !== null ? (link as Record<string, unknown>) : {};
        const emoji = typeof record.emoji === "string" ? record.emoji : "";
        return {
          title: typeof record.title === "string" ? record.title : "",
          link: typeof record.link === "string" ? record.link : "",
          color: typeof record.color === "string" ? record.color : "",
          emoji: canonicalEmoji(emoji, side, cdnBaseUrl, assetMap, kyteId),
        };
      })
    : [];
  const icons = Array.isArray(fields.icons)
    ? fields.icons.map((icon) => {
        const record = typeof icon === "object" && icon !== null ? (icon as Record<string, unknown>) : {};
        return {
          name: typeof record.name === "string" ? record.name : "",
          url: typeof record.url === "string" ? record.url : null,
        };
      })
    : [];
  return JSON.stringify({
    displayName: fields.displayName,
    description: fields.description,
    theme: fields.theme,
    customFont: fields.customFont,
    customColor: fields.customColor,
    seoTitle: fields.seoTitle,
    seoDescription: fields.seoDescription,
    redirectUrl: fields.redirectUrl,
    shouldRedirect: fields.shouldRedirect,
    links,
    icons,
    moderationStatus: fields.moderationStatus,
  });
}

function contentToProfile(content: CoercedContent, hasAvatar: boolean): ProfileContent {
  return {
    ...content.content,
    avatar: hasAvatar ? content.content.avatar : null,
  };
}

type TargetRow = {
  displayName: string | null;
  description: string | null;
  theme: string;
  customFont: string | null;
  customColor: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  redirectUrl: string | null;
  shouldRedirect: boolean;
  links: unknown;
  icons: unknown;
  avatarAssetId: string | null;
};

function rowContentInput(row: TargetRow, cdnBaseUrl: string): Record<string, unknown> {
  return {
    ...emptyProfileContent(),
    displayName: row.displayName,
    description: row.description,
    theme: row.theme,
    customFont: row.customFont,
    customColor: row.customColor,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    redirectUrl: row.redirectUrl,
    shouldRedirect: row.shouldRedirect,
    links: Array.isArray(row.links) ? row.links : [],
    icons: Array.isArray(row.icons) ? row.icons : [],
    avatar: row.avatarAssetId ? { url: `${cdnBaseUrl}/asset/${row.avatarAssetId}`, lqip: null } : null,
  };
}

function rowToProfile(row: TargetRow, cdnBaseUrl: string): ProfileContent {
  const parsed = profileContentSchema.safeParse(rowContentInput(row, cdnBaseUrl));
  if (parsed.success) return parsed.data;
  return { ...emptyProfileContent(), displayName: row.displayName, description: row.description };
}

export async function verify(options: {
  db: PrismaClient;
  snapshot: LegacySnapshot;
  checkpoint: Checkpoint;
  store: AssetHeadSource;
  beacon: BeaconCardinalitySource;
  adminEmails: ReadonlySet<string>;
  cdnBaseUrl: string;
  stagingBaseUrl: string;
}): Promise<{ report: VerificationReport; manifest: unknown }> {
  const { db, snapshot, checkpoint, store, adminEmails, cdnBaseUrl, stagingBaseUrl } = options;

  const userPlan = planUsers(snapshot.users, adminEmails);
  const migratedUserIds = new Set(userPlan.migrate.map((user) => user.id));
  const draftByUser = new Map(snapshot.drafts.map((row) => [row.userId, row]));
  const prodByUser = new Map(snapshot.prods.map((row) => [row.userId, row]));

  const ownerIds = [...new Set([...draftByUser.keys(), ...prodByUser.keys()])].filter((id) =>
    migratedUserIds.has(id),
  );
  const usernamePlan = planUsernames(
    ownerIds.map((userId) => ({
      userId,
      username: prodByUser.get(userId)?.username ?? draftByUser.get(userId)?.username ?? null,
    })),
  );

  const expectedAccounts = snapshot.accounts.filter(
    (account) => mapAccount(account) !== null && migratedUserIds.has(account.userId),
  ).length;
  const expectedPublished = ownerIds.filter((id) => prodByUser.has(id)).length;
  const expectedDomains = snapshot.domains.filter((domain) => migratedUserIds.has(domain.userId)).length;

  const [userCount, orgCount, memberCount, kyteCount, publishedCount, domainCount, accountCount] =
    await Promise.all([
      db.user.count(),
      db.organization.count(),
      db.orgMember.count(),
      db.kyte.count(),
      db.publishedKyte.count(),
      db.domain.count(),
      db.account.count(),
    ]);

  const counts: VerificationReport["counts"] = {};
  const addCount = (name: string, oldValue: number, expected: number, actual: number) => {
    counts[name] = { old: oldValue, expected, actual, pass: expected === actual };
  };
  addCount("users", snapshot.users.length, userPlan.migrate.length, userCount);
  addCount("organizations", snapshot.users.length, ownerIds.length, orgCount);
  addCount("orgMembers", snapshot.users.length, ownerIds.length, memberCount);
  addCount("kytes", snapshot.drafts.length, ownerIds.length, kyteCount);
  addCount("publishedKytes", snapshot.prods.length, expectedPublished, publishedCount);
  addCount("domains", snapshot.domains.length, expectedDomains, domainCount);
  addCount("accounts", snapshot.accounts.length, expectedAccounts, accountCount);

  const assetMap = await checkpoint.readJson<Record<string, AssetRecord>>("assets-map", {});

  const checks: VerificationCheck[] = [];
  const checksumMismatches: string[] = [];
  const avatarFailures: string[] = [];

  const publishedRows = await db.publishedKyte.findMany();
  const kyteRows = await db.kyte.findMany();
  const assetRows = await db.asset.findMany();
  const publishedById = new Map(publishedRows.map((row) => [row.kyteId, row]));
  const kyteById = new Map(kyteRows.map((row) => [row.id, row]));
  const assetRowById = new Map(assetRows.map((row) => [row.id, row]));

  const manifest: {
    userId: string;
    username: string | null;
    oldUrl: string | null;
    newUrl: string | null;
    old: ProfileContent;
    new: ProfileContent;
  }[] = [];

  for (const userId of ownerIds) {
    const prod = prodByUser.get(userId) ?? null;
    const draft = draftByUser.get(userId) ?? null;
    const sourceRow: LegacyKyteRow | null = prod ?? draft;
    if (!sourceRow) continue;
    const oldContent = mapKyteContent(sourceRow);
    const username = usernamePlan.assignments.get(userId) ?? null;
    const moderationStatus = prod ? (prod.banned ? "SUSPENDED" : "APPROVED") : null;

    const oldCanonical = canonicalDisplay(
      {
        displayName: oldContent.content.displayName,
        description: oldContent.content.description,
        theme: oldContent.content.theme,
        customFont: oldContent.content.customFont,
        customColor: oldContent.content.customColor,
        seoTitle: oldContent.content.seoTitle,
        seoDescription: oldContent.content.seoDescription,
        redirectUrl: oldContent.content.redirectUrl,
        shouldRedirect: oldContent.content.shouldRedirect,
        links: oldContent.storedLinks,
        icons: oldContent.storedIcons,
        moderationStatus,
      },
      "old",
      cdnBaseUrl,
      assetMap,
      userId,
    );

    const newRow = prod ? publishedById.get(userId) : kyteById.get(userId);
    if (!newRow) {
      checksumMismatches.push(`${userId}:missing_new_row`);
      continue;
    }
    const newCanonical = canonicalDisplay(
      {
        displayName: newRow.displayName,
        description: newRow.description,
        theme: newRow.theme,
        customFont: newRow.customFont,
        customColor: newRow.customColor,
        seoTitle: newRow.seoTitle,
        seoDescription: newRow.seoDescription,
        redirectUrl: newRow.redirectUrl,
        shouldRedirect: newRow.shouldRedirect,
        links: newRow.links,
        icons: newRow.icons,
        moderationStatus: "moderationStatus" in newRow ? String(newRow.moderationStatus) : null,
      },
      "new",
      cdnBaseUrl,
      assetMap,
      userId,
    );

    if (oldCanonical !== newCanonical) checksumMismatches.push(userId);

    const expectAvatar =
      isLegacyAssetUrl(sourceRow.pfp) && assetMap[`${userId}::${sourceRow.pfp}`]?.status === "ok";
    const actualAssetId = newRow.avatarAssetId ?? null;
    if (expectAvatar) {
      if (!actualAssetId || !assetRowById.has(actualAssetId)) {
        avatarFailures.push(`${userId}:missing_avatar`);
      }
    } else if (actualAssetId) {
      avatarFailures.push(`${userId}:unexpected_avatar`);
    }

    manifest.push({
      userId,
      username,
      oldUrl: sourceRow.username ? `https://kytelink.com/${sourceRow.username}` : null,
      newUrl: username ? `${stagingBaseUrl}/${username}` : null,
      old: contentToProfile(oldContent, sourceRow.pfp !== null),
      new: rowToProfile(newRow, cdnBaseUrl),
    });
  }

  checks.push({
    name: "counts",
    pass: Object.values(counts).every((entry) => entry.pass),
    detail: Object.entries(counts)
      .map(([key, value]) => `${key} ${value.actual}/${value.expected}${value.pass ? "" : " MISMATCH"}`)
      .join(", "),
  });
  checks.push({
    name: "checksums",
    pass: checksumMismatches.length === 0,
    detail: checksumMismatches.length === 0 ? "all display fields match" : `mismatches: ${checksumMismatches.join(", ")}`,
  });

  const unparseable: string[] = [];
  for (const row of [...kyteRows, ...publishedRows]) {
    const parsed = profileContentSchema.safeParse(rowContentInput(row as TargetRow, cdnBaseUrl));
    if (!parsed.success) {
      const id = "kyteId" in row ? row.kyteId : row.id;
      const label = "kyteId" in row ? "published" : "draft";
      unparseable.push(`${id}:${label}:${parsed.error.issues[0]?.path.join(".") ?? "?"}`);
    }
  }
  checks.push({
    name: "content-parseable",
    pass: unparseable.length === 0,
    detail:
      unparseable.length === 0
        ? "every migrated Kyte + PublishedKyte content validates under profileContentSchema (editor/API-safe)"
        : `rows fail profileContentSchema: ${unparseable.join(", ")}`,
  });

  const danglingAvatars = [...kyteRows, ...publishedRows]
    .filter((row) => row.avatarAssetId !== null && !assetRowById.has(row.avatarAssetId))
    .map((row) => ("kyteId" in row ? row.kyteId : row.id));
  checks.push({
    name: "avatar-losslessness",
    pass: avatarFailures.length === 0 && danglingAvatars.length === 0,
    detail:
      avatarFailures.length === 0 && danglingAvatars.length === 0
        ? "every avatarAssetId matches source state and resolves to an Asset row"
        : `avatar issues: ${[...avatarFailures, ...danglingAvatars.map((id) => `${id}:dangling_fk`)].join(", ")}`,
  });

  const missingRows: string[] = [];
  const sizeMismatches: string[] = [];
  let verifiedAssets = 0;
  const okRecords = Object.values(assetMap).filter((record) => record.status === "ok");
  for (const record of okRecords) {
    if (!record.assetId) continue;
    const row = assetRowById.get(record.assetId);
    if (!row) {
      missingRows.push(record.assetId);
      continue;
    }
    const head = record.key ? await store.head(record.key) : undefined;
    if (!head) {
      missingRows.push(`${record.assetId}:no_bucket_object`);
      continue;
    }
    if (head.size !== row.sizeBytes || row.width === null || row.height === null) {
      sizeMismatches.push(record.assetId);
      continue;
    }
    verifiedAssets += 1;
  }
  checks.push({
    name: "assets",
    pass: missingRows.length === 0 && sizeMismatches.length === 0,
    detail: `${verifiedAssets} verified (row+bucket+size+dims), ${okRecords.length - verifiedAssets} discrepancies`,
  });

  const accountRows = await db.account.findMany();
  const providers = new Set(accountRows.map((row) => row.providerId));
  const expectedProviders = new Set(
    snapshot.accounts
      .filter((account) => mapAccount(account) !== null && migratedUserIds.has(account.userId))
      .map((account) => account.provider),
  );
  const missingProviders = [...expectedProviders].filter((provider) => !providers.has(provider));
  const extraProviders = [...providers].filter((provider) => !expectedProviders.has(provider));
  const orphanAccounts = accountRows.filter((row) => !migratedUserIds.has(row.userId)).length;
  checks.push({
    name: "auth",
    pass: missingProviders.length === 0 && extraProviders.length === 0 && orphanAccounts === 0,
    detail:
      `providers=[${[...providers].join(",")}] expected=[${[...expectedProviders].join(",")}] orphans=${orphanAccounts}` +
      (missingProviders.length > 0 ? ` MISSING=[${missingProviders.join(",")}]` : "") +
      (extraProviders.length > 0 ? ` UNEXPECTED=[${extraProviders.join(",")}]` : ""),
  });

  const beaconSize = await options.beacon.size();
  const expectedBeacon = ownerIds.filter(
    (id) => prodByUser.has(id) && (usernamePlan.assignments.get(id) ?? null) !== null,
  ).length;
  checks.push({
    name: "beacon-set",
    pass: beaconSize === expectedBeacon,
    detail: `redis username<->kyteId cardinality ${beaconSize}/${expectedBeacon}`,
  });

  const vcfLeak = publishedRows.some((row) => JSON.stringify(row).includes("firstName"));
  checks.push({
    name: "vcf-dropped",
    pass: !vcfLeak,
    detail: vcfLeak ? "vcf data leaked into new rows" : "vcf absent from all new rows (documented drop)",
  });

  const suspendedNew = publishedRows.filter((row) => row.moderationStatus === "SUSPENDED").length;
  const bannedOld = snapshot.prods.filter((row) => row.banned === true).length;
  checks.push({
    name: "banned-preserved",
    pass: suspendedNew === bannedOld,
    detail: `SUSPENDED ${suspendedNew}/${bannedOld} v1-banned`,
  });

  const quarantinedUsers = userPlan.quarantine.length;
  checks.push({
    name: "quarantine-accounted",
    pass: userCount === snapshot.users.length - quarantinedUsers,
    detail: `new users ${userCount} == old ${snapshot.users.length} - quarantined ${quarantinedUsers}`,
  });

  const pass = checks.every((check) => check.pass);
  return {
    report: {
      pass,
      checks,
      counts,
      checksumMismatches,
      avatarFailures: [...avatarFailures, ...danglingAvatars.map((id) => `${id}:dangling_fk`)],
      assets: { verified: verifiedAssets, failedList: Object.values(assetMap).filter((r) => r.status === "failed").length, missingRows, sizeMismatches },
      manifestEntries: manifest.length,
    },
    manifest,
  };
}

import { Client } from "pg";
import { LEGACY_DDL, LEGACY_TABLES } from "./legacy-schema";
import {
  DELTA_EDITED_USER_IDS,
  IMAGEDELIVERY_PFP_V2,
  LEGACY_FIXTURE,
  type LegacyFixture,
} from "./legacy-fixture-data";

async function withClient<T>(url: string, fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

function jsonParam(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return JSON.stringify(value);
}

export type FixtureLoadResult = {
  users: number;
  accounts: number;
  drafts: number;
  prods: number;
  domains: number;
  sessions: number;
  verificationTokens: number;
  pageHits: number;
  linkHits: number;
};

export async function applySchema(url: string): Promise<void> {
  await withClient(url, async (client) => {
    await client.query(LEGACY_DDL);
  });
}

export async function applyDeltaEdits(url: string): Promise<readonly string[]> {
  await withClient(url, async (client) => {
    const edited = "EDITED during warm-up window";
    await client.query(`UPDATE "KyteDraft" SET description=$1 WHERE "userId"='u_google_full'`, [edited]);
    await client.query(`UPDATE "KyteProd" SET description=$1 WHERE "userId"='u_google_full'`, [edited]);
    await client.query(`UPDATE "KyteDraft" SET name=$1, pfp=$2 WHERE "userId"='u_github_full'`, [
      "Github Edited",
      IMAGEDELIVERY_PFP_V2,
    ]);
    await client.query(`UPDATE "KyteProd" SET name=$1, pfp=$2 WHERE "userId"='u_github_full'`, [
      "Github Edited",
      IMAGEDELIVERY_PFP_V2,
    ]);
  });
  return DELTA_EDITED_USER_IDS;
}

export async function loadFixture(
  url: string,
  fixture: LegacyFixture = LEGACY_FIXTURE,
): Promise<FixtureLoadResult> {
  return withClient(url, async (client) => {
    await client.query(LEGACY_DDL);
    await client.query(
      `TRUNCATE ${LEGACY_TABLES.map((table) => `"${table}"`).join(", ")} RESTART IDENTITY CASCADE`,
    );

    for (const user of fixture.users) {
      await client.query(
        `INSERT INTO "User" (id, name, email, "emailVerified", image, legacy, setup)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [user.id, user.name, user.email, user.emailVerified, user.image, user.legacy, user.setup],
      );
    }

    for (const account of fixture.accounts) {
      await client.query(
        `INSERT INTO "Account" (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          account.id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refresh_token,
          account.access_token,
          account.expires_at,
          account.token_type,
          account.scope,
          account.id_token,
          account.session_state,
        ],
      );
    }

    const insertKyte = async (table: "KyteDraft" | "KyteProd", row: LegacyFixture["drafts"][number]) => {
      const cols = [
        '"userId"', "email", '"createdAt"', "username", "name", "description", "pfp", "theme",
        '"customFont"', '"customColor"', '"seoTitle"', '"seoDescription"', "links", "icons", "vcf",
        '"redirectLink"', '"shouldRedirect"', "blurpfp",
      ];
      const vals: unknown[] = [
        row.userId, row.email, row.createdAt, row.username, row.name, row.description, row.pfp, row.theme,
        row.customFont, row.customColor, row.seoTitle, row.seoDescription,
        jsonParam(row.links), jsonParam(row.icons), jsonParam(row.vcf),
        row.redirectLink, row.shouldRedirect, row.blurpfp,
      ];
      if (table === "KyteProd") {
        cols.push("banned");
        vals.push(row.banned);
      }
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(",");
      await client.query(`INSERT INTO "${table}" (${cols.join(", ")}) VALUES (${placeholders})`, vals);
    };

    for (const draft of fixture.drafts) await insertKyte("KyteDraft", draft);
    for (const prod of fixture.prods) await insertKyte("KyteProd", prod);

    for (const domain of fixture.domains) {
      await client.query(
        `INSERT INTO "Domains" (domain, "userId", "createdAt") VALUES ($1,$2,$3)`,
        [domain.domain, domain.userId, domain.createdAt],
      );
    }

    for (const session of fixture.sessions) {
      await client.query(
        `INSERT INTO "Session" (id, "sessionToken", "userId", expires) VALUES ($1,$2,$3,$4)`,
        [session.id, session.sessionToken, session.userId, session.expires],
      );
    }

    for (const token of fixture.verificationTokens) {
      await client.query(
        `INSERT INTO "VerificationToken" (identifier, token, expires) VALUES ($1,$2,$3)`,
        [token.identifier, token.token, token.expires],
      );
    }

    for (const hit of fixture.pageHits) {
      await client.query(
        `INSERT INTO "HitPage" (id, "kyteId", timestamp, referrer, country, ip, device) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [hit.id, hit.kyteId, hit.timestamp, hit.referrer, hit.country, hit.ip, hit.device],
      );
    }

    for (const hit of fixture.linkHits) {
      await client.query(
        `INSERT INTO "HitLink" (id, "kyteId", timestamp, referrer, country, ip, device, "linkTitle", "linkURL") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [hit.id, hit.kyteId, hit.timestamp, hit.referrer, hit.country, hit.ip, hit.device, hit.linkTitle, hit.linkURL],
      );
    }

    return {
      users: fixture.users.length,
      accounts: fixture.accounts.length,
      drafts: fixture.drafts.length,
      prods: fixture.prods.length,
      domains: fixture.domains.length,
      sessions: fixture.sessions.length,
      verificationTokens: fixture.verificationTokens.length,
      pageHits: fixture.pageHits.length,
      linkHits: fixture.linkHits.length,
    };
  });
}

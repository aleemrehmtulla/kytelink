import { Pool, type PoolClient } from "pg";
import { z } from "zod";
import type {
  LegacyAccountRow,
  LegacyDomainRow,
  LegacyKyteRow,
  LegacyUserRow,
} from "./legacy-fixture-data";

const userRowSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.date().nullable(),
  image: z.string().nullable(),
  legacy: z.boolean().nullable(),
  setup: z.boolean().nullable(),
});

const accountRowSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.string(),
  provider: z.string(),
  providerAccountId: z.string(),
  refresh_token: z.string().nullable(),
  access_token: z.string().nullable(),
  expires_at: z.number().nullable(),
  token_type: z.string().nullable(),
  scope: z.string().nullable(),
  id_token: z.string().nullable(),
  session_state: z.string().nullable(),
});

const kyteRowSchema = z.object({
  userId: z.string(),
  email: z.string().nullable(),
  createdAt: z.date(),
  username: z.string().nullable(),
  banned: z.boolean().nullable().optional(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  pfp: z.string().nullable(),
  theme: z.string().nullable(),
  customFont: z.string().nullable(),
  customColor: z.string().nullable(),
  seoTitle: z.string().nullable(),
  seoDescription: z.string().nullable(),
  links: z.unknown(),
  icons: z.unknown(),
  vcf: z.unknown(),
  redirectLink: z.string().nullable(),
  shouldRedirect: z.boolean().nullable(),
  blurpfp: z.string().nullable(),
});

const domainRowSchema = z.object({
  domain: z.string(),
  userId: z.string(),
  createdAt: z.date(),
});

function toUser(raw: z.infer<typeof userRowSchema>): LegacyUserRow {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    emailVerified: raw.emailVerified ? raw.emailVerified.toISOString() : null,
    image: raw.image,
    legacy: raw.legacy ?? false,
    setup: raw.setup ?? false,
  };
}

function toKyte(raw: z.infer<typeof kyteRowSchema>): LegacyKyteRow {
  return {
    userId: raw.userId,
    email: raw.email,
    createdAt: raw.createdAt.toISOString(),
    username: raw.username,
    banned: raw.banned ?? null,
    name: raw.name,
    description: raw.description,
    pfp: raw.pfp,
    theme: raw.theme,
    customFont: raw.customFont,
    customColor: raw.customColor,
    seoTitle: raw.seoTitle,
    seoDescription: raw.seoDescription,
    links: raw.links,
    icons: raw.icons,
    vcf: raw.vcf,
    redirectLink: raw.redirectLink,
    shouldRedirect: raw.shouldRedirect,
    blurpfp: raw.blurpfp,
  };
}

export type LegacySnapshot = {
  users: LegacyUserRow[];
  accounts: LegacyAccountRow[];
  drafts: LegacyKyteRow[];
  prods: LegacyKyteRow[];
  domains: LegacyDomainRow[];
};

const READ_ONLY_ERROR_CODES = new Set(["25006", "42501"]);

export class LegacySource {
  private readonly pool: Pool;

  constructor(readonlyUrl: string) {
    this.pool = new Pool({ connectionString: readonlyUrl, max: 4 });
  }

  private async withReadOnlyTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN TRANSACTION READ ONLY");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async assertReadOnly(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN TRANSACTION READ ONLY");
      try {
        await client.query(`INSERT INTO "User" (id, email) VALUES ('__probe__', 'probe@readonly.test')`);
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (READ_ONLY_ERROR_CODES.has(code ?? "")) return;
        throw new Error(`read-only probe failed for an unexpected reason (code=${code ?? "unknown"})`, {
          cause: error,
        });
      }
      throw new Error("source connection is NOT read-only: a probe INSERT succeeded");
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  }

  async counts(): Promise<Record<string, number>> {
    const tables = ["User", "Account", "KyteDraft", "KyteProd", "Domains"];
    return this.withReadOnlyTx(async (client) => {
      const entries: (readonly [string, number])[] = [];
      for (const table of tables) {
        const result = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM "${table}"`);
        entries.push([table, Number(result.rows[0]?.count ?? 0)] as const);
      }
      return Object.fromEntries(entries);
    });
  }

  async read(): Promise<LegacySnapshot> {
    const { users, accounts, drafts, prods, domains } = await this.withReadOnlyTx(async (client) => ({
      users: await client.query(`SELECT id, name, email, "emailVerified", image, legacy, setup FROM "User" ORDER BY id`),
      accounts: await client.query(
        `SELECT id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state FROM "Account" ORDER BY id`,
      ),
      drafts: await client.query(
        `SELECT "userId", email, "createdAt", username, name, description, pfp, theme, "customFont", "customColor", "seoTitle", "seoDescription", links, icons, vcf, "redirectLink", "shouldRedirect", blurpfp FROM "KyteDraft" ORDER BY "userId"`,
      ),
      prods: await client.query(
        `SELECT "userId", email, "createdAt", username, banned, name, description, pfp, theme, "customFont", "customColor", "seoTitle", "seoDescription", links, icons, vcf, "redirectLink", "shouldRedirect", blurpfp FROM "KyteProd" ORDER BY "userId"`,
      ),
      domains: await client.query(`SELECT domain, "userId", "createdAt" FROM "Domains" ORDER BY domain`),
    }));

    return {
      users: users.rows.map((row) => toUser(userRowSchema.parse(row))),
      accounts: accounts.rows.map((row) => accountRowSchema.parse(row)),
      drafts: drafts.rows.map((row) => toKyte(kyteRowSchema.parse(row))),
      prods: prods.rows.map((row) => toKyte(kyteRowSchema.parse(row))),
      domains: domains.rows.map((row) => {
        const parsed = domainRowSchema.parse(row);
        return { domain: parsed.domain, userId: parsed.userId, createdAt: parsed.createdAt.toISOString() };
      }),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

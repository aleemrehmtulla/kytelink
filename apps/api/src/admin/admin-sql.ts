import { Prisma } from "@kytelink/db";

export interface PageInput {
  page: number;
  pageSize: number;
}

export interface PagedResult<Row> {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
}

export function pageWindow(input: PageInput): { limit: number; offset: number } {
  return { limit: input.pageSize, offset: (input.page - 1) * input.pageSize };
}

export function paged<Row>(rows: Row[], total: number, input: PageInput): PagedResult<Row> {
  return { rows, total, page: input.page, pageSize: input.pageSize };
}

/** `count(*) OVER ()` is computed before LIMIT, so page 1 and page 7 agree. */
export function totalOf(rows: { total: number | bigint }[]): number {
  return rows.length === 0 ? 0 : num(rows[0]?.total);
}

export function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function isoRequired(value: Date): string {
  return value.toISOString();
}

// `%` and `_` inside an admin's search box are literal characters, not wildcards.
export function likeNeedle(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Callers parenthesise each condition; this only joins them. */
export function andWhere(conditions: Prisma.Sql[]): Prisma.Sql {
  return conditions.length === 0 ? Prisma.sql`TRUE` : Prisma.join(conditions, " AND ");
}

export function sortDir(dir: "asc" | "desc"): Prisma.Sql {
  return dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
}

export function publicProfileUrl(webBaseUrl: string, username: string | null): string | null {
  return username ? `${webBaseUrl.replace(/\/+$/, "")}/${username}` : null;
}

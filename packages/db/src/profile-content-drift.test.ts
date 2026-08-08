import { describe, expect, it } from "vitest";
import { PROFILE_CONTENT_COLUMNS, type ProfileContentColumn } from "@kytelink/schemas";
import { Prisma } from "./index";

type AllInKyte = [ProfileContentColumn] extends [keyof typeof Prisma.KyteScalarFieldEnum]
  ? true
  : false;
type AllInPublished = [ProfileContentColumn] extends [
  keyof typeof Prisma.PublishedKyteScalarFieldEnum,
]
  ? true
  : false;

const _kyteTypeGuard: AllInKyte = true;
const _publishedTypeGuard: AllInPublished = true;
void _kyteTypeGuard;
void _publishedTypeGuard;

describe("ProfileContent <-> Prisma content columns can never drift", () => {
  const kyteColumns = new Set(Object.keys(Prisma.KyteScalarFieldEnum));
  const publishedColumns = new Set(Object.keys(Prisma.PublishedKyteScalarFieldEnum));

  it.each(PROFILE_CONTENT_COLUMNS)("Kyte has content column %s", (column) => {
    expect(kyteColumns.has(column)).toBe(true);
  });

  it.each(PROFILE_CONTENT_COLUMNS)("PublishedKyte has content column %s", (column) => {
    expect(publishedColumns.has(column)).toBe(true);
  });
});

export const LEGACY_DDL = `
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  "image" TEXT,
  "legacy" BOOLEAN DEFAULT false,
  "setup" BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  UNIQUE ("provider", "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT PRIMARY KEY,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expires" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT UNIQUE NOT NULL,
  "expires" TIMESTAMPTZ NOT NULL,
  UNIQUE ("identifier", "token")
);

CREATE TABLE IF NOT EXISTS "KyteDraft" (
  "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "email" TEXT UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "username" TEXT UNIQUE,
  "name" TEXT,
  "description" TEXT,
  "pfp" TEXT,
  "theme" TEXT,
  "customFont" TEXT,
  "customColor" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "links" JSONB,
  "icons" JSONB,
  "vcf" JSONB,
  "redirectLink" TEXT,
  "shouldRedirect" BOOLEAN DEFAULT false,
  "blurpfp" TEXT
);

CREATE TABLE IF NOT EXISTS "KyteProd" (
  "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "email" TEXT UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "username" TEXT UNIQUE,
  "banned" BOOLEAN DEFAULT false,
  "name" TEXT,
  "description" TEXT,
  "pfp" TEXT,
  "theme" TEXT,
  "customFont" TEXT,
  "customColor" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "links" JSONB,
  "icons" JSONB,
  "vcf" JSONB,
  "redirectLink" TEXT,
  "shouldRedirect" BOOLEAN DEFAULT false,
  "blurpfp" TEXT
);

CREATE TABLE IF NOT EXISTS "Domains" (
  "domain" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "HitPage" (
  "id" TEXT PRIMARY KEY,
  "kyteId" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "referrer" TEXT,
  "country" TEXT,
  "ip" TEXT,
  "device" TEXT
);

CREATE TABLE IF NOT EXISTS "HitLink" (
  "id" TEXT PRIMARY KEY,
  "kyteId" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "referrer" TEXT,
  "country" TEXT,
  "ip" TEXT,
  "device" TEXT,
  "linkTitle" TEXT,
  "linkURL" TEXT
);
`;

export const LEGACY_TABLES = [
  "HitLink",
  "HitPage",
  "Domains",
  "KyteProd",
  "KyteDraft",
  "VerificationToken",
  "Session",
  "Account",
  "User",
] as const;

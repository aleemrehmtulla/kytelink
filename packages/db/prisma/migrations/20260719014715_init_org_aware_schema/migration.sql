-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "KyteAccess" AS ENUM ('ALL', 'SELECTED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'PUBLISHED', 'CANCELED', 'FAILED');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('APPROVED', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ModerationVerdict" AS ENUM ('APPROVE', 'SUSPEND');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('AVATAR', 'LINK_IMAGE', 'OG_IMAGE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "role" "PlatformRole" NOT NULL DEFAULT 'USER',
    "maxOwnedOrgs" INTEGER,
    "maxJoinedOrgs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "personal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxKytes" INTEGER,
    "maxMembers" INTEGER,
    "maxSchedulesPerKyte" INTEGER,
    "maxPreviewLinks" INTEGER,
    "maxStorageBytes" BIGINT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "kyteAccess" "KyteAccess" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedById" TEXT,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("orgId","userId")
);

-- CreateTable
CREATE TABLE "KyteMember" (
    "orgId" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "KyteMember_pkey" PRIMARY KEY ("kyteId","userId")
);

-- CreateTable
CREATE TABLE "Kyte" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "description" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'default',
    "customFont" TEXT,
    "customColor" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "redirectUrl" TEXT,
    "shouldRedirect" BOOLEAN NOT NULL DEFAULT false,
    "links" JSONB NOT NULL DEFAULT '[]',
    "icons" JSONB NOT NULL DEFAULT '[]',
    "avatarAssetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kyte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedKyte" (
    "kyteId" TEXT NOT NULL,
    "username" TEXT,
    "displayName" TEXT,
    "description" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'default',
    "customFont" TEXT,
    "customColor" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "redirectUrl" TEXT,
    "shouldRedirect" BOOLEAN NOT NULL DEFAULT false,
    "links" JSONB NOT NULL DEFAULT '[]',
    "icons" JSONB NOT NULL DEFAULT '[]',
    "avatarAssetId" TEXT,
    "moderationStatus" "ModerationStatus" NOT NULL DEFAULT 'APPROVED',
    "publishSeq" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "publishedById" TEXT,
    "contentHash" TEXT,

    CONSTRAINT "PublishedKyte_pkey" PRIMARY KEY ("kyteId")
);

-- CreateTable
CREATE TABLE "OrgInvite" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "kyteAccess" "KyteAccess" NOT NULL,
    "kyteGrants" JSONB,
    "invitedById" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "remindedAt" TIMESTAMP(3),

    CONSTRAINT "OrgInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPublish" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "ScheduledPublish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreviewLink" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "passcodeHash" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PreviewLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "kyteId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "key" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "domain" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("domain")
);

-- CreateTable
CREATE TABLE "ModerationReview" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "verdict" "ModerationVerdict" NOT NULL,
    "categories" TEXT[],
    "reason" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "signals" JSONB,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbuseReport" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "kyteId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "ipHash" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "AbuseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAlert" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "AdminAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "aaguid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "OrgMember_userId_idx" ON "OrgMember"("userId");

-- CreateIndex
CREATE INDEX "KyteMember_userId_idx" ON "KyteMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Kyte_username_key" ON "Kyte"("username");

-- CreateIndex
CREATE INDEX "Kyte_orgId_idx" ON "Kyte"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedKyte_username_key" ON "PublishedKyte"("username");

-- CreateIndex
CREATE UNIQUE INDEX "OrgInvite_tokenHash_key" ON "OrgInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "OrgInvite_email_status_idx" ON "OrgInvite"("email", "status");

-- CreateIndex
CREATE INDEX "ScheduledPublish_status_scheduledFor_idx" ON "ScheduledPublish"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledPublish_kyteId_status_idx" ON "ScheduledPublish"("kyteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PreviewLink_tokenHash_key" ON "PreviewLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PreviewLink_kyteId_idx" ON "PreviewLink"("kyteId");

-- CreateIndex
CREATE INDEX "AuditLog_orgId_createdAt_idx" ON "AuditLog"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_kyteId_createdAt_idx" ON "AuditLog"("kyteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_key_key" ON "Asset"("key");

-- CreateIndex
CREATE INDEX "Asset_kyteId_idx" ON "Asset"("kyteId");

-- CreateIndex
CREATE INDEX "Domain_kyteId_idx" ON "Domain"("kyteId");

-- CreateIndex
CREATE INDEX "ModerationReview_kyteId_createdAt_idx" ON "ModerationReview"("kyteId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationReview_verdict_createdAt_idx" ON "ModerationReview"("verdict", "createdAt");

-- CreateIndex
CREATE INDEX "AbuseReport_status_createdAt_idx" ON "AbuseReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAlert_resolvedAt_createdAt_idx" ON "AdminAlert"("resolvedAt", "createdAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "Passkey"("userId");

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KyteMember" ADD CONSTRAINT "KyteMember_orgId_userId_fkey" FOREIGN KEY ("orgId", "userId") REFERENCES "OrgMember"("orgId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kyte" ADD CONSTRAINT "Kyte_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedKyte" ADD CONSTRAINT "PublishedKyte_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "Kyte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgInvite" ADD CONSTRAINT "OrgInvite_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPublish" ADD CONSTRAINT "ScheduledPublish_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "Kyte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreviewLink" ADD CONSTRAINT "PreviewLink_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "Kyte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "Kyte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "Kyte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

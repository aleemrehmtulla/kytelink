-- CreateEnum
CREATE TYPE "Device" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Domains" (
    "domain" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Domains_pkey" PRIMARY KEY ("domain")
);

-- CreateTable
CREATE TABLE "HitPage" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "ip" TEXT,
    "device" "Device",

    CONSTRAINT "HitPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HitLink" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "ip" TEXT,
    "device" "Device",
    "linkTitle" TEXT,
    "linkURL" TEXT,

    CONSTRAINT "HitLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KyteDraft" (
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" TEXT,
    "name" TEXT,
    "description" TEXT,
    "pfp" TEXT,
    "theme" TEXT,
    "customFont" TEXT,
    "customColor" TEXT,
    "links" JSONB,
    "icons" JSONB,
    "vcf" JSONB,
    "redirectLink" TEXT,
    "shouldRedirect" BOOLEAN DEFAULT false,
    "blurpfp" TEXT,

    CONSTRAINT "KyteDraft_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "KyteProd" (
    "userId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "username" TEXT,
    "name" TEXT,
    "description" TEXT,
    "pfp" TEXT,
    "theme" TEXT,
    "customFont" TEXT,
    "customColor" TEXT,
    "links" JSONB,
    "icons" JSONB,
    "vcf" JSONB,
    "redirectLink" TEXT,
    "shouldRedirect" BOOLEAN DEFAULT false,
    "blurpfp" TEXT,

    CONSTRAINT "KyteProd_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "legacy" BOOLEAN DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Domains_domain_key" ON "Domains"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "KyteDraft_userId_key" ON "KyteDraft"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KyteDraft_email_key" ON "KyteDraft"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KyteDraft_username_key" ON "KyteDraft"("username");

-- CreateIndex
CREATE UNIQUE INDEX "KyteProd_email_key" ON "KyteProd"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KyteProd_username_key" ON "KyteProd"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Domains" ADD CONSTRAINT "Domains_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HitPage" ADD CONSTRAINT "HitPage_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "KyteProd"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HitLink" ADD CONSTRAINT "HitLink_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "KyteProd"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KyteDraft" ADD CONSTRAINT "KyteDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KyteProd" ADD CONSTRAINT "KyteProd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

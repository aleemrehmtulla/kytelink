/*
  Warnings:

  - You are about to drop the column `domains` on the `KyteDraft` table. All the data in the column will be lost.
  - You are about to drop the column `domains` on the `KyteProd` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "KyteDraft" DROP COLUMN "domains";

-- AlterTable
ALTER TABLE "KyteProd" DROP COLUMN "domains";

-- CreateTable
CREATE TABLE "Domains" (
    "domain" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Domains_pkey" PRIMARY KEY ("domain")
);

-- CreateTable
CREATE TABLE "KyteHit" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "ip" TEXT,
    "device" TEXT,

    CONSTRAINT "KyteHit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkHit" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "ip" TEXT,
    "device" TEXT,
    "link" TEXT,

    CONSTRAINT "LinkHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Domains_domain_key" ON "Domains"("domain");

-- AddForeignKey
ALTER TABLE "Domains" ADD CONSTRAINT "Domains_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KyteHit" ADD CONSTRAINT "KyteHit_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "KyteProd"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkHit" ADD CONSTRAINT "LinkHit_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "KyteProd"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

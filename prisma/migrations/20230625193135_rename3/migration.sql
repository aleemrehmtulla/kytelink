/*
  Warnings:

  - You are about to drop the `KyteView` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KyteViewLink` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "KyteView" DROP CONSTRAINT "KyteView_kyteId_fkey";

-- DropForeignKey
ALTER TABLE "KyteViewLink" DROP CONSTRAINT "KyteViewLink_kyteId_fkey";

-- DropTable
DROP TABLE "KyteView";

-- DropTable
DROP TABLE "KyteViewLink";

-- CreateTable
CREATE TABLE "HitLink" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "ip" TEXT,
    "device" TEXT,

    CONSTRAINT "HitLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HitPage" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "ip" TEXT,
    "device" TEXT,
    "link" TEXT,

    CONSTRAINT "HitPage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HitLink" ADD CONSTRAINT "HitLink_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "KyteProd"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HitPage" ADD CONSTRAINT "HitPage_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "KyteProd"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the `LinkHit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "LinkHit" DROP CONSTRAINT "LinkHit_kyteId_fkey";

-- DropTable
DROP TABLE "LinkHit";

-- CreateTable
CREATE TABLE "KyteViewLink" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "ip" TEXT,
    "device" TEXT,
    "link" TEXT,

    CONSTRAINT "KyteViewLink_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "KyteViewLink" ADD CONSTRAINT "KyteViewLink_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "KyteProd"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

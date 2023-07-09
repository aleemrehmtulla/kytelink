/*
  Warnings:

  - You are about to drop the `KyteHit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "KyteHit" DROP CONSTRAINT "KyteHit_kyteId_fkey";

-- DropTable
DROP TABLE "KyteHit";

-- CreateTable
CREATE TABLE "KyteView" (
    "id" TEXT NOT NULL,
    "kyteId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "country" TEXT,
    "ip" TEXT,
    "device" TEXT,

    CONSTRAINT "KyteView_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "KyteView" ADD CONSTRAINT "KyteView_kyteId_fkey" FOREIGN KEY ("kyteId") REFERENCES "KyteProd"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

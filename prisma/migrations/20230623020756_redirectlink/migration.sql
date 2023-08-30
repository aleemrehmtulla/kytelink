/*
  Warnings:

  - You are about to drop the column `redirect` on the `KyteDraft` table. All the data in the column will be lost.
  - You are about to drop the column `redirect` on the `KyteProd` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `KyteDraft` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "KyteDraft" DROP COLUMN "redirect",
ADD COLUMN     "redirectLink" TEXT,
ADD COLUMN     "shouldRedirect" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "KyteProd" DROP COLUMN "redirect",
ADD COLUMN     "redirectLink" TEXT,
ADD COLUMN     "shouldRedirect" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "KyteDraft_userId_key" ON "KyteDraft"("userId");

/*
  Warnings:

  - You are about to drop the column `link` on the `HitPage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "HitLink" ADD COLUMN     "link" TEXT;

-- AlterTable
ALTER TABLE "HitPage" DROP COLUMN "link";

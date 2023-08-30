/*
  Warnings:

  - You are about to drop the column `link` on the `HitLink` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "HitLink" DROP COLUMN "link",
ADD COLUMN     "linkTitle" TEXT,
ADD COLUMN     "linkURL" TEXT;

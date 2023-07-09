/*
  Warnings:

  - The `device` column on the `HitLink` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `device` column on the `HitPage` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Device" AS ENUM ('MOBILE', 'TABLET', 'DESKTOP', 'UNKNOWN');

-- AlterTable
ALTER TABLE "HitLink" DROP COLUMN "device",
ADD COLUMN     "device" "Device";

-- AlterTable
ALTER TABLE "HitPage" DROP COLUMN "device",
ADD COLUMN     "device" "Device";

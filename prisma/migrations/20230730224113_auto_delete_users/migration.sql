-- DropForeignKey
ALTER TABLE "Domains" DROP CONSTRAINT "Domains_userId_fkey";

-- DropForeignKey
ALTER TABLE "HitLink" DROP CONSTRAINT "HitLink_kyteId_fkey";

-- DropForeignKey
ALTER TABLE "HitPage" DROP CONSTRAINT "HitPage_kyteId_fkey";

-- DropForeignKey
ALTER TABLE "KyteDraft" DROP CONSTRAINT "KyteDraft_userId_fkey";

-- DropForeignKey
ALTER TABLE "KyteProd" DROP CONSTRAINT "KyteProd_userId_fkey";

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

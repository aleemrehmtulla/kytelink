-- Platform-level account standing (distinct from a kyte's ModerationStatus).
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

ALTER TABLE "User"
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "statusReason" TEXT,
  ADD COLUMN "statusChangedAt" TIMESTAMP(3),
  ADD COLUMN "statusChangedBy" TEXT;

CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- Admin audit rows can be platform-scoped (a user ban belongs to no single org),
-- so orgId becomes nullable and the FK switches to SET NULL-safe optional.
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_orgId_fkey";
ALTER TABLE "AuditLog" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Storage screens sort assets by size and filter by kind.
CREATE INDEX "Asset_sizeBytes_idx" ON "Asset"("sizeBytes");
CREATE INDEX "Asset_kind_createdAt_idx" ON "Asset"("kind", "createdAt");

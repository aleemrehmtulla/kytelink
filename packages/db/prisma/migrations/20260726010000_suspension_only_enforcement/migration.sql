-- There is no "ban" any more: suspension is the only enforcement state, at three
-- scopes (kyte, organization, user). Existing BANNED rows collapse to SUSPENDED.

ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus"
  USING (CASE WHEN "status" = 'BANNED' THEN 'SUSPENDED' ELSE "status"::text END)::"UserStatus";
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
DROP TYPE "UserStatus_old";

ALTER TYPE "ModerationStatus" RENAME TO "ModerationStatus_old";
CREATE TYPE "ModerationStatus" AS ENUM ('APPROVED', 'SUSPENDED');
ALTER TABLE "PublishedKyte" ALTER COLUMN "moderationStatus" DROP DEFAULT;
ALTER TABLE "PublishedKyte" ALTER COLUMN "moderationStatus" TYPE "ModerationStatus"
  USING (CASE WHEN "moderationStatus" = 'BANNED' THEN 'SUSPENDED' ELSE "moderationStatus"::text END)::"ModerationStatus";
ALTER TABLE "PublishedKyte" ALTER COLUMN "moderationStatus" SET DEFAULT 'APPROVED';
DROP TYPE "ModerationStatus_old";

-- Org-scoped suspension. suspensionCause is null for a direct admin action and
-- `user_<userId>` when it cascaded from that user's suspension; only that user's
-- restore clears a cause-matched org, so a direct suspension survives it.
ALTER TABLE "Organization"
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspensionReason" TEXT,
  ADD COLUMN "suspendedBy" TEXT,
  ADD COLUMN "suspensionCause" TEXT;

CREATE TYPE "AppealKind" AS ENUM ('kyte', 'org', 'user');
CREATE TYPE "AppealStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL,
    "kind" "AppealKind" NOT NULL,
    "handle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'OPEN',
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Appeal_status_createdAt_idx" ON "Appeal"("status", "createdAt");
CREATE INDEX "Appeal_kind_createdAt_idx" ON "Appeal"("kind", "createdAt");
CREATE INDEX "Appeal_handle_idx" ON "Appeal"("handle");

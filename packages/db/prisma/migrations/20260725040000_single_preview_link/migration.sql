-- One preview link per kyte, with owner-readable secrets. Existing rows carry
-- only hashes (unrecoverable), so they are dropped rather than migrated: the
-- editor re-issues a link on the next visit.
DELETE FROM "PreviewLink";

ALTER TABLE "PreviewLink" DROP COLUMN "tokenHash";
ALTER TABLE "PreviewLink" DROP COLUMN "passcodeHash";
ALTER TABLE "PreviewLink" DROP COLUMN "revokedAt";
ALTER TABLE "PreviewLink" ADD COLUMN "token" TEXT NOT NULL;
ALTER TABLE "PreviewLink" ADD COLUMN "passcode" TEXT NOT NULL;

DROP INDEX IF EXISTS "PreviewLink_kyteId_idx";
CREATE UNIQUE INDEX "PreviewLink_kyteId_key" ON "PreviewLink"("kyteId");
CREATE UNIQUE INDEX "PreviewLink_token_key" ON "PreviewLink"("token");

-- The per-kyte preview-link cap is gone with the multi-link model.
ALTER TABLE "Organization" DROP COLUMN "maxPreviewLinks";

-- Per-org upload size cap. Without this column `setOrgLimits` had nowhere to
-- store uploadMaxBytes, so the admin UI offered a control that silently did
-- nothing and the upload path always used the platform default.
ALTER TABLE "Organization" ADD COLUMN "maxUploadBytes" BIGINT;

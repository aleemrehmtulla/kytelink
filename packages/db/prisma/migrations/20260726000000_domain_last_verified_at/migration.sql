-- Powers the domain reaper's grace window: the provider's last "connected"
-- observation, falling back to createdAt for domains never seen connected.
ALTER TABLE "Domain" ADD COLUMN "lastVerifiedAt" TIMESTAMP(3);

-- Domains already marked verified were serving before this column existed;
-- seed their clock from createdAt so the reaper does not treat them as new.
UPDATE "Domain" SET "lastVerifiedAt" = "createdAt" WHERE "verified" = true;

ALTER TABLE "PublishedKyte" ADD COLUMN "directoryPriority" BOOLEAN NOT NULL DEFAULT false;

UPDATE "PublishedKyte"
SET "directoryPriority" = ("avatarAssetId" IS NOT NULL AND jsonb_array_length("links"::jsonb) >= 2);

CREATE INDEX "PublishedKyte_directoryPriority_username_idx" ON "PublishedKyte"("directoryPriority", "username");

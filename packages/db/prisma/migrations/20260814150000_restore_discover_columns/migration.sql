-- Incident fix: 20260814140000 dropped these while the deployed code still
-- selected them, 404ing every profile. Re-add them (defaults only — the old
-- values are gone) until a build that stops referencing them is live; only
-- then may a future migration drop them again.
ALTER TABLE "Kyte" ADD COLUMN "hideFromDiscover" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PublishedKyte" ADD COLUMN "hideFromDiscover" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PublishedKyte" ADD COLUMN "directoryPriority" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "PublishedKyte_directoryPriority_username_idx" ON "PublishedKyte"("directoryPriority", "username");

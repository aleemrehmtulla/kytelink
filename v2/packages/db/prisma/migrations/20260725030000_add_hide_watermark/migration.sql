-- Opt-out of the "made with kytelink" watermark on the public profile.
ALTER TABLE "Kyte" ADD COLUMN "hideWatermark" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PublishedKyte" ADD COLUMN "hideWatermark" BOOLEAN NOT NULL DEFAULT false;

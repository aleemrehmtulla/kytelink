-- The /discover directory is gone; SEO relies on the sitemap alone. Deploy the
-- code that stops referencing these columns before applying this migration.
DROP INDEX "PublishedKyte_directoryPriority_username_idx";
ALTER TABLE "Kyte" DROP COLUMN "hideFromDiscover";
ALTER TABLE "PublishedKyte" DROP COLUMN "directoryPriority";
ALTER TABLE "PublishedKyte" DROP COLUMN "hideFromDiscover";

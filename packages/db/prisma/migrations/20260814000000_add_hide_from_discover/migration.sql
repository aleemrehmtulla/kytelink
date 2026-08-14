-- Per-kyte opt-out of the /discover directory and the sitemap. The profile page
-- itself stays public; only the listings drop it.
ALTER TABLE "Kyte" ADD COLUMN "hideFromDiscover" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PublishedKyte" ADD COLUMN "hideFromDiscover" BOOLEAN NOT NULL DEFAULT false;

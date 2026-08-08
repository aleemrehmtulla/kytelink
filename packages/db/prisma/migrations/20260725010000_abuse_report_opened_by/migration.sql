-- Admin-opened moderation cases are real AbuseReport rows, but they have no
-- reporter IP. Recording the opening admin in its own column keeps ipHash
-- honest (a real hash or nothing) and preserves who opened the case, which
-- reviewedBy cannot express because it describes the resolution.
ALTER TABLE "AbuseReport" ADD COLUMN "openedBy" TEXT;

-- The reports and suspended screens count reports per username and resolve a
-- report's target kyte by id; both were sequential scans.
CREATE INDEX "AbuseReport_username_idx" ON "AbuseReport"("username");
CREATE INDEX "AbuseReport_kyteId_idx" ON "AbuseReport"("kyteId");

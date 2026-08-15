-- Until now the API never wrote avatarAssetId: uploads created the Asset row but
-- left the column null, so v2-era avatars vanished from public pages. Link each
-- kyte to its most recent avatar upload, mirror onto the published row, and
-- recompute the directory ordering flag.
UPDATE "Kyte" k
SET "avatarAssetId" = latest.id
FROM (
  SELECT DISTINCT ON ("kyteId") id, "kyteId"
  FROM "Asset"
  WHERE kind = 'AVATAR'
  ORDER BY "kyteId", "createdAt" DESC
) latest
WHERE latest."kyteId" = k.id AND k."avatarAssetId" IS NULL;

UPDATE "PublishedKyte" p
SET "avatarAssetId" = k."avatarAssetId"
FROM "Kyte" k
WHERE k.id = p."kyteId" AND p."avatarAssetId" IS NULL AND k."avatarAssetId" IS NOT NULL;

UPDATE "PublishedKyte"
SET "directoryPriority" = ("avatarAssetId" IS NOT NULL AND jsonb_array_length("links"::jsonb) >= 2);

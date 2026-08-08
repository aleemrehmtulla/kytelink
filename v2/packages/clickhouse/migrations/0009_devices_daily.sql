CREATE TABLE IF NOT EXISTS devices_daily (
  kyte_id String,
  device Enum8('UNKNOWN' = 0, 'MOBILE' = 1, 'TABLET' = 2, 'DESKTOP' = 3),
  date Date,
  views UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (kyte_id, device, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS devices_daily_mv TO devices_daily AS
SELECT
  kyte_id,
  device,
  toDate(ts) AS date,
  count() AS views
FROM page_hits
WHERE is_bot = 0
GROUP BY kyte_id, device, date

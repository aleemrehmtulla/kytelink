CREATE TABLE IF NOT EXISTS link_hits_daily (
  kyte_id String,
  link_url String,
  link_title String,
  date Date,
  clicks UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (kyte_id, link_url, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS link_hits_daily_mv TO link_hits_daily AS
SELECT
  kyte_id,
  link_url,
  any(link_title) AS link_title,
  toDate(ts) AS date,
  count() AS clicks
FROM link_hits
WHERE is_bot = 0
GROUP BY kyte_id, link_url, date

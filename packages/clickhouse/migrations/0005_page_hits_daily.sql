CREATE TABLE IF NOT EXISTS page_hits_daily (
  kyte_id String,
  date Date,
  views UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (kyte_id, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS page_hits_daily_mv TO page_hits_daily AS
SELECT
  kyte_id,
  toDate(ts) AS date,
  count() AS views
FROM page_hits
WHERE is_bot = 0
GROUP BY kyte_id, date

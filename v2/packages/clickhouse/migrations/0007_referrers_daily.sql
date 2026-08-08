CREATE TABLE IF NOT EXISTS referrers_daily (
  kyte_id String,
  ref_domain LowCardinality(String),
  date Date,
  views UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (kyte_id, ref_domain, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS referrers_daily_mv TO referrers_daily AS
SELECT
  kyte_id,
  ref_domain,
  toDate(ts) AS date,
  count() AS views
FROM page_hits
WHERE is_bot = 0
GROUP BY kyte_id, ref_domain, date

CREATE TABLE IF NOT EXISTS countries_daily (
  kyte_id String,
  country LowCardinality(FixedString(2)),
  date Date,
  views UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (kyte_id, country, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS countries_daily_mv TO countries_daily AS
SELECT
  kyte_id,
  country,
  toDate(ts) AS date,
  count() AS views
FROM page_hits
WHERE is_bot = 0
GROUP BY kyte_id, country, date

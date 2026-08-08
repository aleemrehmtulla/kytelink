CREATE TABLE IF NOT EXISTS platform_daily (
  date Date,
  views UInt64,
  clicks UInt64,
  uniq_kytes AggregateFunction(uniq, String)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (date);

CREATE MATERIALIZED VIEW IF NOT EXISTS platform_daily_views_mv TO platform_daily AS
SELECT
  toDate(ts) AS date,
  count() AS views,
  toUInt64(0) AS clicks,
  uniqState(kyte_id) AS uniq_kytes
FROM page_hits
WHERE is_bot = 0
GROUP BY date;

CREATE MATERIALIZED VIEW IF NOT EXISTS platform_daily_clicks_mv TO platform_daily AS
SELECT
  toDate(ts) AS date,
  toUInt64(0) AS views,
  count() AS clicks,
  uniqState(kyte_id) AS uniq_kytes
FROM link_hits
WHERE is_bot = 0
GROUP BY date

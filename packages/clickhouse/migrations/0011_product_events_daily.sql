CREATE TABLE IF NOT EXISTS product_events_daily (
  date Date,
  event LowCardinality(String),
  events UInt64,
  uniq_users AggregateFunction(uniqExact, String)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(date)
ORDER BY (event, date);

CREATE MATERIALIZED VIEW IF NOT EXISTS product_events_daily_mv TO product_events_daily AS
SELECT
  toDate(ts) AS date,
  event,
  count() AS events,
  uniqExactStateIf(user_id, user_id != '') AS uniq_users
FROM product_events
GROUP BY date, event

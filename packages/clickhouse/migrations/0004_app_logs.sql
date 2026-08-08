CREATE TABLE IF NOT EXISTS app_logs (
  ts DateTime64(3),
  level LowCardinality(String),
  service LowCardinality(String),
  msg String,
  request_id String,
  meta String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (service, ts)
TTL toDateTime(ts) + INTERVAL 90 DAY

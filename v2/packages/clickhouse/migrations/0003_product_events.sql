CREATE TABLE IF NOT EXISTS product_events (
  ts DateTime64(3),
  event LowCardinality(String),
  user_id String,
  kyte_id String,
  anonymous_id String,
  properties String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (event, ts)

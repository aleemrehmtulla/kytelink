CREATE TABLE IF NOT EXISTS page_hits (
  ts DateTime64(3),
  kyte_id String,
  username LowCardinality(String),
  referrer String,
  ref_domain LowCardinality(String),
  country LowCardinality(FixedString(2)),
  device Enum8('UNKNOWN' = 0, 'MOBILE' = 1, 'TABLET' = 2, 'DESKTOP' = 3),
  ip_hash String,
  is_bot UInt8
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (kyte_id, ts)

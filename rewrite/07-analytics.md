# 07 — Analytics: ClickHouse

*Read this if: you're building the analytics stream, the editor analytics tab, or admin. Companion: [06-api.md](06-api.md) (beacon routes, rate limits).*

Postgres never sees an analytics event. PostHog is deleted; `grep -ri posthog` on the finished repo must return nothing.

**Analytics is an optional capability** ([25-selfhost.md](25-selfhost.md)): with no `CLICKHOUSE_URL`, the API boots with one warning, beacon endpoints still 202 (and drop), the editor has no Analytics tab, and admin analytics views show a calm "analytics is off" card. Everything in this doc assumes the capability is on.

**Two kinds of analytics, kept fully separate (founder-confirmed):** **Kytelink analytics** — the user-facing numbers about a kyte (`page_hits`, `link_hits`; what the editor's Analytics tab shows its owner). **Internal analytics** — our own product telemetry (`product_events`: landing conversions, onboarding funnel, feature usage) plus shipped server logs (`app_logs`); admin/founder-only, never surfaced in user-facing UI. Name code accordingly (`internal-analytics` modules vs kyte analytics) so the two never blur.

## DDL (`packages/clickhouse/migrations/`, tiny sequential runner)

```sql
CREATE TABLE page_hits (
  ts DateTime64(3),
  kyte_id String, username LowCardinality(String),
  referrer String, ref_domain LowCardinality(String),
  country LowCardinality(FixedString(2)),      -- CDN geo header, finally populated
  device Enum8('MOBILE'=1,'TABLET'=2,'DESKTOP'=3,'UNKNOWN'=0),
  ip_hash String,                              -- sha256(ip + daily rotating salt); raw IP never stored
  is_bot UInt8                                 -- excluded from user-facing counts
) ENGINE = MergeTree PARTITION BY toYYYYMM(ts) ORDER BY (kyte_id, ts);

CREATE TABLE link_hits (/* same + link_url String, link_title String */)
  ENGINE = MergeTree PARTITION BY toYYYYMM(ts) ORDER BY (kyte_id, ts);

CREATE TABLE product_events (                  -- first-party PostHog replacement
  ts DateTime64(3), event LowCardinality(String),
  user_id String, kyte_id String,              -- kyte_id empty for account-level events
  anonymous_id String, properties String       -- JSON
) ENGINE = MergeTree PARTITION BY toYYYYMM(ts) ORDER BY (event, ts);

CREATE TABLE app_logs (                        -- internal: pino log shipping (06-api.md)
  ts DateTime64(3), level LowCardinality(String), service LowCardinality(String),
  msg String, request_id String, meta String   -- JSON
) ENGINE = MergeTree PARTITION BY toYYYYMM(ts) ORDER BY (service, ts)
  TTL toDateTime(ts) + INTERVAL 90 DAY;

-- SummingMergeTree materialized views so user/admin queries never scan raw events:
-- page_hits_daily(kyte_id, date, views) · link_hits_daily(kyte_id, link_url, date, clicks)
-- referrers_daily · countries_daily · devices_daily
-- platform_daily(date, views, clicks, uniq_kytes) for admin
```

## Ingestion path

Beacon → zod parse → enrich **server-side**: device from UA (clients stop sending it — also kills the legacy `device`/`deviceType` key mismatch), country from `cf-ipcountry`/`x-vercel-ip-country`, ref_domain normalization, bot flag from UA list → validate the claimed `username↔kyte_id` pair against a Redis set refreshed on publish (kills spoofed ids) — **on a set miss, fall back to ONE Postgres lookup and cache the answer back into the set (hit or tombstone), so a flushed/restarted Redis degrades to a few DB lookups instead of silently dropping every profile's analytics until republish** → rate limit → **CH async insert** (`async_insert=1, wait_for_async_insert=0`). CH briefly down → push to a Redis list buffer; a worker drains it. Beacons never 5xx and never block.

## Client beacons

- Page view: fired on profile mount via `navigator.sendBeacon('/t/page', …)` — username/kyte_id baked into the static page props.
- Link/icon click: fire-and-forget before `window.open`; never awaited, never delays navigation.
- No cookies, no localStorage, no consent-triggering identifiers; `ip_hash` with a rotating daily salt keeps uniques approximate and privacy-clean.
- The landing app fires **internal-analytics events only** (`hit_landing`, `clicked_get_started`) via `/t/event` — fire-and-forget, one of the few JS behaviors on the marketing site ([12-landing.md](12-landing.md)). It never fires page/link hits.

## Queries

Editor tab (EDITOR+ — VIEWER is the no-analytics role, [04-organizations.md](04-organizations.md)): total views, cumulative 30-day time series, per-link clicks, top-5 referrers, device split, country split — rollups only, ≤90-day windows, `kyte_id` resolved from the membership check, never from raw input. Redis-cached 60s.

Admin queries ([13-admin.md](13-admin.md)): platform daily series, top kytes, funnel joins against Postgres — all against MVs.

## Product events (internal analytics)

Taxonomy (port of the old PostHog enum + new flows): `signup_completed, login, onboarding_step_{1..4}, onboarding_skipped_links, signup_to_live_ms, kyte_created, profile_published, publish_scheduled, link_added, links_imported, avatar_updated, username_updated, invite_sent, invite_accepted, kyte_transferred, limit_hit, watermark_click, hit_landing, hit_auth, hit_edit, clicked_get_started`. Sent via `/t/event` with typed payloads from `packages/schemas`. These power the admin funnel; keep the event list in one exported constant.

Growth attribution: `watermark_click` fires from the profile page (`sendBeacon`, the watermark links `kytelink.com/?ref={username}` — [01-parity.md](01-parity.md)); the landing captures `?ref` into a 24h first-party cookie ([12-landing.md](12-landing.md)); `signup_completed` carries a `ref` property when that cookie is present; `links_imported` carries `{source, count}`. The admin funnel shows watermark-attributed signups as a % ([13-admin.md](13-admin.md)).

## No history

Founder-confirmed: legacy `HitPage`/`HitLink` data is **wiped, not migrated** — ClickHouse starts empty at launch and every count begins fresh. (`kyte_id` still equals the old `userId` by seed construction, purely for R2-prefix continuity.)

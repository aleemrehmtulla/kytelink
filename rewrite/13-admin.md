# 13 — apps/admin: admin.kytelink.com

*Read this if: you're building the admin app. Companion: [06-api.md](06-api.md) (`trpc.admin`), [07-analytics.md](07-analytics.md), [10-moderation.md](10-moderation.md), [14-design.md](14-design.md).*

Founder-only. Auth: the shared better-auth cookie on `.kytelink.com` + `role===ADMIN`, enforced **on every `admin.*` tRPC procedure** (the UI gate is UX, not security). ADMIN assigned from `ADMIN_EMAILS` at login. Entire app `noindex` + robots-disallowed.

**Quality bar: this app is the founder's daily driver — it must be genuinely nice, not an afterthought.** Same design system, tokens, and motion vocabulary as the product ([14-design.md](14-design.md)); dense but calm layouts; every number formatted and sparklined where a trend matters. Three interaction principles:

1. **⌘K global search** from anywhere → users, orgs, kytes by email/username/name → jump straight to the detail view.
2. **Actions where you are:** suspend/unsuspend, ban, **manual flag** (send any kyte to the moderation queue with a note), force re-review, and raise-limit are one click from any row or detail header — no hunting for the right page.
3. **Top users always one click away:** the Overview links straight to ranked views (top by traffic, by storage, by team size) and the Traffic view defaults to "top kytes this week."

## Views

1. **Live** (real-time observability, the landing view) — people on the site **right now** (distinct `ip_hash` across page_hits in the last 5 min), views/min and clicks/min sparklines (last 60 min), signups today, publishes today, active editors (presence heartbeats). Auto-refreshing (5–10s polling against dedicated CH queries; SSE optional later). Feels alive — subtle count-up animations (framer-motion), no refresh button needed.
2. **Overview** — total users, total orgs, total kytes, published kytes, signups/day (30/90d), owner DAU/WAU/MAU (product events), platform views+**total link clicks**/day (CH), users/week trend, beacon ingest lag, queue depths/dead-letters, and a **capabilities strip** (which optional services are on/off per [25-selfhost.md](25-selfhost.md)); analytics-backed views show a calm "analytics is off" card when that capability is disabled.
3. **Funnel** — signup → kyte created → onboarded (username) → published → first view → first click; % per stage; weekly cohorts; signup→live time distribution ([22-onboarding.md](22-onboarding.md) events); **watermark attribution — the % of signups carrying the `ref` property ([07-analytics.md](07-analytics.md)) — the viral-loop number, front and center**; import usage (`links_imported` by source).
4. **Users** — search by email/username; detail: org memberships + effective roles, passkeys count, sessions, invites sent/received, storage across owned orgs, **per-user limit editor** (maxOwnedOrgs/maxJoinedOrgs — [04-organizations.md](04-organizations.md)); actions: ban user, force logout.
5. **Orgs & kytes** — search; org detail: members, kytes, **limit editor** (override maxKytes/maxMembers/maxSchedulesPerKyte/maxPreviewLinks/maxStorageBytes — the "Aleem raises your limit" flow, [04-organizations.md](04-organizations.md)); kyte detail: content snapshot, members, publish history (incl. schedules), moderation history, storage, assets, traffic sparkline; actions: suspend/unsuspend, ban/unban, force re-review, delete asset.
6. **Suspended & moderation** — the founder's daily spam-control surface, built to be fast: a **table of every suspended account** with instant free-text search (username, display name, email, link URLs) and **signal filters** straight from `ModerationReview.signals` — sus links · sus names · sus redirect targets · sus email domains · NSFW ([10-moderation.md](10-moderation.md)) — plus category/source (auto vs seed-sweep vs manual flag)/date. Each row: content snapshot, tripped signals with evidence (the matched keyword, the offending URL), model reason or flag note, confidence; one-click approve (unsuspend + un-quarantine images + revalidate — [08-media.md](08-media.md)) / uphold / ban, bulk-select for waves of identical spam. The queue of recent auto-verdicts and manually flagged entries lives in the same view under a tab, alongside a **Reports** tab: open `AbuseReport` rows from the landing `/report` form shown as **requests to suspend** — submitted username/URL, reason, details, per-kyte report count; one click to open the kyte and suspend / ban / dismiss ([10-moderation.md](10-moderation.md)). Suspended users are always told how to appeal — shell page and email both say **"Think this is a mistake? DM @aleemrehmtulla on X with your username."**
7. **Audit** — the global `AuditLog` stream, filterable by org/kyte/actor/action ([04-organizations.md](04-organizations.md)).
8. **Teams & invites** — invite volume per user/day (spam detection), acceptance rates, biggest teams.
9. **Storage** — top kytes/orgs by bytes, bucket totals, orphaned-asset report.
10. **Traffic** — top kytes by views (24h/7d/30d), platform referrer/country/device breakdowns.
11. **Alerts** — unresolved `AdminAlert` rows (revalidate dead-letters, moderation fail-opens, failed schedules, worker/seed anomalies) with one-click resolve; an unresolved-count badge in the app shell from anywhere. **Founder-confirmed: alerts exist only here — the platform never emails the admin.** A Logs tab gives a minimal `app_logs` explorer (level/service/time/search) when the analytics capability is on ([07-analytics.md](07-analytics.md)).

Out of scope v1: feature flags, billing, support ticketing.

Founder acceptance test: "how many users, what's conversion, who's biggest, who's suspended, who uses the most storage" — each answerable in ≤4 clicks.

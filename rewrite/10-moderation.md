# 10 — AI moderation

*Read this if: you're building the moderation stream, admin queue, or publish pipeline. Companion: [06-api.md](06-api.md), [13-admin.md](13-admin.md).*

## Trigger & caching

Every publish — manual AND scheduled ([04-organizations.md](04-organizations.md)) — plus admin force-re-review. `contentHash` = sha256(username, displayName, description, link titles+urls, icon urls, avatar asset id, redirect url). Unchanged hash with an existing verdict → skip (free). Reviewing **every** publish closes the publish-clean-then-edit-into-phishing hole; hash caching keeps it cheap. Two hard rules: (1) verdicts carry the `publishSeq` they reviewed and **no-op if a newer publish exists** (ordering guard, [04-organizations.md](04-organizations.md)); (2) SUSPENDED/BANNED kytes reject publishes entirely (read-only lockdown, below) — a suspension lifts **only** via admin approve in the queue ([13-admin.md](13-admin.md)), never via a user action or a cache hit.

## Provider interface

`MODERATION_PROVIDER=none|openai` (founder-confirmed: OpenAI, not Anthropic).

- `none` (self-host default): auto-approve; the feature is invisible.
- `openai` (hosted): one multimodal call — `OPENAI_API_KEY` + `MODERATION_MODEL` (default a current cost-efficient multimodal mini model, e.g. `gpt-5-mini`; pin the latest at implementation time) receives profile text, all link URLs, the redirect URL, and the avatar image; returns strict JSON `{verdict: APPROVE|SUSPEND, categories[], confidence, reason}` (enforce with structured outputs). `OPENAI_BASE_URL` overrides the endpoint, so self-hosters can point the same provider at any OpenAI-compatible server (local models included).

**Deterministic pre-checks run first and are free:** brand-impersonation keyword list (telcos/banks/delivery/crypto/"support"), IDN/punycode lookalike detection, URL blocklists, shortener→sketchy-TLD chains. A deterministic hit suspends without spending a model call.

## Policy (encode in the prompt)

1. **Phishing/impersonation** — posing as a real company or its support/login/verification/account-recovery flow (observed pattern: telcos & ISPs like Bell and Rogers; also banks, delivery companies, crypto exchanges) → SUSPEND.
2. **NSFW** — 18+/pornographic avatar, text, or obviously adult-targeted link destinations → SUSPEND. (Hosted-instance policy; self-hosters run `none` and may do as they wish.)
3. **Malicious links** — known-bad patterns, lookalike domains → SUSPEND.
4. Ambiguity rule: ordinary profiles, adult-adjacent-but-legal (lingerie brand marketing), and low-confidence cases → **APPROVE and log**. We prefer false-negatives with fast admin recourse over wrongful takedowns.

## Suspend flow

`PublishedKyte.moderationStatus = SUSPENDED` → revalidate → public page shows the suspended shell (`noindex`) **and the kyte enters full read-only lockdown (founder-confirmed):** the editor is replaced by a calm full-screen suspended state for every member — no tabs, no edits, no publishes, no uploads, no new preview links; pending schedules are held ([04-organizations.md](04-organizations.md)); every mutating procedure returns `KYTE_SUSPENDED` ([06-api.md](06-api.md)); the kyte's images are quarantined off the CDN ([08-media.md](08-media.md)). **All data is preserved untouched so an unsuspend restores everything.** Org OWNERs get an email; an admin-queue row appears. **The appeal path is always communicated the same way** — the suspended shell, the editor banner, and the email all say: *"Think this is a mistake? DM @aleemrehmtulla on X with your username."* (one shared copy const, next to the limit-modal contact card). Admin can also **manually flag** any kyte into the queue with a note ([13-admin.md](13-admin.md)). Admin approve → APPROVED + images un-quarantined + revalidate live; uphold → stays; ban → BANNED (harsher shell, parity with the legacy blocked page; same lockdown).

## Abuse reports (landing-footer form — founder-confirmed)

The public report path lives **only in the landing footer**, never on profile pages: `/report` on the landing site ([12-landing.md](12-landing.md)) → `POST /report` on the API (unauthenticated, `report` rate class — [06-api.md](06-api.md)) → `AbuseReport` row ([03-database.md](03-database.md)). Reports never auto-suspend — they surface in the admin moderation view as **requests to suspend** ([13-admin.md](13-admin.md)): admin opens the kyte, then suspends/bans/dismisses. The form's response is always the same neutral "Thanks — we'll take a look" (it never confirms whether a username exists).

## Failure mode

Provider errors: retry ×3 → **APPROVE** with `categories:["review_failed"]` + admin alert (fail-open so a provider outage can't freeze all publishing; flagged rows sit in the admin queue for follow-up). Queue concurrency-capped for cost control.

## Signals (what tripped, stored for admin filtering)

Every review — deterministic or AI — records **which signals fired** in `ModerationReview.signals`: `sus_link` (offending URLs + matched pattern), `sus_name` (username/displayName + matched brand keyword), `sus_redirect` (redirect target), `sus_email` (account email domain), `nsfw_image`, `nsfw_text`. The admin suspended view filters on exactly these ([13-admin.md](13-admin.md)); the AI prompt is instructed to return them alongside the verdict. Calibration stance (founder): **protective but not trigger-happy** — the spam wave is real, so deterministic brand/URL hits suspend confidently; everything ambiguous approves and logs its signals for human review.

## Scope — includes the pre-launch seed sweep

**Every existing profile is reviewed during the seed, before launch** ([18-migration.md](18-migration.md) `04-moderation`): deterministic checks across all seeded kytes, then the AI pass over published content — known spam enters launch day already SUSPENDED with its signals recorded. After launch, the normal every-publish review takes over. Admin force-re-review + a batch CLI hook in `tools/` cover future sweeps.

The suspension experience stays **clean and simple** everywhere it appears: one calm shell page, one banner, one email — same short copy, same single DM-Aleem appeal path, no legalese walls.
